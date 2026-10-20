import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async getCustomerWithFinancials(companyId: string, id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id, company_id: companyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Aggregate Posted & Outstanding Invoices for Official AR
    const invoices = await this.prisma.invoice.findMany({
      where: {
        customer_id: id,
        company_id: companyId,
        type: { in: ['AR', 'SALES_INVOICE'] },
        status: { in: ['POSTED', 'PARTIALLY PAID', 'PAID'] },
      },
      include: {
        PaymentAllocation: {
          include: {
            payment: true,
          },
        },
      },
      orderBy: { invoice_date: 'desc' },
    });

    let totalSales = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const inv of invoices) {
      totalSales += inv.total;
      totalPaid += inv.paid_amount;
      if (inv.status !== 'PAID' && inv.remaining_amount > 0.01) {
        totalOutstanding += inv.remaining_amount;
      }
    }

    // Aggregate Sales Orders (for tracking commitments & unbilled orders)
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        customer_id: id,
        company_id: companyId,
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        allocations: true,
        invoices: {
          where: { status: { notIn: ['CANCELLED'] } },
        },
      },
      orderBy: { order_date: 'desc' },
    });

    let totalOrderCommitments = 0;
    let unbilledOrders = 0;

    const formattedSOs = salesOrders.map((so) => {
      totalOrderCommitments += so.total_amount;
      const invoicedAmount = (so.invoices || []).reduce((sum, inv) => sum + inv.total, 0);
      const unbilled = Math.max(0, so.total_amount - invoicedAmount);
      unbilledOrders += unbilled;

      const paid = so.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const outstanding = Math.max(0, so.total_amount - paid);

      return {
        ...so,
        paid_amount: paid,
        outstanding,
        unbilled_amount: unbilled,
      };
    });

    // Active customer deposits / advances
    const payments = await this.prisma.payment.findMany({
      where: {
        customer_id: id,
        company_id: companyId,
        deleted_at: null,
      },
      include: {
        allocations: true,
      },
      orderBy: { payment_date: 'desc' },
    });

    const activePayments = payments.filter(
      (p) => !p.notes || !p.notes.includes('[DIBATALKAN]'),
    );

    let customerDepositBalance = 0;
    for (const p of activePayments) {
      const invAllocs = p.allocations
        .filter((a) => a.invoice_id != null)
        .reduce((sum, a) => sum + a.amount, 0);
      const avail = Math.max(0, p.amount - invAllocs);
      customerDepositBalance += avail;
    }

    return {
      customer,
      financials: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        unbilledOrders: Math.round(unbilledOrders * 100) / 100,
        orderCommitments: Math.round(totalOrderCommitments * 100) / 100,
        customerDepositBalance: Math.round(customerDepositBalance * 100) / 100,
      },
      invoices,
      salesOrders: formattedSOs,
      payments: activePayments,
    };
  }

  async getCustomersWithReceivables(companyId: string, search?: string, page: number = 1, limit: number = 20, warehouseId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { company_id: companyId };
    if (warehouseId) where.warehouse_id = warehouseId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    // For each customer, get their outstanding balance
    // In a real app with 10k customers we would use raw SQL aggregation.
    // For now we will do a fast lookup for the fetched page.
    const customerIds = customers.map((c) => c.id);

    // 1. Fetch Sales Invoices for customerIds to compute official AR
    const arInvoices = await this.prisma.invoice.findMany({
      where: {
        customer_id: { in: customerIds },
        company_id: companyId,
        type: { in: ['AR', 'SALES_INVOICE'] },
        status: { in: ['POSTED', 'PARTIALLY PAID', 'PAID'] },
      },
    });

    // 2. Fetch Sales Orders for tracking unbilled orders / commitments
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        customer_id: { in: customerIds },
        company_id: companyId,
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        invoices: {
          where: { status: { notIn: ['CANCELLED'] } },
        },
      },
    });
    
    // 3. AP Invoices for vendors / suppliers
    const apInvoices = await this.prisma.invoice.findMany({
      where: {
        supplier_id: { in: customerIds },
        company_id: companyId,
        type: 'AP',
        status: { notIn: ['CANCELLED', 'DRAFT'] },
      },
    });

    const arByCustomer: Record<string, typeof arInvoices> = {};
    for (const inv of arInvoices) {
      const cid = inv.customer_id as string;
      if (!arByCustomer[cid]) arByCustomer[cid] = [];
      arByCustomer[cid].push(inv);
    }

    const soByCustomer: Record<string, typeof salesOrders> = {};
    for (const so of salesOrders) {
      const cid = so.customer_id as string;
      if (!soByCustomer[cid]) soByCustomer[cid] = [];
      soByCustomer[cid].push(so);
    }

    const data = customers.map((c) => {
      const invoices = arByCustomer[c.id] || [];
      const sos = soByCustomer[c.id] || [];

      let totalSales = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      let totalPayable = 0;
      let unbilledOrders = 0;
      
      for (const inv of apInvoices) {
        if (inv.supplier_id === c.id) {
          totalPayable += inv.remaining_amount;
        }
      }

      for (const inv of invoices) {
        totalSales += inv.total;
        totalPaid += inv.paid_amount;
        if (inv.status !== 'PAID' && inv.remaining_amount > 0.01) {
          totalOutstanding += inv.remaining_amount;
        }
      }

      for (const so of sos) {
        const invoicedAmt = (so.invoices || []).reduce((sum, inv) => sum + inv.total, 0);
        unbilledOrders += Math.max(0, so.total_amount - invoicedAmt);
      }

      return {
        ...c,
        totalSales: Math.round(totalSales * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalPayable: Math.round(totalPayable * 100) / 100,
        unbilledOrders: Math.round(unbilledOrders * 100) / 100,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
