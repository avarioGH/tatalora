import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto, ReportResultDto } from '../report.types';

@Injectable()
export class SalesReportService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(filters: ReportFilterDto): Promise<ReportResultDto> {
    const where: any = {
      company_id: filters.company_id,
      status: 'POSTED',
      type: 'AR',
    };
    if (filters.start_date || filters.end_date) {
      where.invoice_date = {};
      if (filters.start_date)
        where.invoice_date.gte = new Date(filters.start_date);
      if (filters.end_date) where.invoice_date.lte = new Date(filters.end_date);
    }
    if (filters.customer_id) where.customer_id = filters.customer_id;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { customer: true, sales_order: true },
    });

    let total = 0;
    let totalTax = 0;
    let netSales = 0;

    const data = invoices
      .filter((inv) => !inv.sales_order?.pos_shift_id)
      .map((inv) => {
        total += inv.total;
        totalTax += inv.tax;
        netSales += inv.subtotal;
        return {
          invoice_number: inv.invoice_number,
          date: inv.invoice_date.toISOString().split('T')[0],
          customer: inv.customer?.name || '-',
          subtotal: inv.subtotal,
          tax: inv.tax,
          total: inv.total,
        };
      });

    return {
      title: 'Sales Report',
      columns: [
        { header: 'Invoice Number', key: 'invoice_number' },
        { header: 'Date', key: 'date', type: 'date' },
        { header: 'Customer', key: 'customer' },
        { header: 'Subtotal (Net)', key: 'subtotal', type: 'currency' },
        { header: 'Tax', key: 'tax', type: 'currency' },
        { header: 'Total (Gross)', key: 'total', type: 'currency' },
      ],
      data,
      totals: { subtotal: netSales, tax: totalTax, total: total },
    };
  }

  async getGrossMarginReport(
    filters: ReportFilterDto,
  ): Promise<ReportResultDto> {
    const where: any = {
      company_id: filters.company_id,
      status: 'POSTED',
      type: 'AR',
    };
    if (filters.start_date || filters.end_date) {
      where.invoice_date = {};
      if (filters.start_date)
        where.invoice_date.gte = new Date(filters.start_date);
      if (filters.end_date) where.invoice_date.lte = new Date(filters.end_date);
    }
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { customer: true, sales_order: true },
    });

    let totalRevenue = 0;
    let data: any[] = [];

    const validInvoices = invoices.filter(
      (inv) => !inv.sales_order?.pos_shift_id,
    );
    for (const inv of validInvoices) {
      totalRevenue += inv.subtotal; // revenue is net of tax

      // Need COGS. The source of truth for COGS is the FIFO layers consumed.
      // But we can get COGS from the Journal Entry created for this invoice/delivery.
      // Wait, Sales COGS is recorded on Delivery, not Invoice.
      // Let's just find the delivery for this invoice's sales order.
      let cogs = 0;
      if (inv.sales_order_id) {
        const deliveries = await this.prisma.deliveryOrder.findMany({
          where: { sales_order_id: inv.sales_order_id, status: 'DELIVERED' },
          include: { items: true },
        });
        for (const del of deliveries) {
          const movs = await this.prisma.stockMovement.findMany({
            where: { transaction_id: del.id, movement_type: 'OUT' },
          });
          cogs += movs.reduce((sum, m) => sum + m.total_cost, 0);
        }
      }

      data.push({
        invoice_number: inv.invoice_number,
        customer: inv.customer?.name || '-',
        revenue: inv.subtotal,
        cogs,
        margin: inv.subtotal - cogs,
      });
    }

    let sumRev = 0,
      sumCogs = 0,
      sumMargin = 0;
    data.forEach((d) => {
      sumRev += d.revenue;
      sumCogs += d.cogs;
      sumMargin += d.margin;
    });

    return {
      title: 'Gross Margin Report',
      columns: [
        { header: 'Invoice Number', key: 'invoice_number' },
        { header: 'Customer', key: 'customer' },
        { header: 'Revenue', key: 'revenue', type: 'currency' },
        { header: 'COGS', key: 'cogs', type: 'currency' },
        { header: 'Gross Margin', key: 'margin', type: 'currency' },
      ],
      data,
      totals: { revenue: sumRev, cogs: sumCogs, margin: sumMargin },
    };
  }
}
