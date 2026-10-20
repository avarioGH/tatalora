import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { InventoryService } from '../inventory/inventory.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SalesCompletedEvent } from '../events/sales-completed.event';
import { InventoryValuationEvent } from '../events/accounting.events';
import { SequenceService } from '../reports/sequence.service';

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private sequenceService: SequenceService,
  ) {}

  async processCheckout(data: any) {
    const {
      companyId,
      userId,
      warehouseId,
      paymentMethod,
      items,
      subtotal,
      tax,
      total,
      idempotency_key,
      newCustomerName,
      newCustomerPhone,
      newCustomerAddress,
    } = data;
    let customerId = data.customerId;
    let totalPosCogs = 0;

    const _posResult = await this.prisma.$transaction(async (tx) => {
        let resolvedWarehouseId = warehouseId;
        if (!resolvedWarehouseId) {
          const defaultWh = await tx.warehouse.findFirst({ where: { company_id: companyId } });
          resolvedWarehouseId = defaultWh?.id;
        }
      // 0. Idempotency Check
      if (idempotency_key) {
        const existing = await tx.salesOrder.findFirst({
          where: {
            company_id: companyId,
            ecommerce_session_id: idempotency_key,
          },
        });
        if (existing) {
          throw new ConflictException(
            'Transaction with this idempotency key already exists.',
          );
        }
      }

      // 0.5 Create New Customer if requested
      if (!customerId && newCustomerName) {
        const newCust = await tx.customer.create({
          data: {
            company_id: companyId,
            name: newCustomerName,
            phone: newCustomerPhone || undefined,
            address: newCustomerAddress || undefined,
            status: true,
            code: 'CUST-' + Date.now(),
          },
        });
        customerId = newCust.id;
      }

      // 1. Create Sales Order (Receipt)
      const soNo = await this.sequenceService.generateNumber(
        tx,
        companyId,
        'POS',
        'POS',
      );
      const totalAmount =
        total ?? items.reduce((s: number, i: any) => s + i.qty * i.price, 0);
      const paidAmount =
        data.paidAmount !== undefined ? data.paidAmount : totalAmount;

      let initialPaymentStatus = 'UNPAID';
      if (paidAmount >= totalAmount - 0.01) initialPaymentStatus = 'PAID';
      else if (paidAmount > 0) initialPaymentStatus = 'PARTIALLY_PAID';

      const salesOrder = await tx.salesOrder.create({
          data: {
            company_id: companyId,
            warehouse_id: resolvedWarehouseId,
            order_number: soNo,
          ecommerce_session_id: idempotency_key,
          customer_id: customerId,
          order_date: new Date(),
          status: 'COMPLETED',
          total_amount: totalAmount,
          payment_status: initialPaymentStatus,
          payment_method: paymentMethod || 'CASH',
        },
      });

      // 2. Loop Items
      for (const item of items) {
        // Create Sales Order Item
        await tx.salesOrderItem.create({
          data: {
            sales_order_id: salesOrder.id,
            product_id: item.productId,
            qty: item.qty,
            unit_price: item.price,
            subtotal: item.qty * item.price,
          },
        });

        

        if (resolvedWarehouseId) {
          const issueRes = await this.inventoryService.issueStock(tx as any, {
            companyId,
            warehouseId: resolvedWarehouseId,
            productId: item.productId,
            quantity: item.qty,
            referenceType: 'POS_SALE',
            referenceId: salesOrder.id,
            allowNegative: true,
            description: `POS Sale ${soNo}`,
            userId: userId || '000000000000000000000000',
          });
          totalPosCogs += issueRes.consumedCost;
        }
      }

      // 3. Payment & Finance Transaction
      const cashAccount = await tx.cashAccount.findFirst({
        where: { company_id: companyId },
      });

      if (paidAmount > 0) {
        const payment = await tx.payment.create({
          data: {
            company_id: companyId,
            customer_id: customerId || undefined,
            payment_number: 'PAY-' + Date.now(),
            payment_date: new Date(),
            amount: paidAmount,
            payment_method: paymentMethod || 'CASH',
            reference: `POS Sale ${soNo}`,
            created_by: userId || '000000000000000000000000'
          }
        });

        await tx.paymentAllocation.create({
          data: {
            payment_id: payment.id,
            sales_order_id: salesOrder.id,
            amount: paidAmount
          }
        });

        if (cashAccount) {
          await tx.financeTransaction.create({
            data: {
              company_id: companyId,
              cash_account_id: cashAccount.id,
              transaction_no: `TRX-${Date.now()}`,
              transaction_type: 'Income',
              transaction_date: new Date(),
              total_amount: paidAmount,
              reference_type: 'POS',
              reference_id: salesOrder.id,
              description: `Pembayaran POS #${soNo}`,
              status: 'COMPLETED',
              created_by: userId,
            },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          action: 'CREATE',
          entity: 'POS_Transaction',
          entity_id: salesOrder.id,
          after_data: {
            details: `Kasir memproses transaksi ${soNo} senilai ${total}`,
          },
        },
      });

      // 5. Emit Domain Event for Accounting Integration
      // Using async Emit (waiting for handlers to complete within this transaction boundary)
      await this.eventEmitter.emitAsync(
        'sales.completed',
        new SalesCompletedEvent({
          companyId,
          sourceEntityId: salesOrder.id,
          payload: {
            totalAmount: salesOrder.total_amount,
            paidAmount: paidAmount, // Pass paidAmount to handle piutang
            paymentMethod: paymentMethod || 'CASH',
            userId,
          },
          tx: tx as any,
        }),
      );

      // Emit COGS to accounting
      if (totalPosCogs > 0) {
        await this.eventEmitter.emitAsync(
          'inventory.valuation',
          new InventoryValuationEvent(
            companyId,
            salesOrder.id,
            `VAL-POS-${salesOrder.id}`,
            new Date(),
            {
              type: 'COGS',
              totalValue: totalPosCogs,
              description: 'COGS for POS ' + salesOrder.order_number,
            },
            tx,
          ),
        );
      }

      return salesOrder;
    });
    // Notify owners
    try {
      const _total = data.total || 0;
      await this.notificationService.sendToOwners(data.companyId, {
        type: 'POS_SALE',
        title: '🛒 Penjualan POS Baru',
        message: `Transaksi POS senilai Rp ${Math.round(_total).toLocaleString('id-ID')} berhasil dicatat.`,
        severity: 'SUCCESS',
        entityType: 'SALES_ORDER',
        actionUrl: '/pos/reports',
        idempotencyKey: `pos-sale-notif-${data.idempotency_key || Date.now()}`,
      });
    } catch (_ne) {
      /* silent */
    }
    return _posResult;
  }

  async getHistory(companyId: string, warehouseId?: string) {
    return this.prisma.salesOrder.findMany({
      where: { company_id: companyId, ...(warehouseId ? { warehouse_id: warehouseId } : {}) },
      include: {
        customer: true,
        allocations: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { order_date: 'desc' },
    });
  }

  async getCurrentShift(companyId: string, userId: string) {
    return this.prisma.posShift.findFirst({
      where: {
        company_id: companyId,
        user_id: userId,
        status: 'OPEN',
      },
    });
  }

  async openShift(data: any) {
    const { companyId, warehouseId, userId, startingCash } = data;

    // Check if there is already an open shift
    const existingShift = await this.getCurrentShift(companyId, userId);
    if (existingShift) {
      throw new BadRequestException('You already have an open shift');
    }

    return this.prisma.posShift.create({
      data: {
        company_id: companyId,
        warehouse_id: warehouseId,
        user_id: userId,
        starting_cash: startingCash,
        status: 'OPEN',
      },
    });
  }

  async closeShift(data: any) {
    const { companyId, userId, endingCash } = data;

    const existingShift = await this.getCurrentShift(companyId, userId);
    if (!existingShift) {
      throw new BadRequestException('No open shift found to close');
    }

    return this.prisma.posShift.update({
      where: { id: existingShift.id },
      data: {
        end_time: new Date(),
        ending_cash: endingCash,
        status: 'CLOSED',
      },
    });
  }
}
