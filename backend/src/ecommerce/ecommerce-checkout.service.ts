import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryValuationEvent } from '../events/accounting.events';
import { InventoryService } from '../inventory/inventory.service';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcommerceCartService } from './ecommerce-cart.service';
import { TripayService } from '../integrations/providers/payment/tripay/tripay.service';

@Injectable()
export class EcommerceCheckoutService {
  private readonly logger = new Logger(EcommerceCheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: EcommerceCartService,
    private tripayService: TripayService,
    private inventoryService: InventoryService,
    private eventEmitter: EventEmitter2,
  ) {}

  async checkout(companyId: string, sessionId: string, payload: any) {
    const { email, name, phone, billing_address, delivery_address, fail_at } =
      payload;

    const existingIntent = await this.prisma.checkoutIdempotency.findFirst({
      where: { company_id: companyId, ecommerce_session_id: sessionId },
    });

    if (existingIntent) {
      return this.handleTripay(
        companyId,
        existingIntent.sales_order_id,
        payload.payment_method,
      );
    }

    const cart = await this.cartService.getCart(companyId, sessionId);
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    let salesOrderId: string;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        let customer = await tx.customer.findFirst({
          where: { company_id: companyId, email },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              company_id: companyId,
              code: 'EC-' + Date.now(),
              name,
              email,
              phone,
              billing_address,
              delivery_address,
            },
          });
        }

        if (fail_at === 'CUSTOMER') throw new Error('Test Failure: CUSTOMER');

        const orderNumber = 'SO-EC-' + Date.now();
        const salesOrder = await tx.salesOrder.create({
          data: {
            company_id: companyId,
            customer_id: customer.id,
            order_number: orderNumber,
            order_date: new Date(),
            status: 'PENDING',
            total_amount: cart.grand_total,
            channel: 'ECOMMERCE',
            ecommerce_session_id: sessionId,
            billing_address,
            delivery_address,
            items: {
              create: cart.items.map((item) => ({
                product_id: item.product_id,
                qty: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
              })),
            },
          },
        });

        if (fail_at === 'SALES_ORDER')
          throw new Error('Test Failure: SALES_ORDER');

        for (const item of cart.items) {
          const stocks = await tx.warehouseStock.findMany({
            where: {
              company_id: companyId,
              product_id: item.product_id,
              available_stock: { gte: item.quantity },
            },
            orderBy: { available_stock: 'desc' },
          });
          if (stocks.length === 0)
            throw new BadRequestException(
              'Insufficient stock for ' + item.product_name,
            );
          const targetStock = stocks[0];

          await this.inventoryService.issueStock(tx as any, {
            companyId,
            warehouseId: targetStock.warehouse_id,
            productId: item.product_id,
            quantity: item.quantity,
            referenceType: 'ECOMMERCE',
            referenceId: salesOrder.id,
            userId: '6aa02dc075845f59e02b3f01',
          });
        }

        let totalCogs = 0;
        for (const item of cart.items) {
          const cons = await tx.costLayerConsumption.findMany({
            where: {
              stock_movement: {
                transaction_type: 'ECOMMERCE',
                transaction_id: salesOrder.id,
                product_id: item.product_id,
              },
            },
          });
          totalCogs += cons.reduce(
            (sum, c) => sum + c.quantity * c.unit_cost,
            0,
          );
        }
        if (totalCogs > 0) {
          await this.eventEmitter.emitAsync(
            'inventory.valuation',
            new InventoryValuationEvent(
              companyId,
              salesOrder.id,
              'EVT-' + Date.now(),
              new Date(),
              { type: 'COGS', totalValue: totalCogs },
              tx as any,
            ),
          );
        }

        if (fail_at === 'RESERVATION')
          throw new Error('Test Failure: RESERVATION');

        const invoiceNumber = 'INV-EC-' + Date.now();
        const invoice = await tx.invoice.create({
          data: {
            company_id: companyId,
            type: 'AR',
            customer_id: customer.id,
            sales_order_id: salesOrder.id,
            invoice_number: invoiceNumber,
            invoice_date: new Date(),
            due_date: new Date(Date.now() + 86400000),
            status: 'POSTED',
            subtotal: cart.subtotal,
            tax: cart.tax,
            total: cart.grand_total,
            remaining_amount: cart.grand_total,
          },
        });

        if (fail_at === 'INVOICE') throw new Error('Test Failure: INVOICE');

        await tx.checkoutIdempotency.create({
          data: {
            company_id: companyId,
            ecommerce_session_id: sessionId,
            sales_order_id: salesOrder.id,
          },
        });

        return { salesOrderId: salesOrder.id };
      });

      salesOrderId = result.salesOrderId;
      await this.cartService.clearCart(companyId, sessionId);
    } catch (e: any) {
      if (e.code === 'P2002') {
        const check = await this.prisma.checkoutIdempotency.findFirst({
          where: { company_id: companyId, ecommerce_session_id: sessionId },
        });
        if (check) {
          return this.handleTripay(
            companyId,
            check.sales_order_id,
            payload.payment_method,
          );
        }
      }
      throw e;
    }

    return this.handleTripay(companyId, salesOrderId, payload.payment_method);
  }

  private async handleTripay(
    companyId: string,
    salesOrderId: string,
    paymentMethod: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { sales_order_id: salesOrderId },
    });

    if (!invoice) throw new BadRequestException('Invoice missing for order');

    try {
      const payment = await this.tripayService.createPaymentRequest(
        companyId,
        invoice.customer_id || 'sys',
        invoice.id,
        paymentMethod || 'BRIVA',
      );
      return {
        success: true,
        order_id: salesOrderId,
        checkout_url: payment.redirect_url,
      };
    } catch (err: any) {
      this.logger.error('Failed to create tripay transaction', err);
      return {
        success: true,
        order_id: salesOrderId,
        message: 'Order created but payment failed to initialize',
      };
    }
  }
}
