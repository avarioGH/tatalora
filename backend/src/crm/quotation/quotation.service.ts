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

  async send(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.status !== 'DRAFT') {
      throw new BadRequestException(`Hanya penawaran berstatus DRAFT yang dapat dikirim (Status saat ini: ${q.status})`);
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async accept(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.status !== 'SENT' && q.status !== 'DRAFT') {
      throw new BadRequestException(`Hanya penawaran berstatus SENT atau DRAFT yang dapat disetujui pelanggan (Status: ${q.status})`);
    }

    // Check expiration
    if (q.expiration_date && new Date(q.expiration_date) < new Date()) {
      await this.prisma.quotation.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Masa berlaku penawaran telah kadaluarsa (EXPIRED)');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
  }

  async reject(companyId: string, id: string, reason?: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.status === 'CONVERTED' || q.status === 'CONFIRMED') {
      throw new BadRequestException('Penawaran yang telah dikonversi ke Sales Order tidak dapat ditolak');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: reason ? `${q.notes || ''} [REASON: ${reason}]`.trim() : q.notes,
      },
    });
  }

  async expire(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.status === 'CONVERTED' || q.status === 'CONFIRMED') {
      throw new BadRequestException('Penawaran yang telah dikonversi tidak dapat ditandai kadaluarsa');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });
  }

  async confirm(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const q = await tx.quotation.findFirst({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!q) throw new NotFoundException('Quotation not found');

      // Rule: Can be converted from ACCEPTED, SENT, or legacy CONFIRMED/DRAFT if permitted,
      // but strictly NOT from CONVERTED, REJECTED, EXPIRED, or CANCELLED
      if (q.status === 'CONVERTED' || q.status === 'CONFIRMED') {
        throw new BadRequestException('Quotation has already been converted to a Sales Order');
      }
      if (q.status === 'REJECTED') {
        throw new BadRequestException('Penawaran yang telah ditolak (REJECTED) tidak dapat dikonversi');
      }
      if (q.status === 'EXPIRED') {
        throw new BadRequestException('Penawaran yang telah kadaluarsa (EXPIRED) tidak dapat dikonversi');
      }
      if (q.status === 'CANCELLED') {
        throw new BadRequestException('Penawaran yang telah dibatalkan tidak dapat dikonversi');
      }

      // Check expiration date
      if (q.expiration_date && new Date(q.expiration_date) < new Date()) {
        await tx.quotation.update({
          where: { id: q.id },
          data: { status: 'EXPIRED' },
        });
        throw new BadRequestException('Masa berlaku penawaran telah kadaluarsa (EXPIRED)');
      }

      const existingSo = await tx.salesOrder.findFirst({
        where: { quotation_id: q.id },
      });
      if (existingSo) {
        throw new BadRequestException(
          'Sales order already generated for this quotation',
        );
      }

      // Atomic state change to prevent race conditions / duplicate conversion
      const updateResult = await tx.quotation.updateMany({
        where: { id: q.id, company_id: companyId, status: { notIn: ['CONVERTED', 'CONFIRMED'] } },
        data: { status: 'CONVERTED' },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Quotation already converted or concurrently modified');
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

  async update(companyId: string, id: string, data: any) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Quotation not found');

    return this.prisma.$transaction(async (tx) => {
      if (Array.isArray(data.items) && data.items.length > 0) {
        await tx.quotationItem.deleteMany({
          where: { quotation_id: id },
        });

        let totalAmount = 0;
        const newItems: any[] = [];
        for (const it of data.items) {
          const qty = Number(it.qty || it.quantity) || 1;
          const unitPrice = Number(it.unit_price || it.unitPrice || it.price) || 0;
          const subtotal = qty * unitPrice;
          totalAmount += subtotal;

          newItems.push({
            quotation_id: id,
            product_id: it.product_id || it.productId,
            description: it.description || '',
            qty,
            unit_price: unitPrice,
            subtotal,
          });
        }

        await tx.quotationItem.createMany({
          data: newItems,
        });

        data.total_amount = totalAmount;
      }

      return tx.quotation.update({
        where: { id },
        data: {
          customer_id: data.customer_id || data.customerId || existing.customer_id,
          status: data.status || existing.status,
          total_amount: data.total_amount !== undefined ? Number(data.total_amount) : existing.total_amount,
          notes: data.notes !== undefined ? data.notes : existing.notes,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }

  async delete(companyId: string, id: string) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Quotation not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({
        where: { quotation_id: id },
      });
      await tx.quotation.delete({
        where: { id },
      });
      return { success: true, message: `Quotation ${existing.quotation_number} deleted successfully` };
    });
  }
}
