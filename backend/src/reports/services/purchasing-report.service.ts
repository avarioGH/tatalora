import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto, ReportResultDto } from '../report.types';

@Injectable()
export class PurchasingReportService {
  constructor(private prisma: PrismaService) {}

  async getPurchasingReport(
    filters: ReportFilterDto,
  ): Promise<ReportResultDto> {
    const where: any = { company_id: filters.company_id, type: 'AP' };
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { supplier: true },
    });

    return {
      title: 'Purchasing Report',
      columns: [
        { header: 'Invoice Number', key: 'invoice_number' },
        { header: 'Supplier', key: 'supplier' },
        { header: 'Total', key: 'total', type: 'currency' },
      ],
      data: invoices.map((i) => ({
        invoice_number: i.invoice_number,
        supplier: i.supplier?.name || '-',
        total: i.total,
      })),
    };
  }
}
