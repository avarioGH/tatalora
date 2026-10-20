import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryValuationEvent } from '../../events/accounting.events';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../../inventory/inventory.service';
import { SequenceService } from '../../reports/sequence.service';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
    private sequenceService: SequenceService,
  ) {}

  /**
   * Recalculates and updates the SalesOrder delivery_status based on authoritative
   * posted (DONE / DELIVERED) deliveries.
   */
  private async recalculateSoDeliveryStatus(tx: any, salesOrderId: string) {
    const so = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: true,
        deliveries: {
          where: { status: { in: ['DONE', 'DELIVERED'] } },
          include: { items: true },
        },
      },
    });

    if (!so) return;

    let allDelivered = true;
    let anyDelivered = false;

    for (const soItem of so.items) {
      let deliveredQty = 0;
      so.deliveries.forEach((d: any) => {
        const di = d.items.find((i: any) => i.product_id === soItem.product_id);
        if (di) deliveredQty += di.delivered_qty;
      });

      if (deliveredQty > 0) anyDelivered = true;
      if (deliveredQty < soItem.qty) allDelivered = false;
    }

    const newDeliveryStatus = allDelivered
      ? 'DELIVERED'
      : anyDelivered
        ? 'PARTIAL'
        : 'PENDING';

    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { delivery_status: newDeliveryStatus },
    });
  }

  /**
   * Create a Delivery draft/record against an eligible Sales Order.
   */
  async create(companyId: string, salesOrderId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Idempotency Key check
      if (data.idempotency_key) {
        const existing = await tx.deliveryOrder.findFirst({
          where: {
            company_id: companyId,
            idempotency_key: data.idempotency_key,
          },
          include: { items: true },
        });
        if (existing) {
          return existing;
        }
      }

      // 2. Concurrency Coordination: Acquire an exclusive row-level lock (FOR UPDATE)
      // on the parent Sales Order before reading deliveries and remaining quantities.
      if (typeof (tx as any).$executeRaw === 'function') {
        await (tx as any).$executeRaw`SELECT 1 FROM "SalesOrder" WHERE id = ${salesOrderId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // Load Sales Order within tenant scope with existing deliveries
      const so = await tx.salesOrder.findFirst({
        where: { id: salesOrderId, company_id: companyId },
        include: {
          items: true,
          deliveries: {
            where: { status: { not: 'CANCELLED' } },
            include: { items: true },
          },
        },
      });
      if (!so) throw new NotFoundException('Sales order not found');

      const itemsToDeliver = data.items;
      if (!Array.isArray(itemsToDeliver) || itemsToDeliver.length === 0) {
        throw new BadRequestException('Delivery must contain at least one item');
      }

      // 3. Compute authoritatively delivered and scheduled quantities
      const deliveredMap: Record<string, number> = {};
      so.deliveries.forEach((d) => {
        d.items.forEach((i) => {
          deliveredMap[i.product_id] =
            (deliveredMap[i.product_id] || 0) + i.delivered_qty;
        });
      });

      const deliveryItems: any[] = [];

      for (const reqItem of itemsToDeliver) {
        const productId = reqItem.productId || reqItem.product_id;
        const qty = Number(reqItem.qty ?? reqItem.quantity ?? 0);

        if (qty <= 0) {
          throw new BadRequestException(
            `Delivery quantity for product ${productId} must be greater than zero`,
          );
        }

        const soItem = so.items.find((i) => i.product_id === productId);
        if (!soItem) {
          throw new BadRequestException(
            `Product ${productId} is not part of Sales Order ${so.order_number}`,
          );
        }

        const alreadyCommitted = deliveredMap[productId] || 0;
        const remaining = soItem.qty - alreadyCommitted;

        if (qty > remaining + 0.0001) {
          throw new BadRequestException(
            `Cannot deliver ${qty} for product ${productId}. Only ${Math.max(
              0,
              remaining,
            )} remaining to be delivered.`,
          );
        }

        deliveryItems.push({
          product_id: productId,
          ordered_qty: soItem.qty,
          delivered_qty: qty,
          remaining_qty: Math.max(0, remaining - qty),
        });
      }

      // 4. Generate delivery number
      const deliveryNumber = await this.sequenceService.generateNumber(
        tx,
        companyId,
        'DELIVERY',
        'DO',
      );

      // 5. Create delivery in WAITING status
      const delivery = await tx.deliveryOrder.create({
        data: {
          company_id: companyId,
          sales_order_id: salesOrderId,
          idempotency_key: data.idempotency_key || null,
          delivery_number: deliveryNumber,
          delivery_date: data.delivery_date
            ? new Date(data.delivery_date)
            : new Date(),
          driver_name: data.driver_name || data.driverName || null,
          vehicle_plate: data.vehicle_plate || data.vehiclePlate || null,
          container_number:
            data.container_number || data.containerNumber || null,
          notes: data.notes || null,
          status: 'WAITING',
          items: {
            create: deliveryItems,
          },
        },
        include: { items: true },
      });

      return delivery;
    });
  }

  /**
   * Validate / Post a Delivery Order. Issues physical stock and records COGS valuation.
   * Concurrency-safe: validates warehouse and order first, then updates status atomically.
   */
  async validate(
    companyId: string,
    deliveryId: string,
    userId: string = '00000000-0000-0000-0000-000000000001',
    warehouseIdParam?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch full delivery and parent Sales Order
      const delivery = await tx.deliveryOrder.findFirst({
        where: { id: deliveryId, company_id: companyId },
        include: {
          items: true,
          sales_order: {
            include: { items: true },
          },
        },
      });

      if (!delivery || !delivery.sales_order) {
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.status === 'DONE' || delivery.status === 'DELIVERED') {
        throw new BadRequestException('Delivery already validated/posted');
      }
      if (delivery.status === 'CANCELLED') {
        throw new BadRequestException('Cannot validate a cancelled delivery');
      }
      if (delivery.status !== 'WAITING') {
        throw new BadRequestException(
          `Delivery cannot be validated in status ${delivery.status}`,
        );
      }

      const so = delivery.sales_order;

      // 1b. Concurrency Coordination: Acquire an exclusive row-level lock (FOR UPDATE)
      // on the parent Sales Order. In PostgreSQL Read-Committed transactions, this forces
      // concurrent transactions attempting to validate or schedule deliveries for the same
      // order to serialize, preventing race conditions on the remaining deliverable capacity.
      if (typeof (tx as any).$executeRaw === 'function') {
        await (tx as any).$executeRaw`SELECT 1 FROM "SalesOrder" WHERE id = ${so.id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // 2. Resolve warehouse strictly without silent fallback to arbitrary company warehouses
      const targetWarehouseId = warehouseIdParam || so.warehouse_id;

      if (!targetWarehouseId) {
        throw new BadRequestException(
          'Target warehouse is not specified on delivery validation or Sales Order',
        );
      }

      const warehouse = await tx.warehouse.findFirst({
        where: { id: targetWarehouseId, company_id: companyId },
      });

      if (!warehouse) {
        throw new BadRequestException(
          `Warehouse ${targetWarehouseId} is invalid or does not belong to company`,
        );
      }

      // 3. Recalculate authoritative remaining quantities for the parent Sales Order
      // inside the transaction to prevent concurrent deliveries from exceeding the order.
      const existingDoneDeliveries = await tx.deliveryOrder.findMany({
        where: {
          sales_order_id: so.id,
          company_id: companyId,
          status: { in: ['DONE', 'DELIVERED'] },
        },
        include: { items: true },
      });

      const alreadyDeliveredMap: Record<string, number> = {};
      for (const d of existingDoneDeliveries) {
        // Exclude current delivery if it were somehow already counted
        if (d.id === deliveryId) continue;
        for (const item of d.items) {
          alreadyDeliveredMap[item.product_id] =
            (alreadyDeliveredMap[item.product_id] || 0) + item.delivered_qty;
        }
      }

      for (const item of delivery.items) {
        const soItem = so.items.find((si: any) => si.product_id === item.product_id);
        if (!soItem) {
          throw new BadRequestException(
            `Product ${item.product_id} is not part of Sales Order ${so.order_number}`,
          );
        }
        const alreadyDelivered = alreadyDeliveredMap[item.product_id] || 0;
        const remainingAllowed = soItem.qty - alreadyDelivered;
        if (item.delivered_qty > remainingAllowed + 0.0001) {
          throw new BadRequestException(
            `Cannot validate delivery: delivery quantity (${item.delivered_qty}) for product ${item.product_id} exceeds remaining Sales Order quantity (${Math.max(0, remainingAllowed)}).`,
          );
        }
      }

      // 4. Concurrency-safe status claim
      const claimResult = await tx.deliveryOrder.updateMany({
        where: {
          id: deliveryId,
          company_id: companyId,
          status: 'WAITING',
        },
        data: { status: 'DONE' },
      });

      if (claimResult.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict or delivery is no longer WAITING',
        );
      }

      // 5. Issue stock via authoritative InventoryService
      let totalDeliveryCogs = 0;

      for (const item of delivery.items) {
        if (item.delivered_qty > 0) {
          const issueRes = await this.inventoryService.issueStock(tx as any, {
            companyId,
            warehouseId: warehouse.id,
            productId: item.product_id,
            quantity: item.delivered_qty,
            referenceType: 'DELIVERY',
            referenceId: delivery.id,
            description: `Delivery ${delivery.delivery_number} for SO ${so.order_number}`,
            userId,
          });
          totalDeliveryCogs += issueRes.consumedCost || 0;
        }
      }

      // 6. Recalculate Sales Order delivery status
      await this.recalculateSoDeliveryStatus(tx, so.id);

      // 7. Emit domain events for downstream integrations
      await this.eventEmitter.emitAsync('delivery.validated', { deliveryId });

      if (totalDeliveryCogs > 0) {
        await this.eventEmitter.emitAsync(
          'inventory.valuation',
          new InventoryValuationEvent(
            companyId,
            deliveryId,
            `VAL-DEL-${deliveryId}`,
            new Date(),
            {
              type: 'COGS',
              totalValue: totalDeliveryCogs,
              description: `COGS for Delivery ${delivery.delivery_number}`,
            },
            tx,
          ),
        );
      }

      return delivery;
    });
  }

  /**
   * Cancel an unposted delivery or reverse a posted delivery with inventory integrity.
   */
  async cancel(
    companyId: string,
    deliveryId: string,
    userId: string = '00000000-0000-0000-0000-000000000001',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.deliveryOrder.findFirst({
        where: { id: deliveryId, company_id: companyId },
        include: {
          items: true,
          sales_order: {
            include: { invoices: true },
          },
        },
      });

      if (!delivery) throw new NotFoundException('Delivery not found');
      if (delivery.status === 'CANCELLED') {
        throw new BadRequestException('Delivery is already cancelled');
      }

      const so = delivery.sales_order;

      // Case 1: Unposted Delivery (WAITING / READY)
      if (delivery.status === 'WAITING' || delivery.status === 'READY') {
        const claimCancel = await tx.deliveryOrder.updateMany({
          where: {
            id: deliveryId,
            company_id: companyId,
            status: { in: ['WAITING', 'READY'] },
          },
          data: { status: 'CANCELLED' },
        });

        if (claimCancel.count === 0) {
          throw new BadRequestException(
            'Concurrency conflict: delivery status changed before cancellation',
          );
        }

        const cancelled = await tx.deliveryOrder.findUnique({
          where: { id: deliveryId },
        });
        await this.recalculateSoDeliveryStatus(tx, so.id);
        return { success: true, status: 'CANCELLED', delivery: cancelled };
      }

      // Case 2: Posted Delivery (DONE / DELIVERED)
      if (delivery.status === 'DONE' || delivery.status === 'DELIVERED') {
        // Guard: Check downstream sales returns
        const returns = await tx.salesReturn.findMany({
          where: {
            company_id: companyId,
            sales_order_id: so.id,
            status: { not: 'CANCELLED' },
          },
        });
        if (returns.length > 0) {
          throw new BadRequestException(
            'Cannot reverse delivery: Sales returns already exist for this Sales Order. Please manage through Sales Return workflow.',
          );
        }

        // Guard: Check downstream invoices
        const activeInvoices = (so.invoices || []).filter(
          (inv: any) => inv.status !== 'CANCELLED' && inv.status !== 'VOID',
        );
        if (activeInvoices.length > 0) {
          throw new BadRequestException(
            'Cannot reverse delivery: Downstream invoices are active for this order. Please cancel or credit the invoices first.',
          );
        }

        // Concurrency-safe claim of posted delivery status before executing reversal
        const claimPosted = await tx.deliveryOrder.updateMany({
          where: {
            id: deliveryId,
            company_id: companyId,
            status: { in: ['DONE', 'DELIVERED'] },
          },
          data: { status: 'CANCELLED' },
        });

        if (claimPosted.count === 0) {
          throw new BadRequestException(
            'Concurrency conflict: delivery is no longer posted or has already been reversed',
          );
        }

        // Identify original stock movements created during delivery
        const movements = await tx.stockMovement.findMany({
          where: {
            company_id: companyId,
            transaction_id: delivery.id,
            transaction_type: 'DELIVERY',
          },
        });

        if (movements.length === 0) {
          throw new BadRequestException(
            'Cannot find stock movements associated with this delivery to reverse.',
          );
        }

        // Reverse stock movements and recover original valuation
        let totalReversalValuation = 0;

        for (const mov of movements) {
          // Look up cost layer consumptions associated with this stock movement
          const consumptions = await tx.costLayerConsumption.findMany({
            where: {
              stock_movement_id: mov.id,
              company_id: companyId,
            },
          });

          // If specific FIFO consumptions exist for this movement, restore each layer
          // at its exact original unit cost and quantity to preserve multi-layer FIFO distribution.
          if (consumptions.length > 0) {
            for (const c of consumptions) {
              const layerCost = Number(c.unit_cost) || 0;
              const layerQty = Number(c.quantity) || 0;
              totalReversalValuation += Number(c.total_cost) || (layerCost * layerQty);

              await this.inventoryService.receiveStock(tx as any, {
                companyId,
                warehouseId: mov.warehouse_id,
                productId: mov.product_id,
                quantity: layerQty,
                unitCost: layerCost,
                referenceType: 'DELIVERY_REVERSAL',
                referenceId: delivery.id,
                description: `Reversal of Delivery ${delivery.delivery_number} (Layer ${c.layer_id || c.id})`,
                userId,
              });
            }
          } else {
            // Fallback if no granular consumption records exist
            await this.inventoryService.receiveStock(tx as any, {
              companyId,
              warehouseId: mov.warehouse_id,
              productId: mov.product_id,
              quantity: mov.qty_out,
              unitCost: 0,
              referenceType: 'DELIVERY_REVERSAL',
              referenceId: delivery.id,
              description: `Reversal of Delivery ${delivery.delivery_number} (Mov ${mov.id})`,
              userId,
            });
          }
        }

        // Recalculate Sales Order delivery status
        await this.recalculateSoDeliveryStatus(tx, so.id);

        // Emit offsetting valuation event (Cr COGS, Dr Inventory Asset)
        if (totalReversalValuation > 0) {
          await this.eventEmitter.emitAsync(
            'inventory.valuation',
            new InventoryValuationEvent(
              companyId,
              deliveryId,
              `VAL-DEL-REV-${deliveryId}`,
              new Date(),
              {
                type: 'SALES_RETURN_COGS', // In AccountingListener: Dr Inventory Asset, Cr COGS
                totalValue: totalReversalValuation,
                description: `Reversal of COGS for Delivery ${delivery.delivery_number}`,
              },
              tx,
            ),
          );
        }

        const reversed = await tx.deliveryOrder.findUnique({
          where: { id: deliveryId },
        });

        return { success: true, status: 'CANCELLED', delivery: reversed };
      }

      throw new BadRequestException(
        `Delivery cannot be cancelled from status ${delivery.status}`,
      );
    });
  }
}
