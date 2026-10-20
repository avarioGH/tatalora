import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto, ReportResultDto } from '../report.types';

@Injectable()
export class CrmReportService {
  constructor(private prisma: PrismaService) {}

  async getCrmFunnel(filters: ReportFilterDto): Promise<ReportResultDto> {
    const opportunities = await this.prisma.opportunity.findMany({
      where: { company_id: filters.company_id },
    });

    const byStage: Record<string, number> = {};
    opportunities.forEach((o) => {
      byStage[o.stage] = (byStage[o.stage] || 0) + 1;
    });

    return {
      title: 'CRM Funnel',
      columns: [
        { header: 'Stage', key: 'stage' },
        { header: 'Count', key: 'count', type: 'number' },
      ],
      data: Object.keys(byStage).map((k) => ({ stage: k, count: byStage[k] })),
    };
  }
}
