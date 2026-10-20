import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../../inventory/inventory.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryValuationEvent, InvoicePostedEvent } from '../../events/accounting.events';

@Injectable()
export class SalesReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(companyId: string, data: any, userId: string) {
    const { salesOrderId, reason, notes, items } = data;

    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: { id: salesOrderId, company_id: companyId },
      include: {
        items: true,
      }
    });

    if (!salesOrder) throw new BadRequestException('Sales order not found');

    const deliveries = await this.prisma.deliveryOrder.findMany({
      where: {
        company_id: companyId,
        sales_order_id: salesOrderId,
        status: 'DELIVERED',
      },
      include: { items: true },
    });

    const returnItemsData: any[] = [];
    for (const item of items) {
      const { salesOrderItemId, quantity } = item;
      const soItem = salesOrder.items.find(i => i.id === salesOrderItemId);
      if (!soItem) throw new BadRequestException(`SalesOrderItem ${salesOrderItemId} not found`);

      let totalDelivered = 0;
      for (const d of deliveries) {
        const dItem = d.items.find(di => di.product_id === soItem.product_id);
        if (dItem) {
          totalDelivered += dItem.delivered_qty;
        }
      }

      if (soItem.returned_qty + quantity > totalDelivered) {
        throw new BadRequestException(`Cannot return more than delivered for product ${soItem.product_id}`);
      }

      returnItemsData.push({
        sales_order_item_id: soItem.id,
        product_id: soItem.product_id,
        quantity,
        unit_price: soItem.unit_price,
        total_sales_value: soItem.unit_price * quantity,
        reason: reason,
      });
    }

    const returnNumber = `SR-${Date.now()}`;
    return this.prisma.salesReturn.create({
      data: {
        company_id: companyId,
        return_number: returnNumber,
        sales_order_id: salesOrderId,
        customer_id: salesOrder.customer_id as string,
        warehouse_id: salesOrder.warehouse_id as string,
        return_date: new Date(),
        status: 'DRAFT',
        reason,
        notes,
        created_by: userId,
        items: {
          create: returnItemsData,
        }
      }
    });
  }

  async approve(companyId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sr = await tx.salesReturn.findFirst({
        where: { id, company_id: companyId, status: 'DRAFT' },
        include: { items: true }
      });
      if (!sr) throw new BadRequestException('Sales Return not found or not in DRAFT status');

      await tx.salesReturn.update({
        where: { id: sr.id },
        data: { status: 'PROCESSING' }
      });

      const deliveries = await tx.deliveryOrder.findMany({
        where: { sales_order_id: sr.sales_order_id },
        select: { id: true }
      });
      const deliveryIds = deliveries.map(d => d.id);
      const transactionIds = [sr.sales_order_id, ...deliveryIds];

      let totalRevenue = 0;
      let totalCogs = 0;

      for (const item of sr.items) {
        let remainingQtyToReturn = item.quantity;
        let itemTotalCost = 0;

        const consumptions = await tx.costLayerConsumption.findMany({
          where: {
            company_id: companyId,
            stock_movement: {
              product_id: item.product_id,
              transaction_id: { in: transactionIds }
            }
          },
          orderBy: { created_at: 'desc' },
          include: { stock_movement: true }
        });

        let allocationsData: any[] = [];
        for (const c of consumptions) {
          if (remainingQtyToReturn <= 0) break;
          const consumeQty = Math.min(c.quantity, remainingQtyToReturn);
          itemTotalCost += consumeQty * c.unit_cost;
          remainingQtyToReturn -= consumeQty;
          allocationsData.push({
            original_cost_layer_id: c.layer_id,
            original_cost_layer_consumption_id: c.id,
            quantity: consumeQty,
            unit_cost: c.unit_cost,
            total_cost: consumeQty * c.unit_cost
          });
        }

        if (remainingQtyToReturn > 0) {
          throw new BadRequestException(`Cannot find enough consumption history for product ${item.product_id}. Cannot fake cost.`);
        }

        const unitCost = itemTotalCost / item.quantity;

        const receiveStockRes = await this.inventoryService.receiveStock(tx as any, {
          companyId,
          warehouseId: sr.warehouse_id,
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: unitCost,
          referenceType: 'SALES_RETURN',
          referenceId: sr.id,
          userId
        });

        const restoredLayer = await tx.inventoryCostLayer.findFirst({
          where: { source_movement_id: receiveStockRes.movement.id }
        });

        for (const alloc of allocationsData) {
          await tx.salesReturnCostAllocation.create({
            data: {
              company_id: companyId,
              sales_return_id: sr.id,
              sales_return_item_id: item.id,
              original_cost_layer_id: alloc.original_cost_layer_id,
              original_cost_layer_consumption_id: alloc.original_cost_layer_consumption_id,
              restored_cost_layer_id: restoredLayer?.id,
              quantity: alloc.quantity,
              unit_cost: alloc.unit_cost,
              total_cost: alloc.total_cost,
              warehouse_id: sr.warehouse_id,
            }
          });
        }

        await tx.salesReturnItem.update({
          where: { id: item.id },
          data: {
            unit_cost: unitCost,
            total_cost: itemTotalCost,
          }
        });

        await tx.salesOrderItem.update({
          where: { id: item.sales_order_item_id },
          data: { returned_qty: { increment: item.quantity } }
        });

        totalRevenue += item.total_sales_value;
        totalCogs += itemTotalCost;
      }

      await tx.salesReturn.update({
        where: { id: sr.id },
        data: { status: 'POSTED', total_amount: totalRevenue }
      });

      if (totalCogs > 0) {
        this.eventEmitter.emit('inventory.valuation', new InventoryValuationEvent(
          companyId, sr.id, `sr-cogs-${sr.id}`, new Date(),
          { type: 'SALES_RETURN_COGS', totalValue: totalCogs }, tx as any
        ));
      }

      const invoice = await tx.invoice.create({
        data: {
          company_id: companyId,
          customer_id: sr.customer_id,
          type: 'AR',
          invoice_number: `CN-${Date.now()}`,
          invoice_date: new Date(),
          due_date: new Date(),
          subtotal: -totalRevenue,
          tax: 0,
          total: -totalRevenue,
          remaining_amount: -totalRevenue,
          status: 'UNPAID'
        }
      });

      if (totalRevenue > 0) {
        this.eventEmitter.emit('invoice.posted', new InvoicePostedEvent(
          companyId, invoice.id, `sr-rev-${sr.id}`, new Date(),
          { type: 'SALES_RETURN_REVENUE', totalAmount: totalRevenue }, tx as any
        ));
      }

      return { success: true };
    });
  }

  async reverse(companyId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sr = await tx.salesReturn.findFirst({
        where: { id, company_id: companyId, status: 'POSTED' },
        include: { items: true }
      });
      if (!sr) throw new BadRequestException('Sales Return not found or not in POSTED status');

      await tx.salesReturn.update({
        where: { id: sr.id },
        data: { status: 'PROCESSING_REVERSAL' }
      });

      let totalRevenue = 0;
      let totalCogs = 0;

      for (const item of sr.items) {
        const allocations = await tx.salesReturnCostAllocation.findMany({
          where: { sales_return_id: sr.id, sales_return_item_id: item.id }
        });

        if (allocations.length === 0) {
          throw new BadRequestException(`No sales return cost allocation found for return ${sr.id}`);
        }

        for (const alloc of allocations) {
          if (!alloc.restored_cost_layer_id) continue;
          const updateRes = await tx.inventoryCostLayer.updateMany({
            where: { 
              id: alloc.restored_cost_layer_id, 
              remaining_quantity: { gte: alloc.quantity } 
            },
            data: {
              remaining_quantity: { decrement: alloc.quantity }
            }
          });
          if (updateRes.count === 0) {
            throw new BadRequestException(`Restored return inventory has already been consumed; automatic reversal is unsafe.`);
          }
        }

        const stock = await tx.warehouseStock.findFirst({
          where: { company_id: companyId, warehouse_id: sr.warehouse_id, product_id: item.product_id }
        });

        const reversalMovement = await tx.stockMovement.create({
          data: {
            company_id: companyId,
            warehouse_id: sr.warehouse_id,
            product_id: item.product_id,
            transaction_type: 'SALES_RETURN_REVERSAL',
            transaction_id: sr.id,
            movement_type: 'SALES_RETURN_REVERSAL_OUT',
            qty_in: 0,
            qty_out: item.quantity,
            balance_after: stock ? stock.current_stock - item.quantity : 0,
            created_by: userId,
            remarks: 'Auto reversal of sales return',
          }
        });

        await tx.warehouseStock.updateMany({
          where: { company_id: companyId, warehouse_id: sr.warehouse_id, product_id: item.product_id },
          data: {
            current_stock: { decrement: item.quantity },
            available_stock: { decrement: item.quantity }
          }
        });

        for (const alloc of allocations) {
          if (!alloc.restored_cost_layer_id) continue;
          await tx.costLayerConsumption.create({
            data: {
              company_id: companyId,
              layer_id: alloc.restored_cost_layer_id,
              stock_movement_id: reversalMovement.id,
              quantity: alloc.quantity,
              unit_cost: alloc.unit_cost,
              total_cost: alloc.total_cost
            }
          });
        }

        await tx.salesOrderItem.update({
          where: { id: item.sales_order_item_id },
          data: { returned_qty: { decrement: item.quantity } }
        });

        totalRevenue += item.total_sales_value;
        totalCogs += item.total_cost;
      }

      await tx.salesReturn.update({
        where: { id: sr.id },
        data: { status: 'REVERSED' }
      });

      if (totalCogs > 0) {
        this.eventEmitter.emit('inventory.valuation', new InventoryValuationEvent(
          companyId, sr.id, `sr-cogs-rev-${sr.id}`, new Date(),
          { type: 'SALES_RETURN_COGS_REVERSAL', totalValue: totalCogs }, tx as any
        ));
      }

      const invoice = await tx.invoice.create({
        data: {
          company_id: companyId,
          customer_id: sr.customer_id,
          type: 'AR',
          invoice_number: `CN-REV-${Date.now()}`,
          invoice_date: new Date(),
          due_date: new Date(),
          subtotal: totalRevenue,
          tax: 0,
          total: totalRevenue,
          remaining_amount: totalRevenue,
          status: 'UNPAID'
        }
      });

      if (totalRevenue > 0) {
        this.eventEmitter.emit('invoice.posted', new InvoicePostedEvent(
          companyId, invoice.id, `sr-rev-void-${sr.id}`, new Date(),
          { type: 'SALES_RETURN_REVENUE_REVERSAL', totalAmount: totalRevenue }, tx as any
        ));
      }

      return { success: true };
    });
  }
}
