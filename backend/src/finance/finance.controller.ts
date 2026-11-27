import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
  BadRequestException,
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
    const compId = req.user.company_id || req.user.companyId;
    return this.financeService.getCategories(compId);
  }

  @Permissions('finance.view')
  @Get('accounts')
  async getCashAccounts(@Request() req) {
    const companyId = req.user.company_id || req.user.companyId;
    await this.financeService.getCashReconciliation(companyId).catch(() => {});
    return this.prisma.cashAccount.findMany({
      where: { company_id: companyId },
      include: { chart_of_account: true },
      orderBy: { name: 'asc' },
    });
  }

  @Permissions('finance.view')
  @Get('summary')
  async getSummary(@Request() req) {
    const companyId = req.user.company_id || req.user.companyId;
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
  async getTransactions(
    @Request() req,
    @Query('cashAccountId') cashAccountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const where: any = { company_id: req.user.company_id || req.user.companyId };

    if (cashAccountId && cashAccountId !== 'all') {
      where.cash_account_id = cashAccountId;
    }

    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) where.transaction_date.gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        where.transaction_date.lte = eDate;
      }
    }

    if (search) {
      where.OR = [
        { transaction_no: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.financeTransaction.findMany({
      where,
      orderBy: { transaction_date: 'desc' },
      take: 200,
      include: {
        cash_account: true,
        user_created: { select: { name: true } },
      },
    });
  }

  @Permissions('finance.create')
  @Post('accounts')
  async createCashAccount(@Request() req, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    if (!data.name || !data.code) {
      throw new BadRequestException('Nama dan kode akun kas/bank wajib diisi');
    }

    let assetType = await this.prisma.accountType.findFirst({
      where: {
        company_id: companyId,
        OR: [{ code: 'ASSET' }, { name: { contains: 'Kas', mode: 'insensitive' } }],
      },
    });
    if (!assetType) {
      assetType = await this.prisma.accountType.create({
        data: {
          company_id: companyId,
          code: 'ASSET',
          name: 'Kas & Bank',
          normal_balance: 'Debit',
        },
      }).catch(() => null as any);
    }

    let coaId: string | undefined = data.chart_of_account_id;
    if (!coaId && assetType) {
      const existingCount = await this.prisma.cashAccount.count({ where: { company_id: companyId } });
      const coaCode = `1-100${existingCount + 1}`;
      const dedicatedCoa = await this.prisma.chartOfAccount.create({
        data: {
          company_id: companyId,
          account_code: coaCode,
          account_name: data.name,
          account_type_id: assetType.id,
          currency: data.currency || 'IDR',
          allow_manual_entry: true,
          status: true,
        },
      }).catch(() => null as any);
      if (dedicatedCoa) coaId = dedicatedCoa.id;
    }

    const created = await this.prisma.cashAccount.create({
      data: {
        company_id: companyId,
        code: data.code,
        name: data.name,
        account_type: data.account_type || 'Cash',
        opening_balance: Number(data.opening_balance || 0),
        current_balance: Number(data.opening_balance || 0),
        chart_of_account_id: coaId,
        currency: data.currency || 'IDR',
        status: true,
      },
      include: { chart_of_account: true },
    });

    if (Number(data.opening_balance || 0) > 0) {
      await this.financeService.getCashReconciliation(companyId).catch(() => {});
    }

    return created;
  }

  @Permissions('finance.create')
  @Post('cash-in')
  async createCashIn(@Request() req, @Body() data: any) {
    const dto: FinanceTransactionDto = {
      companyId: req.user.company_id || req.user.companyId,
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
      companyId: req.user.company_id || req.user.companyId,
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
  async getProfitLossReport(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const s = startDate ? new Date(startDate + 'T00:00:00+07:00') : undefined;
    const e = endDate ? new Date(endDate + 'T23:59:59.999+07:00') : undefined;
    const compId = req.user.company_id || req.user.companyId;
    return this.financeService.getProfitLossReport(compId, s, e);
  }

  @Permissions('finance.view')
  @Get('reports/cash-flow')
  async getCashFlowReport(@Request() req) {
    const compId = req.user.company_id || req.user.companyId;
    return this.financeService.getCashFlowReport(compId);
  }

  @Permissions('finance.view')
  @Get('reports/balance-sheet')
  async getBalanceSheetReport(@Request() req) {
    const compId = req.user.company_id || req.user.companyId;
    return this.financeService.getBalanceSheetReport(compId);
  }

  @Permissions('finance.create')
  @Post('transfer')
  async createTransfer(@Request() req: any, @Body() data: any) {
    const compId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.financeService.transferCash(compId, userId, {
      fromAccountId: data.fromAccountId || data.fromAccount,
      toAccountId: data.toAccountId || data.toAccount,
      amount: Number(data.amount),
      transactionDate: data.date || data.transactionDate,
      description: data.description,
    });
  }

  @Permissions('finance.view')
  @Get('cash-reconciliation')
  async getCashReconciliation(@Request() req: any) {
    const compId = req.user.company_id || req.user.companyId;
    return this.financeService.getCashReconciliation(compId);
  }

  @Permissions('finance.view')
  @Get('budgets')
  async getBudgets(@Request() req: any, @Query('period') period?: string) {
    const companyId = req.user.company_id;
    return this.prisma.budget.findMany({
      where: {
        company_id: companyId,
        ...(period ? { period } : {}),
      },
      include: {
        category: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  @Permissions('finance.create')
  @Post('budgets')
  async createBudget(@Request() req: any, @Body() data: any) {
    const companyId = req.user.company_id;
    const budgetAmount = Number(data.budget_amount || 0);
    const usedAmount = Number(data.used_amount || 0);
    const remainingAmount = budgetAmount - usedAmount;

    return this.prisma.budget.create({
      data: {
        company_id: companyId,
        category_id: data.category_id,
        department_id: data.department_id || null,
        period: data.period || '2026',
        budget_amount: budgetAmount,
        used_amount: usedAmount,
        remaining_amount: remainingAmount,
        status: remainingAmount <= 0 ? 'EXHAUSTED' : 'ACTIVE',
      },
      include: {
        category: true,
      },
    });
  }

  @Permissions('finance.delete')
  @Delete('budgets/:id')
  async deleteBudget(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.prisma.budget.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });
  }
}
