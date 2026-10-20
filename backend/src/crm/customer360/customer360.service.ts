import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Customer360Service {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomer360(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, company_id: companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 1. Invoices & Revenue (Excluding DRAFT and CANCELLED)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        company_id: companyId,
        OR: [
          { customer_id: customerId },
          { supplier_id: customerId }
        ],
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      orderBy: { invoice_date: 'desc' },
    });

    let totalInvoiced = 0;
    let totalPaid = 0;
    let outstanding = 0;
    let outstandingAp = 0;

    invoices.forEach((inv) => {
      if (inv.type === 'AR' && inv.customer_id === customerId) {
        totalInvoiced += inv.total;
        totalPaid += inv.paid_amount;
        outstanding += inv.remaining_amount;
      } else if (inv.type === 'AP' && (inv.supplier_id === customerId || inv.customer_id === customerId)) {
        outstandingAp += inv.remaining_amount;
      }
    });

    const netBalance = outstanding - outstandingAp;

    // 2. Opportunities & Pipeline
    const opportunities = await this.prisma.opportunity.findMany({
      where: { company_id: companyId, customer_id: customerId },
      orderBy: { created_at: 'desc' },
      include: { lead: true },
    });

    let openPipeline = 0;
    let weightedPipeline = 0;
    let wonValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    opportunities.forEach((opp) => {
      if (opp.stage === 'WON') {
        wonCount++;
        wonValue += opp.expected_value;
      } else if (opp.stage === 'LOST') {
        lostCount++;
      } else {
        openPipeline += opp.expected_value;
        weightedPipeline += opp.expected_value * (opp.probability / 100);
      }
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : null;

    // 3. Activities
    const now = new Date();
    const activities = await this.prisma.crmActivity.findMany({
      where: { company_id: companyId, customer_id: customerId },
      orderBy: { due_date: 'asc' },
    });

    const overdueActivities = activities.filter(
      (a) =>
        a.status !== 'DONE' &&
        a.status !== 'CANCELLED' &&
        a.due_date &&
        a.due_date < now,
    );
    const todayActivities = activities.filter((a) => {
      if (a.status === 'DONE' || a.status === 'CANCELLED' || !a.due_date)
        return false;
      const d = new Date(a.due_date);
      return d.toDateString() === now.toDateString();
    });
    const upcomingActivities = activities.filter((a) => {
      if (a.status === 'DONE' || a.status === 'CANCELLED' || !a.due_date)
        return false;
      return (
        a.due_date > now &&
        new Date(a.due_date).toDateString() !== now.toDateString()
      );
    });

    // 4. Quotations
    const quotations = await this.prisma.quotation.findMany({
      where: { company_id: companyId, customer_id: customerId },
      orderBy: { quotation_date: 'desc' },
      take: 20,
    });

    // 5. Sales Orders
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: { company_id: companyId, customer_id: customerId },
      orderBy: { order_date: 'desc' },
      take: 20,
      include: { pos_shift: true, allocations: true },
    });

    const lastOrder = salesOrders.length > 0 ? salesOrders[0].order_date : null;

    // 6. Deliveries (Derived via SalesOrders)
    const salesOrderIds = salesOrders.map((so) => so.id);
    const deliveries = await this.prisma.deliveryOrder.findMany({
      where: { company_id: companyId, sales_order_id: { in: salesOrderIds } },
      orderBy: { delivery_date: 'desc' },
      include: { sales_order: true },
    });

    // 7. Payments (Derived via Invoices)
    const invoiceIds = invoices.map((i) => i.id);
    const payments = await this.prisma.payment.findMany({
      where: { company_id: companyId, invoice_id: { in: invoiceIds } },
      orderBy: { payment_date: 'desc' },
      include: { invoice: true },
    });

    const lastPayment = payments.length > 0 ? payments[0].payment_date : null;

    // 7.5. Netting
    const nettings = await this.prisma.netting.findMany({
      where: { company_id: companyId, partner_id: customerId },
      orderBy: { date: 'desc' },
    });

    // 8. Timeline Assembly (Top 50 events combined)
    const timeline: any[] = [];

    opportunities.forEach((o) =>
      timeline.push({
        type: 'OPPORTUNITY',
        date: o.created_at,
        title: `Opportunity Created: ${o.title}`,
        ref: o.id,
      }),
    );
    quotations.forEach((q) =>
      timeline.push({
        type: 'QUOTATION',
        date: q.quotation_date,
        title: `Quotation Created: ${q.quotation_number}`,
        ref: q.id,
      }),
    );
    salesOrders.forEach((s) =>
      timeline.push({
        type: 'SALES_ORDER',
        date: s.order_date,
        title: `Sales Order Created: ${s.order_number}`,
        ref: s.id,
      }),
    );
    deliveries.forEach((d) =>
      timeline.push({
        type: 'DELIVERY',
        date: d.delivery_date,
        title: `Delivery Created: ${d.delivery_number}`,
        ref: d.id,
      }),
    );
    invoices.forEach((i) =>
      timeline.push({
        type: 'INVOICE',
        date: i.invoice_date,
        title: `Invoice Posted: ${i.invoice_number}`,
        ref: i.id,
      }),
    );
    payments.forEach((p) =>
      timeline.push({
        type: 'PAYMENT',
        date: p.payment_date,
        title: `Payment Received: ${p.payment_number}`,
        ref: p.id,
      }),
    );
    nettings.forEach((n) =>
      timeline.push({
        type: 'NETTING',
        date: n.date,
        title: `Netting Completed: ${n.netting_number}`,
        ref: n.id,
      }),
    );
    activities
      .filter((a) => a.status === 'DONE')
      .forEach((a) =>
        timeline.push({
          type: 'ACTIVITY',
          date: a.completed_at || a.updated_at,
          title: `Activity Completed: ${a.title}`,
          ref: a.id,
        }),
      );

    // Sort timeline desc
    timeline.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      customer,
      summary: {
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        outstanding: outstanding,
        outstanding_ap: outstandingAp,
        net_balance: netBalance,
        open_pipeline: openPipeline,
        weighted_pipeline: weightedPipeline,
        won_value: wonValue,
        win_rate: winRate,
        last_order: lastOrder,
        last_payment: lastPayment,
        profitability: 'Not Available', // Safe default as COGS isn't historically linked at customer level yet
      },
      opportunities: opportunities.slice(0, 10), // Pagination placeholder for UI
      activities: {
        overdue: overdueActivities,
        today: todayActivities,
        upcoming: upcomingActivities,
      },
      quotations,
      salesOrders,
      deliveries,
      invoices,
      payments,
      nettings,
      timeline: timeline.slice(0, 50),
    };
  }
}
