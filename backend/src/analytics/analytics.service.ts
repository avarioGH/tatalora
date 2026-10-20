import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService, private finance: FinanceService) {}

  async getDashboardKPIs(companyId: string, warehouseId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const whereBase: any = {
      company_id: companyId,
      status: { notIn: ['CANCELLED'] },
    };
    if (warehouseId && warehouseId !== 'all') {
      whereBase.warehouse_id = warehouseId;
    }

    // Revenue Today
    // Current Revenue is now derived from canonical GL P&L

    const financeWhere: any = {
      company_id: companyId,
      status: { in: ['Approved', 'COMPLETED', 'POSTED'] },
      transaction_date: { gte: firstDayOfMonth },
    };
    if (warehouseId && warehouseId !== 'all') {
      financeWhere.warehouse_id = warehouseId;
    }

    const financeTransactions = await this.prisma.financeTransaction.findMany({
      where: financeWhere
    });

    let realCashIn = 0;
    let realCashOut = 0;
    financeTransactions.forEach(ft => {
      if (['Cash In', 'Income'].includes(ft.transaction_type)) {
        realCashIn += ft.total_amount;
      } else if (['Cash Out', 'Expense', 'Payment'].includes(ft.transaction_type)) {
        realCashOut += ft.total_amount;
      }
    });

    const cashFlow = realCashIn;
    
    // Get canonical Accrual P&L from GL
    const pnl = await this.finance.getProfitLossReport(companyId, firstDayOfMonth, new Date());
      const netProfit = pnl.netProfit;
      
      const monthAgg = await this.prisma.salesOrder.aggregate({
        where: { ...whereBase, order_date: { gte: firstDayOfMonth } },
        _sum: { total_amount: true }
      });
      const currentRevenue = monthAgg._sum.total_amount || 0;

    // Inventory Value
    const stocks = await this.prisma.warehouseStock.findMany({ where: warehouseId && warehouseId !== 'all' ? { company_id: companyId, warehouse_id: warehouseId } : { company_id: companyId }, include: { product: true } });
    const inventoryValue = stocks.reduce((sum, s) => sum + ((s.current_stock || 0) * (s.product?.purchase_price || 0)), 0);

    // Top Customers
    const topCustAgg = await this.prisma.salesOrder.groupBy({
      by: ['customer_id'],
      where: whereBase,
      _sum: { total_amount: true },
      orderBy: { _sum: { total_amount: 'desc' } },
      take: 5,
    });

    const topCustomers = await Promise.all(
      topCustAgg.map(async (tc) => {
        if (!tc.customer_id) return null;
        const c = await this.prisma.customer.findUnique({
          where: { id: tc.customer_id },
        });
        return {
          name: c?.name || 'Unknown',
          spent: tc._sum.total_amount || 0,
          orders: 0,
        };
      }),
    ).then((res) => res.filter((x) => x !== null));


    const topProdAgg = await this.prisma.salesOrderItem.groupBy({
      by: ['product_id'],
      where: { sales_order: whereBase },
      _sum: { qty: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    });

    const topProducts = await Promise.all(
      topProdAgg.map(async (p) => {
        if (!p.product_id) return null;
        const prod = await this.prisma.product.findUnique({
          where: { id: p.product_id },
        });
        return {
          name: prod?.name || 'Unknown',
          qty: p._sum.qty || 0,
          revenue: p._sum.subtotal || 0,
        };
      })
    ).then((res) => res.filter((x) => x !== null));

    // Chart Data (Last 7 days)

    const chartDataArray: any[] = [];
    
    // Fetch last 7 days finance transactions
    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);
    d7.setHours(0, 0, 0, 0);
    
    const weekFinanceWhere: any = {
      company_id: companyId,
      status: { in: ['Approved', 'COMPLETED', 'POSTED'] },
      transaction_date: { gte: d7 },
    };
    if (warehouseId && warehouseId !== 'all') weekFinanceWhere.warehouse_id = warehouseId;
    
    const weekFinanceTransactions = await this.prisma.financeTransaction.findMany({
      where: weekFinanceWhere
    });
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dayAgg = await this.prisma.salesOrder.aggregate({
        where: { ...whereBase, order_date: { gte: d, lt: nextD } },
        _sum: { total_amount: true },
      });
      
      let dayCashIn = 0;
      let dayCashOut = 0;
      weekFinanceTransactions.forEach(ft => {
        if (ft.transaction_date >= d && ft.transaction_date < nextD) {
           if (['Cash In', 'Income'].includes(ft.transaction_type)) dayCashIn += ft.total_amount;
           else if (['Cash Out', 'Expense', 'Payment'].includes(ft.transaction_type)) dayCashOut += ft.total_amount;
        }
      });

      const dayPnl = await this.finance.getProfitLossReport(companyId, d, nextD);
      chartDataArray.push({
          date: d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          revenue: dayAgg._sum.total_amount || 0,
          profit: dayPnl.netProfit, // Profit is global for now
          cashIn: dayCashIn,
          cashOut: dayCashOut
        });
    }

    return {
      currentRevenue,
      netProfit,
      cashPosition: cashFlow,
      inventoryValue,
      comparison: {
        revenuePercentage: 100,
        profitPercentage: 100,
        cashFlowPercentage: 100,
        inventoryPercentage: 0,
      },
      chartData: { 
        sales: chartDataArray.map(d => ({ date: d.date, sales: d.revenue, profit: d.profit })), 
        cashflow: chartDataArray.map(d => ({ name: d.date, income: d.cashIn, expense: d.cashOut })) 
      },
      topProducts,
      lowStock: [],
      topCustomers,
    };
  }

  async getSalesAnalytics(companyId: string, startDate?: string, endDate?: string, warehouseId?: string) {
    const whereClause: any = {
      company_id: companyId,
      status: { notIn: ['CANCELLED', 'DRAFT'] },
    };
    if (startDate && endDate) {
      whereClause.created_at = {
        gte: new Date(startDate),
        lt: new Date(endDate),
      };
    }

    const aggregations = await this.prisma.salesOrder.aggregate({
      where: whereClause,
      _sum: { total_amount: true },
      _count: { id: true },
      _avg: { total_amount: true },
    });

    const totalQuotations = await this.prisma.quotation.count({
      where: { company_id: companyId },
    });
    const convertedQuotations = await this.prisma.quotation.count({
      where: { company_id: companyId, status: 'CONFIRMED' },
    });
    const quotationConversionRate =
      totalQuotations > 0 ? (convertedQuotations / totalQuotations) * 100 : 0;

    return {
      totalRevenue: aggregations._sum.total_amount || 0,
      totalOrders: aggregations._count.id || 0,
      averageOrderValue: aggregations._avg.total_amount || 0,
      quotationConversionRate,
      topProducts: [],
      revenueByStatus: [],
      salesTrends: [],
    };
  }

  async getCustomerAnalytics(companyId: string) {
    const totalCustomers = await this.prisma.customer.count({
      where: { company_id: companyId },
    });
    const customersWithOrders = await this.prisma.salesOrder.groupBy({
      by: ['customer_id'],
      where: {
        company_id: companyId,
        status: { notIn: ['CANCELLED', 'DRAFT'] },
      },
    });
    const activeCustomers = customersWithOrders.length;
    const aggregations = await this.prisma.salesOrder.aggregate({
      where: {
        company_id: companyId,
        status: { notIn: ['CANCELLED', 'DRAFT'] },
      },
      _sum: { total_amount: true },
    });
    const totalRevenue = aggregations._sum.total_amount || 0;
    const ltv = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    return {
      totalCustomers,
      activeCustomers,
      customerRetentionRate: 0,
      customerLifetimeValue: ltv,
      topCustomersByRevenue: [],
    };
  }
}
