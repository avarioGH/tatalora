import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getPipelineMetrics(companyId: string) {
    const opps = await this.prisma.opportunity.findMany({
      where: {
        company_id: companyId,
      },
    });
    const total = opps.length;
    const open = opps.filter((o) => o.stage !== 'WON' && o.stage !== 'LOST');
    const won = opps.filter((o) => o.stage === 'WON');
    const lost = opps.filter((o) => o.stage === 'LOST');

    let expectedRevenue = 0;
    let weightedPipeline = 0;
    let wonRevenue = 0;

    opps.forEach((o) => {
      if (o.stage !== 'LOST') {
        expectedRevenue += o.expected_value;
        weightedPipeline += (o.expected_value * o.probability) / 100;
      }
      if (o.stage === 'WON') wonRevenue += o.expected_value;
    });

    const conversionRate = total > 0 ? (won.length / total) * 100 : 0;
    const avgDealSize = won.length > 0 ? wonRevenue / won.length : 0;

    return {
      totalOpportunities: total,
      openOpportunities: open.length,
      won: won.length,
      lost: lost.length,
      conversionRate,
      expectedRevenue,
      weightedPipeline,
      avgDealSize,
    };
  }

  async getSalespersonMetrics(companyId: string) {
    const opps = await this.prisma.opportunity.findMany({
      where: {
        company_id: companyId,
      },
    });
    const map = new Map<string, any>();

    opps.forEach((o) => {
      const user = o.assigned_user || 'Unassigned';
      if (!map.has(user)) {
        map.set(user, {
          user,
          opportunities: 0,
          won: 0,
          lost: 0,
          revenue: 0,
          weightedPipeline: 0,
        });
      }
      const data = map.get(user);
      data.opportunities++;
      if (o.stage === 'WON') {
        data.won++;
        data.revenue += o.expected_value;
      } else if (o.stage === 'LOST') {
        data.lost++;
      } else {
        data.weightedPipeline += (o.expected_value * o.probability) / 100;
      }
    });

    return Array.from(map.values()).map((d) => ({
      ...d,
      winRate: d.opportunities > 0 ? (d.won / d.opportunities) * 100 : 0,
      avgDealValue: d.won > 0 ? d.revenue / d.won : 0,
    }));
  }

  async getSourceMetrics(companyId: string) {
    const opps = await this.prisma.opportunity.findMany({
      where: {
        company_id: companyId,
      },
    });
    const map = new Map<string, any>();

    opps.forEach((o) => {
      const source = (o as any).source || 'UNKNOWN';
      if (!map.has(source)) {
        map.set(source, { source, opportunities: 0, won: 0, revenue: 0 });
      }
      const data = map.get(source);
      data.opportunities++;
      if (o.stage === 'WON') {
        data.won++;
        data.revenue += o.expected_value;
      }
    });

    return Array.from(map.values()).map((d) => ({
      ...d,
      wonRate: d.opportunities > 0 ? (d.won / d.opportunities) * 100 : 0,
    }));
  }

  async getFunnelMetrics(companyId: string) {
    const leads = await this.prisma.lead.count({
      where: {
        company_id: companyId,
      },
    });
    const qualifiedLeads = await this.prisma.lead.count({
      where: {
        company_id: companyId,
        status: { in: ['QUALIFIED', 'CONVERTED'] },
      },
    });
    const opportunities = await this.prisma.opportunity.count({
      where: {
        company_id: companyId,
      },
    });
    const quotations = await (this.prisma as any).quotation.count({
      where: {
        company_id: companyId,
        opportunity_id: { not: null } as any,
      },
    });
    const orders = await this.prisma.salesOrder.count({
      where: {
        company_id: companyId,
        quotation: { opportunity_id: { not: null } as any } as any,
      },
    });
    const wonOpps = await this.prisma.opportunity.count({
      where: {
        company_id: companyId,
        stage: 'WON',
      },
    });

    return {
      leads,
      qualified: qualifiedLeads,
      opportunities,
      quotations,
      orders,
      won: wonOpps,
    };
  }
}
