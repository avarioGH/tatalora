import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceExchangeService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const transactionNo =
        data.transaction_no ||
        'TF/' + new Date().getFullYear() + '/' + Date.now().toString().slice(-5);
      const transactionDate = data.transaction_date
        ? new Date(data.transaction_date)
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
        dueDate = new Date(transactionDate.getTime() + days * 24 * 60 * 60 * 1000);
      }

      const items = (data.items || []).map((it: any) => ({
        invoice_id: it.invoice_id,
        description: it.description || '',
        due_date: it.due_date ? new Date(it.due_date) : null,
        status: it.status || 'UNPAID',
        invoice_amount: Number(it.invoice_amount || it.total || 0),
        remaining_amount: Number(it.remaining_amount || 0),
      }));

      const totalAmount = items.reduce(
        (acc: number, curr: any) => acc + curr.remaining_amount,
        0,
      );

      const exchange = await (tx as any).invoiceExchange.create({
        data: {
          company_id: companyId,
          customer_id: data.customer_id,
          transaction_no: transactionNo,
          transaction_date: transactionDate,
          due_date: dueDate,
          payment_terms: data.payment_terms || 'net30',
          email: data.email || null,
          billing_address: data.billing_address || null,
          message: data.message || null,
          memo: data.memo || null,
          total_amount: totalAmount,
          status: data.status || 'DRAFT',
          items: {
            create: items,
          },
        },
        include: { items: true },
      });

      return exchange;
    });
  }

  async findAll(companyId: string) {
    return (this.prisma as any).invoiceExchange.findMany({
      where: { company_id: companyId },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const exchange = await (this.prisma as any).invoiceExchange.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });
    if (!exchange) throw new NotFoundException('Tukar Faktur tidak ditemukan');
    return exchange;
  }
}
