import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GlService } from '../gl/gl.service';

export interface FinanceTransactionDto {
  companyId: string;
  cashAccountId: string;
  transactionNo: string;
  transactionDate: Date;
  description?: string;
  amount: number;
  categoryId: string; // for simplicity, one category per transaction
  userId: string;
  // For GL double entry mapping:
  debitAccountId: string;
  creditAccountId: string;
}

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private glService: GlService,
  ) {}

  async getCategories(companyId: string) {
    return this.prisma.financeCategory.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createCashIn(data: FinanceTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // Auto-resolve missing accounts
      let cashAccountId = data.cashAccountId;
      if (!cashAccountId) {
        let account = await tx.cashAccount.findFirst({
          where: { company_id: data.companyId, name: 'Kas Utama' },
        });
        if (!account) {
          account = await tx.cashAccount.create({
            data: {
              company_id: data.companyId,
              code: 'CASH-001',
              name: 'Kas Utama',
              account_type: 'Cash',
            },
          });
        }
        cashAccountId = account.id;
      }

      let debitId = data.debitAccountId;
      let creditId = data.creditAccountId;
      if (!debitId || !creditId) {
        // GL Posting is skipped if accounts are not provided to avoid complex schema dependency here
      }

      let catId = data.categoryId;
      if (!catId) {
        let cat = await tx.financeCategory.findFirst({
          where: { company_id: data.companyId, name: 'General' },
        });
        if (!cat)
          cat = await tx.financeCategory.create({
            data: {
              company_id: data.companyId,
              name: 'General',
              type: 'INCOME',
            },
          });
        catId = cat.id;
      }
      // 1. Create Immutable Transaction Header & Item
      const transaction = await tx.financeTransaction.create({
        data: {
          company_id: data.companyId,
          transaction_no: data.transactionNo,
          transaction_type: 'Cash In',
          cash_account_id: cashAccountId,
          transaction_date: data.transactionDate,
          status: 'Approved', // Langsung approved untuk demo immutable
          description: data.description,
          total_amount: data.amount,
          created_by: data.userId,
          approved_by: data.userId,
          approved_at: new Date(),
          items: {
            create: [
              {
                category_id: catId,
                amount: data.amount,
                description: data.description,
              },
            ],
          },
        },
      });

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'CREATE_APPROVED',
          entity: 'FinanceTransaction_CashIn',
          entity_id: transaction.id,
        },
      });
      // 4. Generate GL Double Entry
      const accountRecord = await tx.cashAccount.findUnique({
        where: { id: cashAccountId },
      });
      if (!accountRecord?.chart_of_account_id) {
        throw new BadRequestException(
          'Cash Account must have mapped Chart of Account',
        );
      }
      debitId = debitId || accountRecord.chart_of_account_id;
      if (!creditId) {
        throw new BadRequestException(
          'Credit account ID must be provided for Cash In',
        );
      }

      await this.glService.createJournalEntryWithinTx(tx as any, {
        companyId: data.companyId,
        entryDate: data.transactionDate,
        referenceType: 'FINANCE',
        referenceId: transaction.id,
        description: `Cash In: ${data.description}`,
        items: [
          { accountId: debitId, debit: data.amount, credit: 0 },
          { accountId: creditId, debit: 0, credit: data.amount },
        ],
      });

      return transaction;
    });
  }

  async createCashOut(data: FinanceTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // Auto-resolve missing accounts
      let cashAccountId = data.cashAccountId;
      if (!cashAccountId) {
        let account = await tx.cashAccount.findFirst({
          where: { company_id: data.companyId, name: 'Kas Utama' },
        });
        if (!account) {
          account = await tx.cashAccount.create({
            data: {
              company_id: data.companyId,
              code: 'CASH-001',
              name: 'Kas Utama',
              account_type: 'Cash',
            },
          });
        }
        cashAccountId = account.id;
      }

      let debitId = data.debitAccountId;
      let creditId = data.creditAccountId;
      if (!debitId || !creditId) {
        // GL Posting is skipped if accounts are not provided
      }

      let catId = data.categoryId;
      if (!catId) {
        let cat = await tx.financeCategory.findFirst({
          where: { company_id: data.companyId, name: 'General Expense' },
        });
        if (!cat)
          cat = await tx.financeCategory.create({
            data: {
              company_id: data.companyId,
              name: 'General Expense',
              type: 'EXPENSE',
            },
          });
        catId = cat.id;
      }

      // Validasi Saldo
      const account = await tx.cashAccount.findUnique({
        where: { id: cashAccountId },
      });
      if (!account || Number(account.current_balance) < data.amount) {
        throw new BadRequestException('Insufficient balance in Cash Account');
      }

      // 1. Create Transaction
      const transaction = await tx.financeTransaction.create({
        data: {
          company_id: data.companyId,
          transaction_no: data.transactionNo,
          transaction_type: 'Cash Out',
          cash_account_id: cashAccountId,
          transaction_date: data.transactionDate,
          status: 'Approved',
          description: data.description,
          total_amount: data.amount,
          created_by: data.userId,
          approved_by: data.userId,
          approved_at: new Date(),
          items: {
            create: [
              {
                category_id: catId,
                amount: data.amount,
                description: data.description,
              },
            ],
          },
        },
      });

      // 3. GL Double Entry
      const accountRecord = await tx.cashAccount.findUnique({
        where: { id: cashAccountId },
      });
      if (!accountRecord?.chart_of_account_id) {
        throw new BadRequestException(
          'Cash Account must have mapped Chart of Account',
        );
      }
      creditId = creditId || accountRecord.chart_of_account_id;
      if (!debitId) {
        throw new BadRequestException(
          'Debit account ID must be provided for Cash Out',
        );
      }

      await this.glService.createJournalEntryWithinTx(tx as any, {
        companyId: data.companyId,
        entryDate: data.transactionDate,
        referenceType: 'FINANCE',
        referenceId: transaction.id,
        description: `Cash Out: ${data.description}`,
        items: [
          { accountId: debitId, debit: data.amount, credit: 0 },
          { accountId: creditId, debit: 0, credit: data.amount },
        ],
      });

      return transaction;
    });
  }

  async reverseTransaction(
    originalTxId: string,
    userId: string,
    reverseTxNo: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const originalTx = await tx.financeTransaction.findUnique({
        where: { id: originalTxId },
        include: { items: true },
      });

      if (!originalTx || originalTx.status !== 'Approved') {
        throw new BadRequestException('Can only reverse approved transactions');
      }

      // 1. Create Reversal Transaction
      const reversalType =
        originalTx.transaction_type === 'Cash In' ? 'Cash Out' : 'Cash In';

      const reversedTx = await tx.financeTransaction.create({
        data: {
          company_id: originalTx.company_id,
          transaction_no: reverseTxNo,
          transaction_type: reversalType,
          cash_account_id: originalTx.cash_account_id,
          reference_type: 'REVERSAL',
          reference_id: originalTx.id,
          transaction_date: new Date(),
          status: 'Reversed', // Flagging as reversed
          description: `Reversal of ${originalTx.transaction_no}`,
          total_amount: originalTx.total_amount,
          created_by: userId,
          approved_by: userId,
          approved_at: new Date(),
          items: {
            create: originalTx.items.map((item) => ({
              category_id: item.category_id,
              amount: item.amount,
              description: `Reversal: ${item.description}`,
            })),
          },
        },
      });

      // 2. Mark Original as Reversed
      await tx.financeTransaction.update({
        where: { id: originalTx.id },
        data: { status: 'Reversed' },
      });

      // Note: A full GL Reversal would also fetch the original JournalEntry and flip Debit/Credit here.
      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          company_id: originalTx.company_id,
          user_id: userId,
          action: 'REVERSE_TRANSACTION',
          entity: 'FinanceTransaction',
          entity_id: reversedTx.id,
          before_data: originalTx as any,
          after_data: reversedTx as any,
        },
      });

      return reversedTx;
    });
  }

  // --- FINANCIAL REPORTS AGGREGATION ---

  async getProfitLossReport(companyId: string, startDate?: Date, endDate?: Date) {
    const whereCondition: any = {
      journal_entry: { company_id: companyId, status: { in: ['Posted', 'Reversed'] } },
    };
    if (startDate || endDate) {
      whereCondition.journal_entry.journal_date = {};
      if (startDate) whereCondition.journal_entry.journal_date.gte = startDate;
      if (endDate) whereCondition.journal_entry.journal_date.lte = endDate;
    }

    const items = await this.prisma.journalEntryItem.findMany({
      where: whereCondition,
      include: { account: { include: { account_type: true } } },
    });

    const categories = {
      revenue: new Map<string, number>(),
      contraRevenue: new Map<string, number>(),
      cogs: new Map<string, number>(),
      operatingExpenses: new Map<string, number>(),
      otherIncome: new Map<string, number>(),
      otherExpenses: new Map<string, number>(),
    };

    let totalRevenue = 0;
    let totalContraRevenue = 0;
    let totalCogs = 0;
    let totalOperatingExpenses = 0;
    let totalOtherIncome = 0;
    let totalOtherExpenses = 0;

    items.forEach((item) => {
      const typeCode = item.account.account_type.code.toUpperCase();
      const accountName = item.account.account_name;
      const creditBal = item.credit - item.debit;
      const debitBal = item.debit - item.credit;

      if (typeCode.includes('REVENUE') || typeCode.includes('INCOME')) {
        if (typeCode.includes('CONTRA') || accountName.toUpperCase().includes('RETURN') || accountName.toUpperCase().includes('RETUR') || accountName.toUpperCase().includes('DISCOUNT')) {
          categories.contraRevenue.set(accountName, (categories.contraRevenue.get(accountName) || 0) + debitBal);
          totalContraRevenue += debitBal;
        } else if (typeCode.includes('OTHER')) {
          categories.otherIncome.set(accountName, (categories.otherIncome.get(accountName) || 0) + creditBal);
          totalOtherIncome += creditBal;
        } else {
          categories.revenue.set(accountName, (categories.revenue.get(accountName) || 0) + creditBal);
          totalRevenue += creditBal;
        }
      } else if (typeCode === 'COGS' || typeCode.includes('COGS')) {
        categories.cogs.set(accountName, (categories.cogs.get(accountName) || 0) + debitBal);
        totalCogs += debitBal;
      } else if (typeCode.includes('EXPENSE')) {
        if (typeCode.includes('OTHER')) {
          categories.otherExpenses.set(accountName, (categories.otherExpenses.get(accountName) || 0) + debitBal);
          totalOtherExpenses += debitBal;
        } else {
          categories.operatingExpenses.set(accountName, (categories.operatingExpenses.get(accountName) || 0) + debitBal);
          totalOperatingExpenses += debitBal;
        }
      }
    });

    const netRevenue = totalRevenue - totalContraRevenue;
    const grossProfit = netRevenue - totalCogs;
    const netProfit = grossProfit - totalOperatingExpenses + totalOtherIncome - totalOtherExpenses;

    const mapToArray = (map: Map<string, number>) => Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));

    return {
      revenue: mapToArray(categories.revenue),
      contraRevenue: mapToArray(categories.contraRevenue),
      cogs: mapToArray(categories.cogs),
      expenses: mapToArray(categories.operatingExpenses), // for backward compatibility
      operatingExpenses: mapToArray(categories.operatingExpenses),
      otherIncome: mapToArray(categories.otherIncome),
      otherExpenses: mapToArray(categories.otherExpenses),

      totalRevenue,
      totalContraRevenue,
      netRevenue,
      totalCogs,
      grossProfit,
      totalExpenses: totalOperatingExpenses + totalOtherExpenses, // backward compatibility
      totalOperatingExpenses,
      totalOtherIncome,
      totalOtherExpenses,
      netProfit,
    };
  }

  async getCashFlowReport(companyId: string) {
    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        company_id: companyId,
        status: { in: ['Approved', 'COMPLETED'] },
      },
      orderBy: { transaction_date: 'asc' },
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    const cashInflows: any[] = [];
    const cashOutflows: any[] = [];

    for (const tx of transactions) {
      const val = Number(tx.total_amount);
      if (
        tx.transaction_type === 'Cash In' ||
        tx.transaction_type === 'Income'
      ) {
        totalInflow += val;
        cashInflows.push({
          date: tx.transaction_date,
          description: tx.description || 'Penerimaan',
          amount: val,
        });
      } else if (
        tx.transaction_type === 'Cash Out' ||
        tx.transaction_type === 'Expense'
      ) {
        totalOutflow += val;
        cashOutflows.push({
          date: tx.transaction_date,
          description: tx.description || 'Pengeluaran',
          amount: val,
        });
      }
    }

    return {
      cashInflows,
      cashOutflows,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
    };
  }

  async getBalanceSheetReport(companyId: string) {
    // 1. Calculate Cash Balance
    const cashAccounts = await this.prisma.cashAccount.findMany({
      where: { company_id: companyId },
    });
    const totalCash = cashAccounts.reduce(
      (sum, acc) => sum + Number(acc.current_balance),
      0,
    );

    // 2. Calculate Inventory Value
    const stocks = await this.prisma.warehouseStock.findMany({
      where: { company_id: companyId },
      include: { product: true },
    });
    const inventoryValue = stocks.reduce(
      (sum, stock) =>
        sum + stock.current_stock * Number(stock.product.purchase_price),
      0,
    );

    // 3. Asset Master Value (If Asset module is active)
    const fixedAssets = await this.prisma.assetMaster.findMany({
      where: { company_id: companyId },
    });
    const fixedAssetValue = fixedAssets.reduce(
      (sum, asset) => sum + Number(asset.purchase_price),
      0,
    );

    const totalAssets = totalCash + inventoryValue + fixedAssetValue;

    // For MVP, Liabilities = 0, Equity = Assets - Liabilities
    const totalLiabilities = 0;
    const totalEquity = totalAssets;

    return {
      assets: [
        { name: 'Kas & Bank', amount: totalCash },
        { name: 'Persediaan Barang', amount: inventoryValue },
        { name: 'Aset Tetap', amount: fixedAssetValue },
      ],
      liabilities: [{ name: 'Hutang Dagang', amount: 0 }],
      equity: [{ name: 'Modal Pemilik', amount: totalEquity }],
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }

  async getCashReconciliation(companyId: string) {
    const cashAccounts = await this.prisma.cashAccount.findMany({
      where: { company_id: companyId },
      include: { chart_of_account: { include: { account_type: true } } },
    });

    const results: any[] = [];

    for (const ca of cashAccounts) {
      const operationalBalance = Math.round(Number(ca.current_balance || 0) * 100) / 100;
      const openingBalance = Math.round(Number(ca.opening_balance || 0) * 100) / 100;

      // Aggregate operational FinanceTransactions for this cash account
      const txs = await this.prisma.financeTransaction.findMany({
        where: {
          company_id: companyId,
          cash_account_id: ca.id,
          status: { in: ['COMPLETED', 'Approved', 'Reversed'] },
        },
      });

      let cashInflows = 0;
      let cashOutflows = 0;
      let reversalMovements = 0;

      for (const t of txs) {
        const amt = Number(t.total_amount || 0);
        if (t.reference_type === 'PAYMENT_REVERSAL') {
          reversalMovements += amt;
        }
        if (t.transaction_type === 'Cash In') {
          cashInflows += amt;
        } else if (t.transaction_type === 'Cash Out') {
          cashOutflows += amt;
        }
      }

      cashInflows = Math.round(cashInflows * 100) / 100;
      cashOutflows = Math.round(cashOutflows * 100) / 100;
      reversalMovements = Math.round(reversalMovements * 100) / 100;
      const calculatedOperationalClosing = Math.round((openingBalance + cashInflows - cashOutflows) * 100) / 100;

      if (!ca.chart_of_account_id) {
        results.push({
          company_id: companyId,
          cash_account_id: ca.id,
          account_code: ca.code,
          account_name: ca.name,
          currency: ca.currency,
          opening_balance: openingBalance,
          cash_inflows: cashInflows,
          cash_outflows: cashOutflows,
          reversal_movements: reversalMovements,
          calculated_closing_balance: calculatedOperationalClosing,
          operational_balance: operationalBalance,
          mapped_coa: null,
          gl_balance: null,
          difference: null,
          mapping_status: 'UNMAPPED',
          status: 'UNMAPPED',
        });
        continue;
      }

      // Calculate GL Balance: Posted active journals plus original Reversed journals
      // (When a journal is reversed, its status becomes 'Reversed' and a compensating journal is created with status 'Posted' and swapped debit/credit. Both must be included so they cancel out).
      const glItems = await this.prisma.journalEntryItem.aggregate({
        where: {
          account_id: ca.chart_of_account_id,
          journal_entry: {
            company_id: companyId,
            status: { in: ['Posted', 'Reversed'] },
          },
        },
        _sum: { debit: true, credit: true },
      });

      const debit = Math.round(Number(glItems._sum.debit || 0) * 100) / 100;
      const credit = Math.round(Number(glItems._sum.credit || 0) * 100) / 100;
      let glNet = debit - credit;
      if (ca.chart_of_account?.account_type?.normal_balance === 'Credit') {
        glNet = credit - debit;
      }
      const glBalance = Math.round((openingBalance + glNet) * 100) / 100;
      const difference = Math.round(Math.abs(operationalBalance - glBalance) * 100) / 100;
      const isMatched = difference <= 0.01;

      results.push({
        company_id: companyId,
        cash_account_id: ca.id,
        account_code: ca.code,
        account_name: ca.name,
        currency: ca.currency,
        opening_balance: openingBalance,
        cash_inflows: cashInflows,
        cash_outflows: cashOutflows,
        reversal_movements: reversalMovements,
        calculated_closing_balance: calculatedOperationalClosing,
        operational_balance: operationalBalance,
        mapped_coa: ca.chart_of_account
          ? {
              id: ca.chart_of_account.id,
              code: ca.chart_of_account.account_code,
              name: ca.chart_of_account.account_name,
            }
          : null,
        gl_balance: glBalance,
        difference: difference,
        mapping_status: 'MAPPED',
        status: isMatched ? 'MATCHED' : 'MISMATCH',
      });
    }

    return results;
  }

  async transferCash(companyId: string, userId: string, data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    transactionDate?: Date;
    description?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const { fromAccountId, toAccountId, amount, description } = data;
      const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

      if (fromAccountId === toAccountId) {
        throw new BadRequestException('Rekening asal dan tujuan tidak boleh sama');
      }

      if (amount <= 0) {
        throw new BadRequestException('Nominal transfer harus lebih besar dari 0');
      }

      const fromAccount = await tx.cashAccount.findFirst({
        where: { id: fromAccountId, company_id: companyId },
      });
      if (!fromAccount) {
        throw new BadRequestException('Rekening asal tidak ditemukan');
      }

      const toAccount = await tx.cashAccount.findFirst({
        where: { id: toAccountId, company_id: companyId },
      });
      if (!toAccount) {
        throw new BadRequestException('Rekening tujuan tidak ditemukan');
      }

      // 1. Update balances
      await tx.cashAccount.update({
        where: { id: fromAccountId },
        data: { current_balance: { decrement: amount } },
      });

      await tx.cashAccount.update({
        where: { id: toAccountId },
        data: { current_balance: { increment: amount } },
      });

      // 2. Create outgoing & incoming FinanceTransaction
      const transferOutNo = `TRF-OUT-${Date.now()}`;
      const transferInNo = `TRF-IN-${Date.now()}`;

      const outTx = await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          cash_account_id: fromAccountId,
          transaction_no: transferOutNo,
          transaction_date: transactionDate,
          transaction_type: 'Transfer Out',
          total_amount: amount,
          description: description || `Transfer dana ke ${toAccount.name}`,
          status: 'COMPLETED',
          user_id: userId,
        },
      });

      const inTx = await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          cash_account_id: toAccountId,
          transaction_no: transferInNo,
          transaction_date: transactionDate,
          transaction_type: 'Transfer In',
          total_amount: amount,
          description: description || `Terima transfer dari ${fromAccount.name}`,
          status: 'COMPLETED',
          user_id: userId,
        },
      });

      // 3. GL Double Entry if Chart of Accounts are mapped
      if (fromAccount.chart_of_account_id && toAccount.chart_of_account_id) {
        await this.glService.createJournalEntryWithinTx(tx as any, {
          companyId,
          entryDate: transactionDate,
          referenceType: 'FINANCE',
          referenceId: outTx.id,
          description: `Transfer Dana: ${fromAccount.name} -> ${toAccount.name}`,
          items: [
            { accountId: toAccount.chart_of_account_id, debit: amount, credit: 0 },
            { accountId: fromAccount.chart_of_account_id, debit: 0, credit: amount },
          ],
        });
      }

      return {
        success: true,
        transferOut: outTx,
        transferIn: inTx,
      };
    });
  }
}
