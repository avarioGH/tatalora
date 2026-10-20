import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // ============================
  // LEADS
  // ============================
  async getLeads(companyId: string) {
    return this.prisma.lead.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      include: { opportunities: true, activities: true },
    });
  }

  async getLead(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, company_id: companyId },
      include: { opportunities: true, activities: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(companyId: string, data: any) {
    if (data.idempotency_key) {
      const existing = await this.prisma.lead.findFirst({
        where: { company_id: companyId },
      });
      if (existing) return existing;
    }
    return this.prisma.lead.create({
      data: {
        company_id: companyId,
        lead_code: data.lead_code || `LD-${Date.now()}`,
        name: data.name,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        source: data.source || 'MANUAL',
        assigned_user: data.assigned_user,
        status: data.status || 'NEW',
        expected_value: data.expected_value ? Number(data.expected_value) : 0,
        notes: data.notes,
        // idempotency_key: data.idempotency_key
      },
    });
  }

  async updateLead(companyId: string, id: string, data: any) {
    return this.prisma.lead.update({
      where: { id, company_id: companyId },
      data,
    });
  }

  async convertLead(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, company_id: companyId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updateRes = await this.prisma.lead.updateMany({
      where: { id, company_id: companyId, status: { not: 'CONVERTED' } },
      data: { status: 'CONVERTED' },
    });

    if (updateRes.count === 0) {
      throw new BadRequestException('Lead already converted');
    }

    return this.prisma.$transaction(async (tx) => {
      let customerId: string | undefined;
      let existingCustomer: any = null;

      if (lead.email || lead.phone) {
        existingCustomer = await tx.customer.findFirst({
          where: {
            company_id: companyId,
            OR: [
              { email: lead.email || 'non-existent' },
              { phone: lead.phone || 'non-existent' },
            ],
          },
        });
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCust = await tx.customer.create({
          data: {
            company_id: companyId,
            code: `CUST-${Date.now()}`,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            address: '',
          },
        });
        customerId = newCust.id;
      }

      const opp = await tx.opportunity.create({
        data: {
          company_id: companyId,
          title: `Opp: ${lead.name}`,
          customer_id: customerId,
          lead_id: lead.id,
          expected_value: lead.expected_value,
          probability: 20,
          stage: 'QUALIFICATION',
          assigned_user: lead.assigned_user,
          // source: lead.source
        },
      });

      return {
        lead: await tx.lead.findFirst({ where: { id } }),
        opportunity: opp,
        existingCustomerFound: !!existingCustomer,
      };
    });
  }

  // ============================
  // OPPORTUNITIES
  // ============================
  async getOpportunities(companyId: string) {
    return this.prisma.opportunity.findMany({
      where: { company_id: companyId },
      include: { customer: true, lead: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getOpportunity(companyId: string, id: string) {
    return this.prisma.opportunity.findFirst({
      where: { id, company_id: companyId },
      include: { customer: true, activities: true, lead: true },
    });
  }

  async createOpportunity(companyId: string, data: any) {
    if (data.idempotency_key) {
      const existing = await this.prisma.opportunity.findFirst({
        where: { company_id: companyId },
      });
      if (existing) return existing;
    }
    return this.prisma.opportunity.create({
      data: {
        company_id: companyId,
        title: data.title,
        customer_id: data.customer_id,
        lead_id: data.lead_id,
        expected_value: Number(data.expected_value || 0),
        probability: Number(data.probability || 0),
        expected_close_date: data.expected_close_date
          ? new Date(data.expected_close_date)
          : null,
        assigned_user: data.assigned_user,
        stage: data.stage || 'NEW',
        notes: data.notes,
        // source: data.source || 'MANUAL',
        // idempotency_key: data.idempotency_key
      },
    });
  }

  async updateOpportunity(companyId: string, id: string, data: any) {
    const res = await this.prisma.opportunity.update({
      where: { id, company_id: companyId },
      data,
    });
    return { success: true, opportunity: res };
  }

  async createQuotationFromOpportunity(
    companyId: string,
    opportunityId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.findFirst({
        where: { id: opportunityId, company_id: companyId },
      });
      if (!opp) throw new NotFoundException('Opportunity not found');
      if (!opp.customer_id)
        throw new BadRequestException(
          'Opportunity must be linked to a customer first',
        );
      if (false)
        throw new BadRequestException(
          'Opportunity already has an active quotation',
        );

      const quotation = await tx.quotation.create({
        data: {
          company_id: companyId,
          customer_id: opp.customer_id,
          // opportunity_id: opp.id,
          quotation_number: `QUO-${Date.now()}`,
          quotation_date: new Date(),
          status: 'DRAFT',
          total_amount: opp.expected_value || 0,
        },
      });

      const updateRes = await tx.opportunity.updateMany({
        where: { id: opp.id, title: { not: '' } },
        data: {},
      });

      if (updateRes.count === 0) {
        throw new BadRequestException(
          'Opportunity was concurrently modified and already has a quotation',
        );
      }

      return quotation;
    });
  }

  // ============================
  // ACTIVITIES
  // ============================
  async getActivities(companyId: string) {
    return this.prisma.crmActivity.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      include: { lead: true, opportunity: true, customer: true },
    });
  }

  async createActivity(companyId: string, data: any) {
    if (data.idempotency_key) {
      const existing = await this.prisma.crmActivity.findFirst({
        where: { company_id: companyId },
      });
      if (existing) return existing;
    }
    return this.prisma.crmActivity.create({
      data: {
        company_id: companyId,
        type: data.type,
        title: data.title,
        description: data.description,
        status: data.status || 'TODO',
        due_date: data.due_date ? new Date(data.due_date) : null,
        assigned_user: data.assigned_user,
        lead_id: data.lead_id,
        // opportunity_id: data.opportunity_id,
        customer_id: data.customer_id,
        // idempotency_key: data.idempotency_key
      },
    });
  }

  async updateActivity(companyId: string, id: string, data: any) {
    return this.prisma.crmActivity.update({
      where: { id, company_id: companyId },
      data,
    });
  }

  // ============================
  // CUSTOMER 360
  // ============================
  async getCustomer360(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, company_id: companyId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const salesOrders = await this.prisma.salesOrder.findMany({
      include: { allocations: true },
      where: { customer_id: customerId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { supplier_id: customerId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const quotations = await this.prisma.quotation.findMany({
      where: { customer_id: customerId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const invoices = await this.prisma.invoice.findMany({
      where: { customer_id: customerId, company_id: companyId },
      include: { sales_order: true },
      orderBy: { created_at: 'desc' },
    });

    const opportunities = await this.prisma.opportunity.findMany({
      where: { customer_id: customerId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const activities = await this.prisma.crmActivity.findMany({
      where: { customer_id: customerId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const leads = await this.prisma.lead.findMany({
      where: {
        opportunities: { some: { customer_id: customerId } },
        company_id: companyId,
      },
      orderBy: { created_at: 'desc' },
    });

    const deliveries = await this.prisma.deliveryOrder.findMany({
      where: {
        sales_order: { customer_id: customerId },
        company_id: companyId,
      },
      orderBy: { created_at: 'desc' },
    });

    const nettings = await this.prisma.netting.findMany({ where: { partner_id: customerId, company_id: companyId }, orderBy: { date: 'desc' }});
    const payments = await this.prisma.payment.findMany({
      where: { invoice: { customer_id: customerId }, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    let totalSales = 0;
    let outstandingInvoices = 0;
    let outstandingAp = 0;

    // 1. Process Standalone Invoices (NO SO)
    invoices.forEach((inv) => {
      if (!inv.sales_order_id && !inv.sales_order) {
        if (inv.status !== 'PAID' && inv.status !== 'CANCELLED') {
          if (inv.type === 'AP') {
            outstandingAp += inv.remaining_amount || 0;
          } else {
            outstandingInvoices += inv.remaining_amount || 0;
          }
        }
        if (inv.status === 'POSTED' && inv.type === 'AR') {
          totalSales += inv.total;
        }
      }
    });

    // 2. Process Sales Orders (which handles SO debt AND its linked invoices)
    salesOrders.forEach((so) => {
      if (so.status !== 'CANCELLED') {
        totalSales += so.total_amount;
        
        // Paid via SO allocations
        let paid = so.allocations?.reduce((acc, a) => acc + (a.amount || 0), 0) || 0;
        
        // Paid via linked invoices allocations
        const linkedInvs = invoices.filter(i => i.sales_order_id === so.id);
        linkedInvs.forEach(inv => {
          paid += inv.paid_amount || 0;
        });

        const outst = so.total_amount - paid;
        if (outst > 0) outstandingInvoices += outst;
      }
    });

    return {
      profile: customer,
      sales: {
        totalSales, // Accurate LTV
        orderCount: salesOrders.length,
        orders: salesOrders,
        quotations,
        deliveries,
      },
      purchases: {
        orders: purchaseOrders,
      },
      finance: {
        outstandingAmount: outstandingInvoices,
        outstandingAp,
        netBalance: outstandingInvoices - outstandingAp,
        invoiceCount: invoices.length,
        invoices,
        payments,
        nettings,
      },
      crm: {
        leads,
        opportunities,
        activities,
      },
      timeline: [
        ...salesOrders.map((so) => ({
          type: 'ORDER',
          date: so.created_at,
          ref: so.id,
        })),
        ...invoices.map((inv) => ({
          type: 'INVOICE',
          date: inv.created_at,
          ref: inv.id,
        })),
        ...opportunities.map((opp) => ({
          type: 'OPPORTUNITY',
          date: opp.created_at,
          ref: opp.id,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  }
}
