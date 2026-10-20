import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface CreateJournalDto {
  companyId: string;
  entryDate: Date;
  referenceType: string;
  referenceId: string;
  description?: string;
  items: {
    accountId: string;
    debit: number;
    credit: number;
  }[];
}

@Injectable()
export class GlService {
  private readonly logger = new Logger(GlService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Helper function to create Journal Entry within an existing Prisma Transaction.
   * Ensuring 100% ACID compliance across modules.
   */
  async createJournalEntryWithinTx(
    tx: Prisma.TransactionClient,
    data: CreateJournalDto,
  ) {
    // 1. Validate Balance (Debit must equal Credit)

    let period = await tx.accountingPeriod.findFirst({
      where: {
        company_id: data.companyId,
        start_date: { lte: data.entryDate },
        end_date: { gte: data.entryDate },
      },
      orderBy: { created_at: 'desc' }, // 'CLOSED' and 'LOCKED' sort before 'OPEN' alphabetically, so specific closed periods override broad open ones. Or ideally by created_at desc.
    });

    if (!period) {
      const entryDate = new Date(data.entryDate);
      const year = entryDate.getFullYear();
      const month = entryDate.getMonth() + 1;
      const start_date = new Date(year, month - 1, 1);
      const end_date = new Date(year, month, 0, 23, 59, 59, 999);
      
      period = await tx.accountingPeriod.create({
        data: {
          company_id: data.companyId,
          year,
          month,
          start_date,
          end_date,
          status: 'OPEN'
        }
      });
    }
    if (period.status === 'CLOSED') {
      throw new Error(
        'ACCOUNTING_PERIOD_CLOSED: Cannot post to a closed period.',
      );
    }
    if (period.status === 'LOCKED') {
      throw new Error(
        'ACCOUNTING_PERIOD_LOCKED: Cannot post to a locked period.',
      );
    }

    const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);

    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new Error(
        `Journal Entry cannot have zero or negative value. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    const hasNegative = data.items.some(
      (item) => item.debit < 0 || item.credit < 0,
    );
    if (hasNegative) {
      throw new Error(`Journal Entry lines cannot be negative.`);
    }

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Journal Entry is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    // 2. Create Journal Header
    const journal = await tx.journalEntry.create({
      data: {
        company_id: data.companyId,
        journal_no: `JNL-${Date.now()}`,
        journal_date: data.entryDate,
        reference_type: data.referenceType,
        reference_id: data.referenceId,
        idempotency_key:
          data.referenceType && data.referenceId
            ? `${data.companyId}-${data.referenceType}-${data.referenceId}`
            : undefined,
        description: data.description,
        status: 'Posted',
        created_by: (data as any).userId || '000000000000000000000999',
      },
    });

    // 3. Create Journal Items and Aggregate Cash Movements
    const cashDeltas = new Map<string, number>();

    for (const item of data.items) {
      if (item.debit > 0 || item.credit > 0) {
        await tx.journalEntryItem.create({
          data: {
            journal_entry_id: journal.id,
            account_id: item.accountId,
            debit: item.debit,
            credit: item.credit,
          },
        });

        const cashAccounts = await tx.cashAccount.findMany({
          where: {
            company_id: data.companyId,
            chart_of_account_id: item.accountId,
          },
        });

        if (cashAccounts.length > 0) {
          const coa = await tx.chartOfAccount.findUnique({
            where: { id: item.accountId },
            include: { account_type: true },
          });

          let diff = item.debit - item.credit;
          if (coa?.account_type?.normal_balance === 'Credit') {
            diff = item.credit - item.debit;
          }

          for (const cashAcc of cashAccounts) {
            cashDeltas.set(
              cashAcc.id,
              (cashDeltas.get(cashAcc.id) || 0) + diff,
            );
          }
        }
      }
    }

    // Apply NET cash movement exactly once per cash account
    for (const [cashAccId, netDiff] of cashDeltas.entries()) {
      if (netDiff !== 0) {
        await tx.cashAccount.update({
          where: { id: cashAccId },
          data: { current_balance: { increment: netDiff } },
        });
      }
    }

    return journal;
  }

  async reverseJournal(
    companyId: string,
    originalJournalId: string,
    reason: string,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.journalEntry.findUnique({
        where: { id: originalJournalId },
        include: { items: true },
      });

      if (!original || original.company_id !== companyId)
        throw new Error('Journal not found');
      if (original.status === 'Reversed')
        throw new Error('Journal is already reversed');

      const today = new Date();
      // Period validation for the REVERSAL date (today)
      const period = await tx.accountingPeriod.findFirst({
        where: {
          company_id: companyId,
          start_date: { lte: today },
          end_date: { gte: today },
        },
      });

      if (!period)
        throw new Error(
          'NO_ACCOUNTING_PERIOD: Reversal date lacks an accounting period.',
        );
      if (period.status === 'CLOSED')
        throw new Error('ACCOUNTING_PERIOD_CLOSED');
      if (period.status === 'LOCKED')
        throw new Error('ACCOUNTING_PERIOD_LOCKED');

      const reversedJournal = await tx.journalEntry.create({
        data: {
          company_id: companyId,
          journal_no: 'REV-' + original.journal_no,
          reference_type: 'REVERSAL',
          reference_id: original.id,
          journal_date: today,
          description: 'Reversal of ' + original.journal_no + ': ' + reason,
          status: 'Posted',
          created_by: userId,
          items: {
            create: original.items.map((item) => ({
              account_id: item.account_id,
              debit: item.credit,
              credit: item.debit,
              description: 'Reversal: ' + item.description,
            })),
          },
        },
      });

      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: 'Reversed' },
      });

      await tx.journalReversal.create({
        data: {
          company_id: companyId,
          original_journal_id: original.id,
          reverse_journal_id: reversedJournal.id,
          reason: reason,
          created_by: userId,
        },
      });

      const revCashDeltas = new Map<string, number>();

      for (const item of original.items) {
        const cashAccounts = await tx.cashAccount.findMany({
          where: {
            company_id: companyId,
            chart_of_account_id: item.account_id,
          },
        });

        if (cashAccounts.length > 0) {
          const coa = await tx.chartOfAccount.findUnique({
            where: { id: item.account_id },
            include: { account_type: true },
          });

          let diff = item.credit - item.debit;
          if (coa?.account_type?.normal_balance === 'Credit') {
            diff = item.debit - item.credit;
          }

          for (const cashAcc of cashAccounts) {
            revCashDeltas.set(
              cashAcc.id,
              (revCashDeltas.get(cashAcc.id) || 0) + diff,
            );
          }
        }
      }

      for (const [cashAccId, netDiff] of revCashDeltas.entries()) {
        if (netDiff !== 0) {
          await tx.cashAccount.update({
            where: { id: cashAccId },
            data: { current_balance: { increment: netDiff } },
          });
        }
      }

      return reversedJournal;
    });
  }

  async getTrialBalance(companyId: string) {
    const items = await this.prisma.journalEntryItem.findMany({
      where: {
        journal_entry: {
          company_id: companyId,
          status: { in: ['Posted', 'Reversed'] },
        },
      },
      include: {
        account: {
          include: { account_type: true },
        },
      },
    });

    const accountMap = new Map<string, any>();
    for (const item of items) {
      const acc = item.account;
      if (!acc) continue;
      if (!accountMap.has(acc.id)) {
        accountMap.set(acc.id, {
          accountId: acc.id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          normalBalance: acc.account_type?.normal_balance || 'Debit',
          debit: 0,
          credit: 0,
        });
      }
      const data = accountMap.get(acc.id);
      data.debit += item.debit;
      data.credit += item.credit;
    }

    const rows: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const acc of accountMap.values()) {
      let balance = 0;
      if (acc.normalBalance === 'Debit') {
        balance = acc.debit - acc.credit;
      } else {
        balance = acc.credit - acc.debit;
      }
      totalDebit += acc.debit;
      totalCredit += acc.credit;

      rows.push({
        accountId: acc.accountId,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        normalBalance: acc.normalBalance,
        debit: Math.round(acc.debit * 100) / 100,
        credit: Math.round(acc.credit * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }

    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return {
      companyId,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      difference: Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100,
      accounts: rows,
    };
  }

  async getGeneralLedger(companyId: string, accountId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const where = {
      account_id: accountId,
      journal_entry: {
        company_id: companyId,
        status: { in: ['Posted', 'Reversed'] },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.journalEntryItem.findMany({
        where,
        include: {
          journal_entry: true,
          account: {
            include: { account_type: true },
          },
        },
        orderBy: {
          journal_entry: {
            journal_date: 'asc',
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.journalEntryItem.count({ where }),
    ]);

    let runningBalance = 0;
    const data = items.map((item) => {
      const normalBalance = item.account?.account_type?.normal_balance || 'Debit';
      if (normalBalance === 'Debit') {
        runningBalance += item.debit - item.credit;
      } else {
        runningBalance += item.credit - item.debit;
      }

      return {
        id: item.id,
        journalId: item.journal_entry_id,
        journalNo: item.journal_entry.journal_no,
        journalDate: item.journal_entry.journal_date,
        description: item.description || item.journal_entry.description,
        debit: item.debit,
        credit: item.credit,
        balance: Math.round(runningBalance * 100) / 100,
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

  async getARAging(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        company_id: companyId,
        type: { in: ['AR', 'SALES_INVOICE'] },
        status: { in: ['POSTED', 'PARTIALLY PAID'] },
        remaining_amount: { gt: 0.01 },
      },
      include: {
        customer: true,
      },
      orderBy: { due_date: 'asc' },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const summary = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0,
      totalOutstanding: 0,
    };

    const invoiceList = invoices.map((inv) => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const amount = inv.remaining_amount;

      summary.totalOutstanding += amount;

      let bucket = 'current';
      if (diffDays <= 0) {
        bucket = 'current';
        summary.current += amount;
      } else if (diffDays <= 30) {
        bucket = 'days_1_30';
        summary.days_1_30 += amount;
      } else if (diffDays <= 60) {
        bucket = 'days_31_60';
        summary.days_31_60 += amount;
      } else if (diffDays <= 90) {
        bucket = 'days_61_90';
        summary.days_61_90 += amount;
      } else {
        bucket = 'days_over_90';
        summary.days_over_90 += amount;
      }

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer_id,
        customerName: inv.customer?.name || 'N/A',
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        overdueDays: Math.max(0, diffDays),
        bucket,
        total: inv.total,
        paidAmount: inv.paid_amount,
        remainingAmount: amount,
      };
    });

    summary.current = Math.round(summary.current * 100) / 100;
    summary.days_1_30 = Math.round(summary.days_1_30 * 100) / 100;
    summary.days_31_60 = Math.round(summary.days_31_60 * 100) / 100;
    summary.days_61_90 = Math.round(summary.days_61_90 * 100) / 100;
    summary.days_over_90 = Math.round(summary.days_over_90 * 100) / 100;
    summary.totalOutstanding = Math.round(summary.totalOutstanding * 100) / 100;

    return {
      summary,
      invoices: invoiceList,
    };
  }

  async getAPAging(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        company_id: companyId,
        type: { in: ['AP', 'VENDOR_BILL'] },
        status: { in: ['POSTED', 'PARTIALLY PAID'] },
        remaining_amount: { gt: 0.01 },
      },
      include: {
        supplier: true,
      },
      orderBy: { due_date: 'asc' },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const summary = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0,
      totalOutstanding: 0,
    };

    const invoiceList = invoices.map((inv) => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const amount = inv.remaining_amount;

      summary.totalOutstanding += amount;

      let bucket = 'current';
      if (diffDays <= 0) {
        bucket = 'current';
        summary.current += amount;
      } else if (diffDays <= 30) {
        bucket = 'days_1_30';
        summary.days_1_30 += amount;
      } else if (diffDays <= 60) {
        bucket = 'days_31_60';
        summary.days_31_60 += amount;
      } else if (diffDays <= 90) {
        bucket = 'days_61_90';
        summary.days_61_90 += amount;
      } else {
        bucket = 'days_over_90';
        summary.days_over_90 += amount;
      }

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        supplierId: inv.supplier_id,
        supplierName: inv.supplier?.name || 'N/A',
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        overdueDays: Math.max(0, diffDays),
        bucket,
        total: inv.total,
        paidAmount: inv.paid_amount,
        remainingAmount: amount,
      };
    });

    summary.current = Math.round(summary.current * 100) / 100;
    summary.days_1_30 = Math.round(summary.days_1_30 * 100) / 100;
    summary.days_31_60 = Math.round(summary.days_31_60 * 100) / 100;
    summary.days_61_90 = Math.round(summary.days_61_90 * 100) / 100;
    summary.days_over_90 = Math.round(summary.days_over_90 * 100) / 100;
    summary.totalOutstanding = Math.round(summary.totalOutstanding * 100) / 100;

    return {
      summary,
      invoices: invoiceList,
    };
  }

  async getCustomerStatement(companyId: string, customerId: string) {
    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          customer_id: customerId,
          company_id: companyId,
          type: { in: ['AR', 'SALES_INVOICE'] },
          status: { in: ['POSTED', 'PARTIALLY PAID', 'PAID'] },
        },
        orderBy: { invoice_date: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: {
          customer_id: customerId,
          company_id: companyId,
        },
        include: {
          allocations: {
            where: { invoice_id: { not: null } },
          },
        },
        orderBy: { payment_date: 'asc' },
      }),
    ]);

    const activePayments = payments.filter(
      (p) => !p.deleted_at && (!p.notes || !p.notes.includes('[DIBATALKAN]')),
    );

    const timeline: any[] = [];

    for (const inv of invoices) {
      timeline.push({
        type: 'INVOICE',
        id: inv.id,
        reference: inv.invoice_number,
        date: inv.invoice_date,
        debit: inv.total,
        credit: 0,
        notes: `Faktur Penjualan: ${inv.invoice_number}`,
      });
    }

    for (const p of activePayments) {
      timeline.push({
        type: 'PAYMENT',
        id: p.id,
        reference: p.payment_number,
        date: p.payment_date,
        debit: 0,
        credit: p.amount,
        notes: p.notes || `Pembayaran: ${p.payment_number}`,
      });
    }

    // Sort chronologically
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;

    const entries = timeline.map((item) => {
      runningBalance += item.debit - item.credit;
      totalInvoiced += item.debit;
      totalPaid += item.credit;

      return {
        ...item,
        balance: Math.round(runningBalance * 100) / 100,
      };
    });

    const openInvoices = invoices.filter((i) => i.status !== 'PAID' && i.remaining_amount > 0.01);
    const totalRemainingAR = openInvoices.reduce((sum, i) => sum + i.remaining_amount, 0);

    return {
      customerId,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstandingAR: Math.round(totalRemainingAR * 100) / 100,
      closingBalance: Math.round(runningBalance * 100) / 100,
      entries,
    };
  }

  async getSupplierStatement(companyId: string, supplierId: string) {
    const [bills, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          supplier_id: supplierId,
          company_id: companyId,
          type: { in: ['AP', 'VENDOR_BILL'] },
          status: { in: ['POSTED', 'PARTIALLY PAID', 'PAID'] },
        },
        orderBy: { invoice_date: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: {
          customer_id: supplierId,
          company_id: companyId,
        },
        orderBy: { payment_date: 'asc' },
      }),
    ]);

    const activePayments = payments.filter(
      (p) => !p.deleted_at && (!p.notes || !p.notes.includes('[DIBATALKAN]')),
    );

    const timeline: any[] = [];
    for (const bill of bills) {
      timeline.push({
        type: 'BILL',
        id: bill.id,
        reference: bill.invoice_number,
        date: bill.invoice_date,
        debit: 0,
        credit: bill.total,
        notes: `Tagihan Vendor: ${bill.invoice_number}`,
      });
    }

    for (const p of activePayments) {
      timeline.push({
        type: 'PAYMENT',
        id: p.id,
        reference: p.payment_number,
        date: p.payment_date,
        debit: p.amount,
        credit: 0,
        notes: p.notes || `Pembayaran Vendor: ${p.payment_number}`,
      });
    }

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const entries = timeline.map((item) => {
      runningBalance += item.credit - item.debit;
      return {
        ...item,
        balance: Math.round(runningBalance * 100) / 100,
      };
    });

    return {
      supplierId,
      closingBalance: Math.round(runningBalance * 100) / 100,
      entries,
    };
  }
}
