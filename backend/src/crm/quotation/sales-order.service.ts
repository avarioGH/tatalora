import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../../finance/payment/payment.service';
import { SequenceService } from '../../reports/sequence.service';

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly sequenceService: SequenceService,
  ) {}

  async findAll(companyId: string, query?: any) {
    const where: any = { company_id: companyId };
    if (query?.warehouse_id) {
      where.warehouse_id = query.warehouse_id;
    }

    const data = await this.prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        allocations: {
          include: { payment: true },
        },
      },
      orderBy: [{ order_date: 'desc' }, { created_at: 'desc' }],
    });

    return { data };
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, company_id: companyId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        deliveries: {
          include: { items: true },
        },
        invoices: true,
        allocations: {
          include: { payment: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Sales order ${id} not found`);
    }

    return order;
  }

  async create(companyId: string, data: any, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate & validate items
      const rawItems = data.items || [];
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new BadRequestException('Sales order must contain at least one item');
      }

      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of rawItems) {
        const productId = item.product_id || item.productId;
        if (!productId) {
          throw new BadRequestException('Product ID is required for each order item');
        }

        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product || product.company_id !== companyId) {
          throw new BadRequestException(`Product ${productId} not found`);
        }

        const qty = Number(item.qty ?? item.quantity ?? 1);
        if (qty <= 0) {
          throw new BadRequestException('Item quantity must be greater than zero');
        }

        const unitPrice = Number(item.unit_price ?? item.price ?? product.selling_price ?? 0);
        const discount = Number(item.discount || 0);
        const tax = Number(item.tax || 0);
        const lineSubtotal = Number(
          item.subtotal !== undefined
            ? item.subtotal
            : Math.max(0, qty * unitPrice - discount),
        );

        subtotal += lineSubtotal;

        orderItemsData.push({
          product_id: product.id,
          qty,
          unit_price: unitPrice,
          subtotal: lineSubtotal,
        });
      }

      // 2. Global discounts, tax & grand total
      const discountPercent = Number(data.discount_percent || 0);
      const discountAmount = Number(
        data.discount_amount !== undefined
          ? data.discount_amount
          : (subtotal * discountPercent) / 100,
      );
      const taxAmount = Number(data.tax || 0);
      const computedTotal = Math.max(0, subtotal - discountAmount + taxAmount);
      const totalAmount = Number(data.total_amount ?? data.total ?? computedTotal);

      // 3. Payment Status & Upfront tracking
      const paidAmount = Number(data.paidAmount ?? data.paid_amount ?? 0);
      let paymentStatus = 'UNPAID';
      if (paidAmount >= totalAmount - 0.01 && totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      }

      // 4. Order Number Generation via canonical SequenceService
      let orderNumber = data.order_number;
      if (!orderNumber) {
        orderNumber = await this.sequenceService.generateNumber(
          tx,
          companyId,
          'SALES_ORDER',
          'SO',
        );
      }

      const orderStatus = data.status || 'CONFIRMED';

      // 5. Create SalesOrder header and items
      // IMPORTANT: Does NOT decrement physical stock or emit sales.completed income entries.
      const order = await tx.salesOrder.create({
        data: {
          company_id: companyId,
          customer_id: data.customer_id || data.partner_id || undefined,
          quotation_id: data.quotation_id || undefined,
          order_number: orderNumber,
          order_date: data.order_date ? new Date(data.order_date) : new Date(),
          due_date: data.due_date ? new Date(data.due_date) : undefined,
          status: orderStatus,
          delivery_status: 'PENDING',
          invoice_status: 'PENDING',
          payment_status: paymentStatus,
          payment_method: data.payment_method || 'Transfer',
          total_amount: totalAmount,
          subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          tax: taxAmount,
          warehouse_id: data.warehouse_id || undefined,
          email: data.email || undefined,
          billing_address: data.billing_address || undefined,
          delivery_address: data.delivery_address || undefined,
          payment_terms: data.payment_terms || 'net30',
          tag: data.tag || undefined,
          client_ref: data.client_ref || undefined,
          currency: data.currency || 'IDR',
          message: data.message || undefined,
          memo: data.memo || undefined,
          notes: data.notes || data.message || undefined,
          ecommerce_session_id:
            data.ecommerce_session_id ||
            'MANUAL_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      // 6. Handle Upfront Payment via PaymentService if paidAmount > 0
      if (paidAmount > 0 && order.customer_id) {
        await this.paymentService.create(
          companyId,
          {
            salesOrderId: order.id,
            customerId: order.customer_id,
            amount: paidAmount,
            paymentMethod: data.payment_method || 'Transfer',
            reference: orderNumber,
            idempotencyKey: `UPFRONT-SO-${order.id}`,
            notes: `Upfront B2B Payment ${orderNumber}`,
            allowUnallocated: true,
          },
          userId,
        );

        const refreshed = await tx.salesOrder.findUnique({
          where: { id: order.id },
          include: {
            items: { include: { product: true } },
            customer: true,
            allocations: { include: { payment: true } },
          },
        });
        if (refreshed) return refreshed;
      }

      return order;
    });
  }

  async update(companyId: string, id: string, data: any) {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Sales order ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // If items are provided in update
      if (Array.isArray(data.items) && data.items.length > 0) {
        await tx.salesOrderItem.deleteMany({
          where: { sales_order_id: id },
        });

        let subtotal = 0;
        const newItems: any[] = [];
        for (const item of data.items) {
          const productId = item.product_id || item.productId;
          const qty = Number(item.qty || item.quantity) || 1;
          const unitPrice = Number(item.unit_price || item.unitPrice || item.price) || 0;
          const lineSubtotal = qty * unitPrice;
          subtotal += lineSubtotal;

          newItems.push({
            sales_order_id: id,
            product_id: productId,
            description: item.description || '',
            qty,
            unit_price: unitPrice,
            subtotal: lineSubtotal,
            tax: Number(item.tax) || 0,
            discount: Number(item.discount) || 0,
          });
        }

        await tx.salesOrderItem.createMany({
          data: newItems,
        });

        data.total_amount = subtotal;
      }

      return tx.salesOrder.update({
        where: { id },
        data: {
          customer_id: data.customer_id || data.customerId || existing.customer_id,
          warehouse_id: data.warehouse_id || data.warehouseId || existing.warehouse_id,
          status: data.status || existing.status,
          delivery_status: data.delivery_status || existing.delivery_status,
          invoice_status: data.invoice_status || existing.invoice_status,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          payment_terms: data.payment_terms || existing.payment_terms,
          total_amount: data.total_amount !== undefined ? Number(data.total_amount) : existing.total_amount,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }

  async delete(companyId: string, id: string) {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, company_id: companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Sales order ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({
        where: { sales_order_id: id },
      });
      await tx.paymentAllocation.deleteMany({
        where: { sales_order_id: id },
      });
      await tx.salesOrder.delete({
        where: { id },
      });
      return { success: true, message: `Sales order ${existing.order_number} deleted successfully` };
    });
  }
}
