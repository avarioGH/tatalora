import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicePostedEvent } from '../../events/accounting.events';
import { SequenceService } from '../../reports/sequence.service';

export interface CreateInvoiceFromSoDto {
  salesOrderId: string;
  deliveryOrderId?: string;
  items?: Array<{
    productId: string;
    qty: number;
    unitPrice?: number;
    discount?: number;
    tax?: number;
    description?: string;
  }>;
  invoiceDate?: Date | string;
  dueDate?: Date | string;
  paymentTerms?: string;
  notes?: string;
}

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private sequenceService: SequenceService,
  ) {}

  /**
   * Decimal arithmetic helper to prevent IEEE 754 floating point inaccuracies.
   * Quantities are rounded to 4 decimal places (precision 0.0001).
   * Monetary amounts are rounded to 2 decimal places (cents/cents-equivalent).
   */
  private roundQty(val: number): number {
    return Math.round(Number(val || 0) * 10000) / 10000;
  }

  private roundMoney(val: number): number {
    return Math.round(Number(val || 0) * 100) / 100;
  }

  /**
   * Recalculates and updates the SalesOrder invoice_status based EXCLUSIVELY on
   * authoritative POSTED billing (POSTED, PARTIALLY PAID, PAID).
   * Active DRAFT invoices reserve capacity, but do NOT prematurely alter the SalesOrder invoice_status.
   */
  private async recalculateSoInvoiceStatus(tx: any, salesOrderId: string) {
    const so = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: true,
        invoices: {
          where: { status: { in: ['POSTED', 'PARTIALLY PAID', 'PAID'] } },
          include: { items: true },
        },
      },
    });

    if (!so) return;

    let allInvoiced = true;
    let anyInvoiced = false;

    for (const soItem of so.items) {
      let postedBilledQty = 0;
      so.invoices.forEach((inv: any) => {
        const ii = inv.items.find((i: any) => i.product_id === soItem.product_id);
        if (ii) postedBilledQty = this.roundQty(postedBilledQty + ii.qty);
      });

      if (postedBilledQty > 0) anyInvoiced = true;
      if (postedBilledQty < this.roundQty(soItem.qty)) allInvoiced = false;
    }

    const newInvoiceStatus = allInvoiced
      ? 'INVOICED'
      : anyInvoiced
        ? 'PARTIAL'
        : 'PENDING';

    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { invoice_status: newInvoiceStatus },
    });
  }

  /**
   * Helper: Calculates current billing and reservation breakdown for a Sales Order.
   * Returns:
   * - postedBilledMap: Authoritative posted/paid invoiced quantities
   * - draftReservedMap: Active draft invoice reserved quantities
   * - effectiveInvoicedMap: posted + draft (for draft reservation checks)
   * - deliveredMap: Total delivered quantities from DONE / DELIVERED delivery orders
   */
  private computeOrderBillingMetrics(so: any) {
    const postedBilledMap: Record<string, number> = {};
    const draftReservedMap: Record<string, number> = {};
    const effectiveInvoicedMap: Record<string, number> = {};

    for (const inv of so.invoices || []) {
      if (inv.status === 'CANCELLED' || inv.status === 'VOID') continue;

      const isPosted = ['POSTED', 'PARTIALLY PAID', 'PAID'].includes(inv.status);
      const isDraft = ['DRAFT', 'PENDING'].includes(inv.status);

      for (const item of inv.items || []) {
        const pid = item.product_id;
        const qty = this.roundQty(item.qty);

        if (isPosted) {
          postedBilledMap[pid] = this.roundQty((postedBilledMap[pid] || 0) + qty);
        } else if (isDraft) {
          draftReservedMap[pid] = this.roundQty((draftReservedMap[pid] || 0) + qty);
        }

        effectiveInvoicedMap[pid] = this.roundQty(
          (effectiveInvoicedMap[pid] || 0) + qty,
        );
      }
    }

    const deliveredMap: Record<string, number> = {};
    const completedDeliveries = (so.deliveries || []).filter(
      (d: any) => d.status === 'DONE' || d.status === 'DELIVERED',
    );
    for (const d of completedDeliveries) {
      for (const item of d.items || []) {
        const pid = item.product_id;
        deliveredMap[pid] = this.roundQty(
          (deliveredMap[pid] || 0) + item.delivered_qty,
        );
      }
    }

    return {
      postedBilledMap,
      draftReservedMap,
      effectiveInvoicedMap,
      deliveredMap,
      hasDeliveries: completedDeliveries.length > 0,
    };
  }

  /**
   * Create an invoice from a Sales Order (and optional Delivery Order).
   * Enforces billable quantity rules, currency/rounding, row locking, and sequence numbering.
   * Draft invoices reserve billable capacity against duplicate draft creation,
   * but do not post revenue or update the order's official invoice_status.
   */
  async createFromSO(
    companyId: string,
    salesOrderId: string,
    dto?: Partial<CreateInvoiceFromSoDto>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Concurrency Coordination: Acquire an exclusive row-level lock (FOR UPDATE)
      // on the parent Sales Order before calculating billable capacity.
      if (typeof (tx as any).$executeRaw === 'function') {
        await (tx as any).$executeRaw`SELECT 1 FROM "SalesOrder" WHERE id = ${salesOrderId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // 2. Fetch Sales Order with its items, active invoices, deliveries, and customer
      const so = await tx.salesOrder.findFirst({
        where: { id: salesOrderId, company_id: companyId },
        include: {
          items: true,
          customer: true,
          deliveries: {
            where: { status: { not: 'CANCELLED' } },
            include: { items: true },
          },
          invoices: {
            where: { status: { notIn: ['CANCELLED', 'VOID'] } },
            include: { items: true },
          },
        },
      });

      if (!so) throw new NotFoundException('Sales order not found');

      // 3. Compute metrics: delivered, posted billing, and draft reservations
      const {
        postedBilledMap,
        effectiveInvoicedMap,
        deliveredMap,
        hasDeliveries,
      } = this.computeOrderBillingMetrics(so);

      // Determine requested items or default to full remaining billable quantities
      const requestedItems = dto?.items;
      const invoiceItemsData: any[] = [];
      let calculatedSubtotal = 0;
      let calculatedTax = 0;

      if (requestedItems && requestedItems.length > 0) {
        for (const req of requestedItems) {
          const soItem = so.items.find((i: any) => i.product_id === req.productId);
          if (!soItem) {
            throw new BadRequestException(
              `Product ${req.productId} is not part of Sales Order ${so.order_number}`,
            );
          }

          const reqQty = this.roundQty(req.qty);
          if (reqQty <= 0) {
            throw new BadRequestException(
              `Invoice quantity for product ${req.productId} must be greater than zero`,
            );
          }

          // Workstream 2 consistent billing policy:
          // In standard sales workflows, when deliveries have begun (hasDeliveries = true),
          // billing capacity is governed by delivered physical stock.
          // However, if an upfront/advance order-based invoice was already created or posted prior
          // to delivery, the order allows billing up to max(deliveredQty, orderBilledQty) without
          // double-counting or artificially reducing eligible delivered lines.
          const alreadyBilledOrReserved = effectiveInvoicedMap[req.productId] || 0;
          const deliveredQty = deliveredMap[req.productId] || 0;
          const postedBilledQty = postedBilledMap[req.productId] || 0;

          const eligibleCapacity = hasDeliveries
            ? Math.max(deliveredQty, postedBilledQty)
            : this.roundQty(soItem.qty);

          const remainingBillable = this.roundQty(
            Math.max(0, eligibleCapacity - alreadyBilledOrReserved),
          );

          if (reqQty > remainingBillable) {
            const basis = hasDeliveries ? 'delivered' : 'ordered';
            throw new BadRequestException(
              `Cannot invoice ${reqQty} for product ${req.productId}. Only ${remainingBillable} remaining eligible based on ${basis} quantity.`,
            );
          }

          const unitPrice =
            req.unitPrice !== undefined
              ? Number(req.unitPrice)
              : Number(soItem.unit_price);
          const discount = Number(req.discount ?? 0);
          const lineTax = Number(req.tax ?? 0);
          const lineSubtotal = this.roundMoney(reqQty * unitPrice - discount);

          invoiceItemsData.push({
            product_id: req.productId,
            description: req.description || soItem.product_id,
            qty: reqQty,
            unit_price: unitPrice,
            discount,
            tax: lineTax,
            subtotal: lineSubtotal,
          });

          calculatedSubtotal += lineSubtotal;
          calculatedTax += lineTax;
        }
      } else {
        // Auto-populate from remaining billable quantities
        for (const soItem of so.items) {
          const alreadyBilledOrReserved = effectiveInvoicedMap[soItem.product_id] || 0;
          const deliveredQty = deliveredMap[soItem.product_id] || 0;
          const postedBilledQty = postedBilledMap[soItem.product_id] || 0;

          const eligibleCapacity = hasDeliveries
            ? Math.max(deliveredQty, postedBilledQty)
            : this.roundQty(soItem.qty);

          const remainingBillable = this.roundQty(
            Math.max(0, eligibleCapacity - alreadyBilledOrReserved),
          );

          if (remainingBillable > 0) {
            const lineSubtotal = this.roundMoney(remainingBillable * soItem.unit_price);

            invoiceItemsData.push({
              product_id: soItem.product_id,
              description: soItem.product_id,
              qty: remainingBillable,
              unit_price: soItem.unit_price,
              discount: 0,
              tax: 0,
              subtotal: lineSubtotal,
            });

            calculatedSubtotal += lineSubtotal;
          }
        }
      }

      if (invoiceItemsData.length === 0) {
        throw new BadRequestException(
          'Sales order is fully invoiced or has no eligible billable items',
        );
      }

      // Server-side monetary rounding
      calculatedSubtotal = this.roundMoney(calculatedSubtotal);
      calculatedTax = this.roundMoney(calculatedTax);
      const total = this.roundMoney(calculatedSubtotal + calculatedTax);

      // 4. Document Sequence Numbering
      const invoiceNumber = await this.sequenceService.generateNumber(
        tx,
        companyId,
        'INVOICE',
        'INV',
      );

      // Payment terms & due date calculation
      const invoiceDate = dto?.invoiceDate
        ? new Date(dto.invoiceDate)
        : new Date();
      const terms = dto?.paymentTerms || so.payment_terms || 'net30';
      const days =
        terms === 'net15'
          ? 15
          : terms === 'net60'
            ? 60
            : terms === 'cod'
              ? 0
              : 30;
      const dueDate = dto?.dueDate
        ? new Date(dto.dueDate)
        : new Date(invoiceDate.getTime() + days * 24 * 60 * 60 * 1000);

      // 5. Create Invoice in DRAFT status
      // Note: Draft invoice reserves billable capacity, but does NOT update so.invoice_status.
      const invoice = await tx.invoice.create({
        data: {
          company_id: companyId,
          type: 'AR',
          sales_order_id: so.id,
          customer_id: so.customer_id || '',
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: dueDate,
          payment_terms: terms,
          currency: so.currency || 'IDR',
          status: 'DRAFT',
          subtotal: calculatedSubtotal,
          discount_percent: 0,
          discount_amount: 0,
          tax: calculatedTax,
          total,
          paid_amount: 0,
          remaining_amount: total,
          memo: dto?.notes || so.memo || undefined,
          items: {
            create: invoiceItemsData,
          },
        },
        include: { items: true, customer: true },
      });

      return invoice;
    });
  }

  async createDirect(companyId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber =
        data.invoice_number ||
        (await this.sequenceService.generateNumber(
          tx,
          companyId,
          'INVOICE',
          'INV',
        ));
      const invoiceDate = data.invoice_date
        ? new Date(data.invoice_date)
        : new Date();
      let dueDate = data.due_date ? new Date(data.due_date) : null;
      if (!dueDate && data.payment_terms) {
        const days =
          data.payment_terms === 'net15'
            ? 15
            : data.payment_terms === 'net60'
              ? 60
              : data.payment_terms === 'cod'
                ? 0
                : 30;
        dueDate = new Date(invoiceDate.getTime() + days * 24 * 60 * 60 * 1000);
      }

      const items = (data.items || []).map((item: any) => {
        const qty = this.roundQty(item.qty || 1);
        if (qty <= 0) {
          throw new BadRequestException('Item quantity must be greater than zero');
        }
        const unit_price = Number(item.unit_price || item.price || 0);
        const discount = Number(item.discount || 0);
        const tax = Number(item.tax || 0);
        const subtotal = this.roundMoney(qty * unit_price - discount);
        return {
          product_id: item.product_id || item.product,
          description: item.description || item.desc || '',
          qty,
          unit_price,
          discount,
          tax,
          subtotal,
        };
      });

      if (items.length === 0) {
        throw new BadRequestException('Invoice must contain at least one item');
      }

      const subtotal = this.roundMoney(
        items.reduce((acc: number, curr: any) => acc + curr.subtotal, 0),
      );
      const discountPercent = Number(data.discount_percent || 0);
      const discountAmount = this.roundMoney(
        Number(data.discount_amount || (subtotal * discountPercent) / 100 || 0),
      );
      const tax = this.roundMoney(Number(data.tax || 0));
      const total = this.roundMoney(subtotal - discountAmount + tax);
      const paidAmount = Number(data.paid_amount || 0);
      const remainingAmount = this.roundMoney(total - paidAmount);

      return tx.invoice.create({
        data: {
          company_id: companyId,
          type: 'AR',
          customer_id: data.customer_id || data.partner_id || undefined,
          sales_order_id: data.sales_order_id || undefined,
          purchase_order_id: data.purchase_order_id || undefined,
          email: data.email || undefined,
          billing_address: data.billing_address || undefined,
          payment_terms: data.payment_terms || 'net30',
          warehouse_id: data.warehouse_id || undefined,
          tag: data.tag || undefined,
          client_ref: data.client_ref || undefined,
          message: data.message || undefined,
          memo: data.memo || undefined,
          currency: data.currency || 'IDR',
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: dueDate,
          status: 'DRAFT',
          subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          tax,
          total,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          items: {
            create: items,
          },
        },
        include: { items: true, customer: true },
      });
    });
  }

  /**
   * Post an invoice. Validates billable capacity against posted billing, marks status as POSTED,
   * updates parent Sales Order invoice status, and emits invoice.posted for GL posting.
   */
  async post(companyId: string, invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, company_id: companyId },
        include: { items: true },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT invoice can be posted');

      // If tied to Sales Order, re-validate capacity with row lock against other POSTED invoices
      if (invoice.sales_order_id) {
        if (typeof (tx as any).$executeRaw === 'function') {
          await (tx as any).$executeRaw`SELECT 1 FROM "SalesOrder" WHERE id = ${invoice.sales_order_id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        }

        const so = await tx.salesOrder.findFirst({
          where: { id: invoice.sales_order_id, company_id: companyId },
          include: {
            items: true,
            deliveries: {
              where: { status: { not: 'CANCELLED' } },
              include: { items: true },
            },
            invoices: {
              where: {
                id: { not: invoiceId },
                status: { in: ['POSTED', 'PARTIALLY PAID', 'PAID'] },
              },
              include: { items: true },
            },
          },
        });

        if (so) {
          const { postedBilledMap, deliveredMap, hasDeliveries } =
            this.computeOrderBillingMetrics(so);

          for (const item of invoice.items) {
            const soItem = so.items.find((i: any) => i.product_id === item.product_id);
            if (soItem) {
              const itemQty = this.roundQty(item.qty);
              const deliveredQty = deliveredMap[item.product_id] || 0;
              const alreadyPosted = postedBilledMap[item.product_id] || 0;

              const eligibleCapacity = hasDeliveries
                ? Math.max(deliveredQty, alreadyPosted)
                : this.roundQty(soItem.qty);

              const remaining = this.roundQty(
                Math.max(0, eligibleCapacity - alreadyPosted),
              );

              if (itemQty > remaining) {
                throw new BadRequestException(
                  `Cannot post invoice: item quantity (${itemQty}) for product ${item.product_id} exceeds remaining billable capacity (${remaining}).`,
                );
              }
            }
          }
        }
      }

      // Concurrency claim on DRAFT status
      const updatedRes = await tx.invoice.updateMany({
        where: { id: invoiceId, status: 'DRAFT' },
        data: { status: 'POSTED' },
      });
      if (updatedRes.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict or Invoice is no longer DRAFT',
        );
      }
      const updated = await tx.invoice.findUnique({ where: { id: invoiceId } });

      if (invoice.sales_order_id) {
        await this.recalculateSoInvoiceStatus(tx, invoice.sales_order_id);
      }

      const postingType =
        invoice.type === 'AR' || invoice.type === 'SALES_INVOICE'
          ? 'SALES_INVOICE'
          : invoice.type || 'SALES_INVOICE';

      // Emit domain event for General Ledger posting
      await this.eventEmitter.emitAsync(
        'invoice.posted',
        new InvoicePostedEvent(
          companyId,
          invoice.id,
          `VAL-INV-${invoice.id}`,
          new Date(),
          {
            type: postingType as any,
            totalAmount: invoice.total,
          },
          tx as any,
        ),
      );

      return updated;
    });
  }

  /**
   * Cancel an invoice. Checks that no payments are allocated before voiding/cancelling.
   * - Cancelling a DRAFT releases its reservation.
   * - Cancelling a POSTED invoice emits an exact offsetting reversal entry.
   */
  async cancel(companyId: string, invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, company_id: companyId },
        include: {
          PaymentAllocation: true,
          payments: true,
        },
      });

      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        throw new BadRequestException('Invoice is already cancelled');
      }

      // Guard: Check payment allocations
      const activeAllocations = (invoice.PaymentAllocation || []).filter(
        (a: any) => a.amount > 0,
      );
      if (activeAllocations.length > 0 || (invoice.payments && invoice.payments.length > 0)) {
        throw new BadRequestException(
          'Cannot cancel invoice: active payments or payment allocations exist for this invoice. Please unallocate or void payments first.',
        );
      }

      const originalStatus = invoice.status;

      // Concurrency claim on cancel
      const cancelClaim = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          company_id: companyId,
          status: { in: ['DRAFT', 'POSTED'] },
        },
        data: { status: 'CANCELLED' },
      });

      if (cancelClaim.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict: invoice status changed before cancellation',
        );
      }

      // If posted, reverse the AR/Revenue entry
      if (originalStatus === 'POSTED') {
        await this.eventEmitter.emitAsync(
          'invoice.posted',
          new InvoicePostedEvent(
            companyId,
            invoice.id,
            `VAL-INV-REV-${invoice.id}`,
            new Date(),
            {
              type: 'SALES_RETURN_REVENUE', // In AccountingListener: Dr Sales Return/Revenue, Cr AR
              totalAmount: invoice.total,
            },
            tx as any,
          ),
        );
      }

      // Recalculate parent SO invoice status (releases posted billing or draft reservation)
      if (invoice.sales_order_id) {
        await this.recalculateSoInvoiceStatus(tx, invoice.sales_order_id);
      }

      return tx.invoice.findUnique({ where: { id: invoiceId } });
    });
  }
}
