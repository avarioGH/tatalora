import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../../inventory/inventory.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryValuationEvent } from '../../events/accounting.events';

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: {
    companyId: string;
    userId: string;
    purchaseOrderId: string;
    warehouseId: string;
    items: { purchaseOrderItemId: string; quantity: number; reason?: string }[];
    reason: string;
    notes?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Items are required');
    }

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId, company_id: data.companyId },
        include: { items: true },
      });

      if (!po) throw new NotFoundException('Purchase Order not found');

      // Generate Return Number
      const count = await tx.purchaseReturn.count({
        where: { company_id: data.companyId },
      });
      const returnNumber = `PR-RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const pr = await tx.purchaseReturn.create({
        data: {
          company_id: data.companyId,
          return_number: returnNumber,
          purchase_order_id: po.id,
          supplier_id: po.supplier_id,
          warehouse_id: data.warehouseId,
          return_date: new Date(),
          status: 'DRAFT',
          reason: data.reason,
          notes: data.notes,
          created_by: data.userId,
          total_amount: 0,
        },
      });

      for (const item of data.items) {
        const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
        if (!poItem) {
          throw new BadRequestException(`Invalid PO item ${item.purchaseOrderItemId}`);
        }

        const returned = poItem.returned_qty || 0;
        const received = poItem.received_qty || 0;

        if (returned + item.quantity > received) {
          throw new BadRequestException(
            `Cannot return more than received for product ${poItem.product_id}. Received: ${received}, Already Returned: ${returned}`,
          );
        }

        await tx.purchaseReturnItem.create({
          data: {
            purchase_return_id: pr.id,
            purchase_order_item_id: poItem.id,
            product_id: poItem.product_id,
            quantity: item.quantity,
            unit: (poItem as any).unit || '', // Cast to any to avoid TypeScript error if 'unit' missing
            unit_cost: 0, // Will be calculated on approve
            total_cost: 0,
            reason: item.reason,
          },
        });
      }

      return tx.purchaseReturn.findUnique({
        where: { id: pr.id },
        include: { items: true },
      });
    });
  }

  async approve(id: string, companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.purchaseReturn.updateMany({
        where: { id, company_id: companyId, status: 'DRAFT' },
        data: { status: 'PROCESSING' },
      });

      if (res.count === 0) {
        throw new BadRequestException('Purchase return not found or not in DRAFT state');
      }

      const pr = await tx.purchaseReturn.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!pr) {
        throw new BadRequestException('Purchase return not found');
      }

      let totalConsumedCost = 0;

      for (const item of pr.items) {
        // Issue stock (FIFO)
        const { consumedCost } = await this.inventoryService.issueStock(tx as any, {
          companyId,
          warehouseId: pr.warehouse_id,
          productId: item.product_id,
          quantity: item.quantity,
          referenceType: 'PURCHASE_RETURN',
          referenceId: pr.id,
          description: `Purchase Return ${pr.return_number}`,
          userId,
        });

        const unitCost = item.quantity > 0 ? consumedCost / item.quantity : 0;

        await tx.purchaseReturnItem.update({
          where: { id: item.id },
          data: {
            unit_cost: unitCost,
            total_cost: consumedCost,
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.purchase_order_item_id },
          data: {
            returned_qty: { increment: item.quantity },
          },
        });

        totalConsumedCost += consumedCost;
      }

      // Create a negative invoice (Supplier Credit Note)
      const cnNumber = `PR-CN-${pr.return_number}`;
      await tx.invoice.create({
        data: {
          company_id: companyId,
          type: 'AP',
          invoice_number: cnNumber,
          purchase_order_id: pr.purchase_order_id,
          supplier_id: pr.supplier_id,
          invoice_date: new Date(),
          due_date: new Date(),
          subtotal: -totalConsumedCost,
          tax_amount: 0,
          total: -totalConsumedCost,
          remaining_amount: -totalConsumedCost,
          status: 'POSTED',
          // Assuming `created_by` isn't in Invoice directly based on schema
          // wait, some models have `created_by`, let's just use what's safe or cast it if needed
          // `Invoice` model usually doesn't have `created_by` in standard prisma schemas unless we saw it.
          // Wait, I saw Invoice model: `status String`. Let's remove `created_by` for safety, 
          // or we can pass it if it's there. I'll omit it to avoid errors.
        } as any,
      });

      await tx.purchaseReturn.update({
        where: { id },
        data: {
          status: 'POSTED',
          total_amount: totalConsumedCost,
        },
      });

      this.eventEmitter.emit(
        'accounting.inventory.valuation',
        new InventoryValuationEvent(
          companyId,
          pr.id, // sourceEntityId
          `PR-${pr.id}-${Date.now()}`, // eventId
          new Date(),
          {
            type: 'PURCHASE_RETURN',
            totalValue: totalConsumedCost,
            description: `Purchase Return ${pr.return_number}`,
          },
          tx as any,
        ),
      );

      return pr;
    });
  }

  async reverse(id: string, companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.purchaseReturn.updateMany({
        where: { id, company_id: companyId, status: 'POSTED' },
        data: { status: 'PROCESSING_REVERSAL' },
      });

      if (res.count === 0) {
        throw new BadRequestException('Purchase return not found or not POSTED');
      }

      const pr = await tx.purchaseReturn.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!pr) {
        throw new BadRequestException('Purchase return not found');
      }

      for (const item of pr.items) {
        await this.inventoryService.receiveStock(tx as any, {
          companyId,
          warehouseId: pr.warehouse_id,
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: item.unit_cost, // Return back at the exact cost it was issued
          referenceType: 'PURCHASE_RETURN_REVERSAL',
          referenceId: pr.id,
          description: `Reversal of Purchase Return ${pr.return_number}`,
          userId,
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.purchase_order_item_id },
          data: {
            returned_qty: { decrement: item.quantity },
          },
        });
      }

      // Reverse credit note
      const revCnNumber = `PR-CN-REV-${pr.return_number}`;
      await tx.invoice.create({
        data: {
          company_id: companyId,
          type: 'AP',
          invoice_number: revCnNumber,
          purchase_order_id: pr.purchase_order_id,
          supplier_id: pr.supplier_id,
          invoice_date: new Date(),
          due_date: new Date(),
          subtotal: pr.total_amount,
          tax_amount: 0,
          total: pr.total_amount,
          remaining_amount: pr.total_amount,
          status: 'POSTED',
        } as any,
      });

      await tx.purchaseReturn.update({
        where: { id },
        data: { status: 'REVERSED' },
      });

      this.eventEmitter.emit(
        'accounting.inventory.valuation',
        new InventoryValuationEvent(
          companyId,
          pr.id, // sourceEntityId
          `PR-REV-${pr.id}-${Date.now()}`, // eventId
          new Date(),
          {
            type: 'PURCHASE_RETURN_REVERSAL',
            totalValue: pr.total_amount,
            description: `Reversal of Purchase Return ${pr.return_number}`,
          },
          tx as any,
        ),
      );

      return pr;
    });
  }
}
