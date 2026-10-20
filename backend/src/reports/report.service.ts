import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async getSalesData(companyId: string, startDate?: string, endDate?: string) {
    const where: any = { company_id: companyId };
    if (startDate && endDate) {
      where.created_at = { gte: new Date(startDate), lt: new Date(endDate) };
    }

    const orders = await this.prisma.salesOrder.findMany({
      where,
      include: { customer: true },
    });

    return {
      title: 'Sales Order Report',
      columns: [
        { header: 'Order Number', key: 'order_number' },
        { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customer' },
        { header: 'Status', key: 'status' },
        { header: 'Total', key: 'total' },
      ],
      data: orders.map((o) => ({
        order_number: o.id,
        date: o.created_at.toISOString().split('T')[0],
        customer: o.customer?.name || '-',
        status: o.status,
        total: o.total_amount,
      })),
    };
  }

  async getFinancialData(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { company_id: companyId };
    if (startDate && endDate) {
      where.journal_date = { gte: new Date(startDate), lt: new Date(endDate) };
    }

    const entries = await this.prisma.journalEntryItem.findMany({
      where: { journal_entry: where },
      include: { journal_entry: true, account: true },
    });

    return {
      title: 'General Ledger Report',
      columns: [
        { header: 'Date', key: 'date' },
        { header: 'Journal', key: 'journal' },
        { header: 'Account', key: 'account' },
        { header: 'Debit', key: 'debit' },
        { header: 'Credit', key: 'credit' },
      ],
      data: entries.map((e) => ({
        date: e.journal_entry.journal_date.toISOString().split('T')[0],
        journal: e.journal_entry.journal_no,
        account: e.account.account_name,
        debit: e.debit,
        credit: e.credit,
      })),
    };
  }
}
