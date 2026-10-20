import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { FinanceService, FinanceTransactionDto } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Permissions('finance.category.view')
  @Get('categories')
  async getCategories(@Request() req) {
    return this.financeService.getCategories(req.user.company_id);
  }

  @Permissions('finance.view')
  @Get('summary')
  async getSummary(@Request() req) {
    const companyId = req.user.company_id;
    // 1. Total Cash from all Cash Accounts
    const cashAccounts = await this.prisma.cashAccount.findMany({
      where: { company_id: companyId },
    });

    const totalCash = cashAccounts.reduce(
      (sum, acc) => sum + Number(acc.current_balance),
      0,
    );

    // 2. Month-to-Date (MTD) calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Previous Month calculations
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        company_id: companyId,
        transaction_date: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago for chart
        },
        status: {
          in: ['Approved', 'COMPLETED'],
        },
      },
    });

    let totalIncomeMtd = 0;
    let totalExpensesMtd = 0;
    let totalIncomeLastMonth = 0;
    let totalExpensesLastMonth = 0;

    // Chart Data Generation (Last 30 days)
    const chartMap = new Map<
      string,
      { date: string; income: number; expenses: number }
    >();

    let iterateDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    while (iterateDate <= now) {
      const dateKey = `${iterateDate.getDate().toString().padStart(2, '0')}/${(iterateDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!chartMap.has(dateKey)) {
        chartMap.set(dateKey, { date: dateKey, income: 0, expenses: 0 });
      }
      iterateDate.setDate(iterateDate.getDate() + 1);
    }

    for (const tx of transactions) {
      const isIncome =
        tx.transaction_type === 'Cash In' || tx.transaction_type === 'Income';
      const val = Number(tx.total_amount);
      const txDate = new Date(tx.transaction_date);

      // MTD Check
      if (txDate >= startOfMonth) {
        if (isIncome) totalIncomeMtd += val;
        else totalExpensesMtd += val;
      }
      // Last Month Check
      else if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) {
        if (isIncome) totalIncomeLastMonth += val;
        else totalExpensesLastMonth += val;
      }

      // Chart Data
      const dateKey = `${txDate.getDate().toString().padStart(2, '0')}/${(txDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (chartMap.has(dateKey)) {
        const point = chartMap.get(dateKey)!;
        if (isIncome) point.income += val;
        else point.expenses += val;
      }
    }

    const netProfitMtd = totalIncomeMtd - totalExpensesMtd;
    const netProfitLastMonth = totalIncomeLastMonth - totalExpensesLastMonth;

    // Cash Last Month approximation (Current Cash - Net Profit MTD)
    const totalCashLastMonth = totalCash - netProfitMtd;

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const incomeGrowth = calculateGrowth(totalIncomeMtd, totalIncomeLastMonth);
    const expensesGrowth = calculateGrowth(
      totalExpensesMtd,
      totalExpensesLastMonth,
    );
    const profitGrowth = calculateGrowth(netProfitMtd, netProfitLastMonth);
    const cashGrowth = calculateGrowth(totalCash, totalCashLastMonth);

    const chartData = Array.from(chartMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/');
      const [dayB, monthB] = b.date.split('/');
      if (monthA !== monthB) return Number(monthA) - Number(monthB);
      return Number(dayA) - Number(dayB);
    });

    return {
      totalCash,
      cashGrowth,
      totalIncomeMtd,
      incomeGrowth,
      totalExpensesMtd,
      expensesGrowth,
      netProfitMtd,
      profitGrowth,
      chartData,
    };
  }

  @Permissions('finance.view')
  @Get('transactions')
  async getTransactions(@Request() req) {
    return this.prisma.financeTransaction.findMany({
      where: { company_id: req.user.company_id },
      orderBy: { transaction_date: 'desc' },
      take: 100,
      include: {
        cash_account: true,
        user_created: { select: { name: true } },
      },
    });
  }

  @Permissions('finance.create')
  @Post('cash-in')
  async createCashIn(@Request() req, @Body() data: any) {
    const dto: FinanceTransactionDto = {
      companyId: req.user.company_id,
      userId: req.user.userId,
      transactionNo: data.transactionNo || `CI-${Date.now()}`,
      transactionDate: data.transactionDate
        ? new Date(data.transactionDate)
        : new Date(),
      amount: Number(data.amount),
      description: data.description,
      cashAccountId: data.cashAccountId,
      categoryId: data.categoryId,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
    };
    return this.financeService.createCashIn(dto);
  }

  @Permissions('finance.create')
  @Post('cash-out')
  async createCashOut(@Request() req, @Body() data: any) {
    const dto: FinanceTransactionDto = {
      companyId: req.user.company_id,
      userId: req.user.userId,
      transactionNo: data.transactionNo || `CO-${Date.now()}`,
      transactionDate: data.transactionDate
        ? new Date(data.transactionDate)
        : new Date(),
      amount: Number(data.amount),
      description: data.description,
      cashAccountId: data.cashAccountId,
      categoryId: data.categoryId,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
    };
    return this.financeService.createCashOut(dto);
  }
  @Permissions('finance.view')
  @Get('reports/profit-loss')
  async getProfitLossReport(@Request() req) {
    return this.financeService.getProfitLossReport(req.user.company_id);
  }

  @Permissions('finance.view')
  @Get('reports/cash-flow')
  async getCashFlowReport(@Request() req) {
    return this.financeService.getCashFlowReport(req.user.company_id);
  }

  @Permissions('finance.view')
  @Get('reports/balance-sheet')
  async getBalanceSheetReport(@Request() req) {
    return this.financeService.getBalanceSheetReport(req.user.company_id);
  }

  @Permissions('finance.view')
  @Get('cash-reconciliation')
  async getCashReconciliation(@Request() req: any) {
    return this.financeService.getCashReconciliation(req.user.company_id);
  }
}
