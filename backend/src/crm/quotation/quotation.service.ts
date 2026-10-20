import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequenceService } from '../../reports/sequence.service';

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
  ) {}

  async create(companyId: string, data: any) {
    const customerId = data.customerId || data.customer_id;
    const quotationDate = data.quotationDate || data.quotation_date || new Date().toISOString();
    const expirationDate = data.expirationDate || data.expiration_date || data.dueDate || data.due_date;
    const items = data.items || [];
    const notes = data.notes;
    const billingAddress = data.billingAddress || data.billing_address;
    const deliveryAddress = data.deliveryAddress || data.delivery_address;
    const paymentTerms = data.paymentTerms || data.payment_terms;
    const quotationNumber = data.quotationNumber || data.quotation_number || `QTN-${Date.now()}`;
    const email = data.email;
    const tag = data.tag;
    const clientRef = data.clientRef || data.client_ref;
    const currency = data.currency || 'IDR';
    const message = data.message;
    const memo = data.memo;
    const discountPercent = Number(data.discount_percent || data.discountPercent || 0);
    const discountAmount = Number(data.discount_amount || data.discountAmount || 0);
    const tax = Number(data.tax || 0);
    const status = data.status || 'DRAFT';

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer || customer.company_id !== companyId) {
      throw new BadRequestException('Invalid customer');
    }

    let calculatedSubtotal = 0;
    const itemsData = items.map((item: any) => {
      const qty = Number(item.qty || 1);
      const unitPrice = Number(item.price || item.unit_price || 0);
      const sub = qty * unitPrice;
      const taxRate = Number(item.taxRate || item.tax_rate || 0);
      const itemTax = Number(item.tax || sub * taxRate);
      const discount = Number(item.discount || 0);
      const lineTotal = Number(item.subtotal || sub + itemTax - discount);
      calculatedSubtotal += sub;
      return {
        product_id: item.productId || item.product_id,
        description: item.description || '',
        qty: qty,
        unit: item.unit || 'Pcs',
        unit_price: unitPrice,
        discount: discount,
        tax: itemTax,
        subtotal: lineTotal,
      };
    });

    const subtotal = Number(data.subtotal || calculatedSubtotal);
    const totalAmount = Number(data.total || data.total_amount || (subtotal - discountAmount + tax));

    return this.prisma.quotation.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        quotation_number: quotationNumber,
        quotation_date: new Date(quotationDate),
        expiration_date: expirationDate ? new Date(expirationDate) : null,
        status: status,
        total_amount: totalAmount,
        notes,
        billing_address: billingAddress,
        delivery_address: deliveryAddress,
        payment_terms: paymentTerms,
        email,
        tag,
        client_ref: clientRef,
        currency,
        message,
        memo,
        subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax,
        items: {
          create: itemsData,
        },
      },
      include: { items: true, customer: true },
    });
  }

  async findAll(companyId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where: { company_id: companyId },
        include: { customer: true },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.quotation.count({ where: { company_id: companyId } }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
      include: {
        items: { include: { product: true } },
        customer: true,
        sales_orders: { include: { invoices: true, deliveries: true } },
      },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async confirm(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const q = await tx.quotation.findFirst({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!q) throw new NotFoundException('Quotation not found');
      if (q.status === 'CONFIRMED')
        throw new BadRequestException('Quotation already confirmed');

      const existingSo = await tx.salesOrder.findFirst({
        where: { quotation_id: q.id },
      });
      if (existingSo)
        throw new BadRequestException(
          'Sales order already generated for this quotation',
        );

      // Atomic state change to prevent race conditions / duplicate conversion
      const updateResult = await tx.quotation.updateMany({
        where: { id: q.id, company_id: companyId, status: { not: 'CONFIRMED' } },
        data: { status: 'CONFIRMED' },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Quotation already confirmed or concurrently modified');
      }

      // Generate sequence using canonical SequenceService
      const soNo = await this.sequenceService.generateNumber(
        tx,
        companyId,
        'SALES_ORDER',
        'SO',
      );

      const so = await tx.salesOrder.create({
        data: {
          company_id: companyId,
          quotation_id: q.id,
          customer_id: q.customer_id,
          order_number: soNo,
          order_date: new Date(),
          status: 'CONFIRMED',
          delivery_status: 'PENDING',
          invoice_status: 'PENDING',
          payment_status: 'UNPAID',
          payment_method: 'TERM',
          payment_terms: q.payment_terms || 'net30',
          subtotal: q.subtotal,
          discount_percent: q.discount_percent,
          discount_amount: q.discount_amount,
          tax: q.tax,
          total_amount: q.total_amount,
          notes: q.notes,
          billing_address: q.billing_address,
          delivery_address: q.delivery_address,
          email: q.email,
          tag: q.tag,
          client_ref: q.client_ref,
          currency: q.currency || 'IDR',
          message: q.message,
          memo: q.memo,
          ecommerce_session_id: 'QUOTATION_' + q.id,
          items: {
            create: q.items.map((item) => ({
              product_id: item.product_id,
              qty: item.qty,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      return so;
    });
  }

  async cancel(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.status === 'CONFIRMED') throw new BadRequestException('Cannot cancel confirmed quotation');
    
    return this.prisma.quotation.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
  }
}
