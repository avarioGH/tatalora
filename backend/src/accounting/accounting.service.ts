import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { GlService } from '../gl/gl.service';

export interface CreateJournalDto {
  companyId: string;
  journalNo: string;
  referenceType: string;
  referenceId?: string;
  journalDate: Date;
  description?: string;
  userId: string;
  items: {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private glService: GlService,
  ) {}

  /**
   * Auto Journal Engine
   * Routes domain-level journal requests through the authoritative GlService
   * accounting engine, ensuring cash synchronization and single source of truth.
   */
  async createJournalEntry(
    data: CreateJournalDto,
    tx?: Prisma.TransactionClient,
  ) {
    // If no transaction is provided, start a new one to guarantee atomicity of JE + AuditLog
    const executeWithinTx = async (transaction: Prisma.TransactionClient) => {
      // 1. Delegate to authoritative GL engine
      // Note: GlService.createJournalEntryWithinTx automatically performs:
      // - Period validation (OPEN/CLOSED/LOCKED)
      // - Balance check (Debit == Credit)
      // - JournalEntry and JournalEntryLine creation
      // - CashAccount.current_balance synchronization
      const journal = await this.glService.createJournalEntryWithinTx(
        transaction,
        {
          companyId: data.companyId,
          entryDate: data.journalDate,
          referenceType: data.referenceType,
          referenceId: data.referenceId || '', // GlService expects string, fallback to empty string if undefined
          description: data.description,
          items: data.items.map((item) => ({
            accountId: item.accountId,
            debit: item.debit,
            credit: item.credit,
            description: item.description,
          })),
          // Pass userId to GlService via type casting since it expects it informally
          ...({ userId: data.userId } as any),
        },
      );

      // 2. Override the auto-generated JNL- journal_no with the caller's requested journalNo
      // (AccountingService callers expect to provide their own journalNo like 'J-123')
      const finalJournal = await transaction.journalEntry.update({
        where: { id: journal.id },
        data: { journal_no: data.journalNo },
        include: { items: true },
      });

      // 3. Persist AuditLog within the same transaction boundary
      await transaction.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'AUTO_JOURNAL_CREATED',
          entity: 'JournalEntry',
          entity_id: finalJournal.id,
        },
      });

      return finalJournal;
    };

    if (tx) {
      return await executeWithinTx(tx);
    } else {
      return await this.prisma.$transaction(executeWithinTx);
    }
  }

  /**
   * Reverse Journal Engine
   * Delegates to authoritative GlService to reverse journal and restore cash balances exactly once.
   */
  async reverseJournal(
    originalJournalId: string,
    reason: string,
    userId: string,
  ) {
    // 1. We must fetch the original journal to know the companyId for GlService
    const original = await this.prisma.journalEntry.findUnique({
      where: { id: originalJournalId },
    });

    if (!original) throw new BadRequestException('Journal not found');

    // 2. Delegate to GlService which handles period validation, cash reversal, and reversing entry creation.
    try {
      const reversedJournal = await this.glService.reverseJournal(
        original.company_id,
        originalJournalId,
        reason,
        userId,
      );
      return reversedJournal;
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
