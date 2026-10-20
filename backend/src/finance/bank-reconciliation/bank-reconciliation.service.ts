import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GlService } from '../../gl/gl.service';
import { Prisma } from '@prisma/client';

export interface ImportStatementDto {
  cashAccountId: string;
  statementDate: Date;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  lines: {
    transactionDate: Date;
    reference?: string;
    description: string;
    debit: number;
    credit: number;
    amount: number;
    externalReference?: string;
  }[];
}

@Injectable()
export class BankReconciliationService {
  constructor(
    private prisma: PrismaService,
    private glService: GlService,
  ) {}

  async importStatement(
    companyId: string,
    data: ImportStatementDto,
    userId: string,
    ipAddress?: string,
    browser?: string,
  ) {
    const idempotencyKey = `${companyId}-${data.cashAccountId}-${data.startDate.toISOString()}-${data.endDate.toISOString()}-${data.openingBalance}-${data.closingBalance}`;

    const existing = await (this.prisma as any).bankStatement.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existing) {
      throw new BadRequestException(
        'Statement has already been imported (duplicate detected).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const statement = await (tx as any).bankStatement.create({
        data: {
          company_id: companyId,
          cash_account_id: data.cashAccountId,
          statement_date: data.statementDate,
          start_date: data.startDate,
          end_date: data.endDate,
          opening_balance: data.openingBalance,
          closing_balance: data.closingBalance,
          status: 'IMPORTED',
          idempotency_key: idempotencyKey,
          lines: {
            create: data.lines.map((l) => ({
              transaction_date: l.transactionDate,
              reference: l.reference,
              description: l.description,
              debit: l.debit,
              credit: l.credit,
              amount: l.amount,
              external_reference: l.externalReference,
              status: 'UNMATCHED',
            })),
          },
        },
        include: { lines: true },
      });

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          ip_address: ipAddress,
          browser: browser,
          action: 'BANK_STATEMENT_IMPORT',
          entity: 'BankStatement',
          entity_id: statement.id,
          after_data: { linesCount: data.lines.length } as any,
        },
      });

      return statement;
    });
  }

  async getStatement(companyId: string, statementId: string) {
    const statement = await (this.prisma as any).bankStatement.findFirst({
      where: { id: statementId, company_id: companyId },
      include: { lines: true },
    });
    if (!statement) throw new NotFoundException('Statement not found');
    return statement;
  }

  async suggestMatches(
    companyId: string,
    statementId: string,
    userId: string,
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const statement = await (tx as any).bankStatement.findFirst({
        where: { id: statementId, company_id: companyId },
        include: {
          lines: { where: { status: 'UNMATCHED' } },
          cash_account: true,
        },
      });

      if (!statement) throw new NotFoundException('Statement not found');
      if (!statement.cash_account.chart_of_account_id)
        throw new BadRequestException('Cash account missing GL mapping');

      const coaId = statement.cash_account.chart_of_account_id;

      // Find unmatched GL lines for this account
      // We look for journal entries posted, and not fully matched
      const allMatches = await (tx as any).bankReconciliationMatch.findMany({
        where: {
          reconciliation: { cash_account_id: statement.cash_account_id },
        },
        select: { journal_entry_line_id: true, matched_amount: true },
      });

      const matchedGlMap = new Map<string, number>();
      allMatches.forEach((m) => {
        const amt = matchedGlMap.get(m.journal_entry_line_id) || 0;
        matchedGlMap.set(m.journal_entry_line_id, amt + m.matched_amount);
      });

      const startWindow = new Date(statement.start_date);
      startWindow.setDate(startWindow.getDate() - 7);
      const endWindow = new Date(statement.end_date);
      endWindow.setDate(endWindow.getDate() + 7);

      const glLines = await tx.journalEntryItem.findMany({
        where: {
          account_id: coaId,
          journal_entry: {
            company_id: companyId,
            status: 'Posted',
            journal_date: { gte: startWindow, lte: endWindow },
          },
        },
        include: { journal_entry: true },
      });

      const availableGlLines = glLines
        .map((gl) => {
          const netAmt = gl.debit - gl.credit;
          const matchedAmt = matchedGlMap.get(gl.id) || 0;
          return { ...gl, netAmt, remainingAmt: netAmt - matchedAmt };
        })
        .filter((gl) => Math.abs(gl.remainingAmt) > 0.01);

      let suggestionsCount = 0;

      for (const line of statement.lines) {
        // Find an exact match by amount and close date
        const candidates = availableGlLines.filter((gl) => {
          const isSameAmt = Math.abs(gl.remainingAmt - line.amount) < 0.01;
          const diffDays =
            Math.abs(
              gl.journal_entry.journal_date.getTime() -
                line.transaction_date.getTime(),
            ) /
            (1000 * 3600 * 24);
          return isSameAmt && diffDays <= 3;
        });

        if (candidates.length === 1) {
          const candidate = candidates[0];

          const updateRes = await (tx as any).bankStatementLine.updateMany({
            where: { id: line.id, status: 'UNMATCHED' },
            data: {
              status: 'SUGGESTED',
              matched_journal_line_id: candidate.id,
              match_type: 'EXACT_AMOUNT',
            },
          });

          if (updateRes.count > 0) {
            suggestionsCount++;
            // Remove from available to prevent double suggesting the same GL line
            candidate.remainingAmt -= line.amount;
          }
        }
      }

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          ip_address: ipAddress,
          action: 'BANK_MATCH_SUGGEST',
          entity: 'BankStatement',
          entity_id: statementId,
          after_data: { suggestionsCount } as any,
        },
      });

      return { suggestionsCount };
    });
  }

  async matchLine(
    companyId: string,
    statementLineId: string,
    journalEntryLineId: string,
    userId: string,
    matchAmount?: number,
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const line = await (tx as any).bankStatementLine.findFirst({
        where: { id: statementLineId, statement: { company_id: companyId } },
        include: { statement: true },
      });
      if (!line) throw new NotFoundException('Statement line not found');
      if (line.status === 'MATCHED' || line.status === 'RECONCILED') {
        throw new BadRequestException('Line is already matched');
      }

      const jeLine = await tx.journalEntryItem.findFirst({
        where: {
          id: journalEntryLineId,
          journal_entry: { company_id: companyId },
        },
        include: { journal_entry: true },
      });
      if (!jeLine) throw new NotFoundException('Journal entry line not found');

      // Check existing matches for this line
      const existingMatches = await (
        tx as any
      ).bankReconciliationMatch.findMany({
        where: { statement_line_id: line.id },
      });
      const currentMatched = existingMatches.reduce(
        (sum, m) => sum + m.matched_amount,
        0,
      );

      const amountToMatch = matchAmount || line.amount - currentMatched;

      if (
        Math.abs(currentMatched + amountToMatch) >
        Math.abs(line.amount) + 0.01
      ) {
        throw new BadRequestException(
          'Cannot match more than the statement line amount',
        );
      }

      // Also check GL line available amount
      const existingGlMatches = await (
        tx as any
      ).bankReconciliationMatch.findMany({
        where: { journal_entry_line_id: jeLine.id },
      });
      const currentGlMatched = existingGlMatches.reduce(
        (sum, m) => sum + m.matched_amount,
        0,
      );
      const glNet = jeLine.debit - jeLine.credit;

      if (Math.abs(currentGlMatched + amountToMatch) > Math.abs(glNet) + 0.01) {
        throw new BadRequestException(
          'Cannot match more than the GL line available amount',
        );
      }

      const isFullyMatched =
        Math.abs(currentMatched + amountToMatch - line.amount) < 0.01;
      const targetStatus = isFullyMatched ? 'MATCHED' : 'PARTIALLY_MATCHED';

      const updateRes = await (tx as any).bankStatementLine.updateMany({
        where: {
          id: statementLineId,
          status: { in: ['UNMATCHED', 'SUGGESTED', 'PARTIALLY_MATCHED'] },
        },
        data: {
          status: targetStatus as any,
          matched_journal_line_id: jeLine.id, // Primary matched line
          match_type:
            isFullyMatched && existingMatches.length === 0
              ? 'MANUAL'
              : 'PARTIAL',
        },
      });

      if (updateRes.count === 0) {
        throw new BadRequestException('Line was modified concurrently');
      }

      let recon = await (tx as any).bankReconciliation.findFirst({
        where: { statement_id: line.statement_id },
      });

      if (!recon) {
        recon = await (tx as any).bankReconciliation.create({
          data: {
            company_id: companyId,
            cash_account_id: line.statement.cash_account_id,
            statement_id: line.statement_id,
            period_start: line.statement.start_date,
            period_end: line.statement.end_date,
            statement_balance: line.statement.closing_balance,
            book_balance: 0,
            difference: 0,
            status: 'DRAFT',
          },
        });
      }

      await (tx as any).bankReconciliationMatch.create({
        data: {
          reconciliation_id: recon.id,
          statement_line_id: line.id,
          journal_entry_line_id: jeLine.id,
          matched_amount: amountToMatch,
          match_type:
            isFullyMatched && existingMatches.length === 0
              ? 'MANUAL'
              : 'PARTIAL',
          created_by: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          ip_address: ipAddress,
          action: 'BANK_MATCH_LINE',
          entity: 'BankStatementLine',
          entity_id: line.id,
          after_data: { targetStatus, amountToMatch } as any,
        },
      });

      return { success: true, status: targetStatus };
    });
  }

  async unmatchLine(
    companyId: string,
    statementLineId: string,
    userId: string,
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const line = await (tx as any).bankStatementLine.findFirst({
        where: { id: statementLineId, statement: { company_id: companyId } },
      });
      if (!line) throw new NotFoundException('Line not found');

      await (tx as any).bankStatementLine.update({
        where: { id: statementLineId },
        data: {
          status: 'UNMATCHED',
          matched_journal_line_id: null,
          match_type: null,
        },
      });

      await (tx as any).bankReconciliationMatch.deleteMany({
        where: { statement_line_id: statementLineId },
      });

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          ip_address: ipAddress,
          action: 'BANK_UNMATCH_LINE',
          entity: 'BankStatementLine',
          entity_id: line.id,
        },
      });

      return { success: true };
    });
  }

  async createAdjustment(
    companyId: string,
    statementLineId: string,
    offsetAccountId: string,
    userId: string,
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const line = await (tx as any).bankStatementLine.findFirst({
        where: { id: statementLineId, statement: { company_id: companyId } },
        include: { statement: { include: { cash_account: true } } },
      });

      if (!line) throw new NotFoundException('Line not found');
      if (
        line.status === 'MATCHED' ||
        line.status === 'RECONCILED' ||
        line.status === 'PARTIALLY_MATCHED'
      ) {
        throw new BadRequestException(
          'Line already matched or partially matched',
        );
      }

      const cashAccount = line.statement.cash_account;
      if (!cashAccount.chart_of_account_id) {
        throw new BadRequestException(
          'Cash Account must have mapped Chart of Account',
        );
      }

      const isReceipt = line.amount > 0;
      const absAmount = Math.abs(line.amount);

      const jeItems = isReceipt
        ? [
            {
              accountId: cashAccount.chart_of_account_id,
              debit: absAmount,
              credit: 0,
            },
            { accountId: offsetAccountId, debit: 0, credit: absAmount },
          ]
        : [
            { accountId: offsetAccountId, debit: absAmount, credit: 0 },
            {
              accountId: cashAccount.chart_of_account_id,
              debit: 0,
              credit: absAmount,
            },
          ];

      const je = await this.glService.createJournalEntryWithinTx(tx as any, {
        companyId,
        entryDate: line.transaction_date,
        referenceType: 'BANK_ADJUSTMENT',
        referenceId: line.id,
        description: line.description || 'Bank Statement Adjustment',
        items: jeItems,
        // @ts-ignore
        userId,
      });

      const cashJeLine = await tx.journalEntryItem.findFirst({
        where: {
          journal_entry_id: je.id,
          account_id: cashAccount.chart_of_account_id,
        },
      });

      const updateRes = await (tx as any).bankStatementLine.updateMany({
        where: { id: line.id, status: { in: ['UNMATCHED', 'SUGGESTED'] } },
        data: {
          status: 'MATCHED',
          matched_journal_line_id: cashJeLine?.id,
          match_type: 'ADJUSTMENT',
        },
      });

      if (updateRes.count === 0)
        throw new BadRequestException('Concurrency conflict');

      let recon = await (tx as any).bankReconciliation.findFirst({
        where: { statement_id: line.statement_id },
      });

      if (!recon) {
        recon = await (tx as any).bankReconciliation.create({
          data: {
            company_id: companyId,
            cash_account_id: cashAccount.id,
            statement_id: line.statement_id,
            period_start: line.statement.start_date,
            period_end: line.statement.end_date,
            statement_balance: line.statement.closing_balance,
            book_balance: 0,
            difference: 0,
            status: 'DRAFT',
          },
        });
      }

      if (cashJeLine) {
        await (tx as any).bankReconciliationMatch.create({
          data: {
            reconciliation_id: recon.id,
            statement_line_id: line.id,
            journal_entry_line_id: cashJeLine.id,
            matched_amount: line.amount,
            match_type: 'ADJUSTMENT',
            created_by: userId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          ip_address: ipAddress,
          action: 'BANK_ADJUSTMENT_CREATED',
          entity: 'BankStatementLine',
          entity_id: line.id,
          after_data: { jeId: je.id } as any,
        },
      });

      return je;
    });
  }

  async finalizeReconciliation(
    companyId: string,
    statementId: string,
    userId: string,
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const statement = await (tx as any).bankStatement.findFirst({
        where: { id: statementId, company_id: companyId },
        include: { lines: true },
      });

      if (!statement) throw new NotFoundException('Statement not found');

      // Ensure no UNMATCHED or SUGGESTED or PARTIALLY_MATCHED
      const unresolved = statement.lines.some(
        (l) => l.status !== 'MATCHED' && l.status !== 'RECONCILED',
      );
      if (unresolved) {
        throw new BadRequestException(
          'Cannot finalize: Unmatched or partially matched lines exist.',
        );
      }

      let recon = await (tx as any).bankReconciliation.findFirst({
        where: { statement_id: statement.id },
      });

      if (!recon) {
        throw new BadRequestException(
          'Cannot finalize: No matching activity recorded.',
        );
      }
      if (recon.status === 'RECONCILED') {
        throw new BadRequestException('Reconciliation is already finalized.');
      }

      // Calculate book balance at statement.end_date
      const ca = await tx.cashAccount.findUnique({
        where: { id: recon.cash_account_id },
      });
      const glItems = await tx.journalEntryItem.aggregate({
        where: {
          account_id: ca!.chart_of_account_id!,
          journal_entry: {
            status: 'Posted',
            journal_date: { lte: statement.end_date },
          },
        },
        _sum: { debit: true, credit: true },
      });

      const bookBalance =
        (glItems._sum.debit || 0) - (glItems._sum.credit || 0);
      const difference = statement.closing_balance - bookBalance;

      // Update Reconciliation OCC
      const updateRes = await (tx as any).bankReconciliation.updateMany({
        where: { id: recon.id, status: 'DRAFT' },
        data: { status: 'RECONCILED', book_balance: bookBalance, difference },
      });

      if (updateRes.count === 0)
        throw new BadRequestException('Concurrency conflict on finalization');

      // Cascade RECONCILED to statement lines
      await (tx as any).bankStatementLine.updateMany({
        where: { statement_id: statement.id, status: 'MATCHED' },
        data: { status: 'RECONCILED' },
      });

      await (tx as any).bankStatement.update({
        where: { id: statement.id },
        data: { status: 'RECONCILED' },
      });

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          ip_address: ipAddress,
          action: 'BANK_RECONCILIATION_FINALIZED',
          entity: 'BankReconciliation',
          entity_id: recon.id,
          after_data: { difference, bookBalance } as any,
        },
      });

      return { success: true, difference };
    });
  }
}
