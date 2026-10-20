import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SalesCompletedEvent } from '../events/sales-completed.event';
import { GlService } from '../gl/gl.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountingListener {
  private readonly logger = new Logger(AccountingListener.name);

  constructor(
    private glService: GlService,
    private prisma: PrismaService
  ) {}

  @OnEvent('sales.completed', { async: false })
  async handleSalesCompleted(event: SalesCompletedEvent) {
    this.logger.log(`Processing SalesCompleted event for SO ${event.sourceEntityId}`);
    const tx = event.tx || this.prisma;

    try {
      // 1. Idempotency Check
      const existing = await tx.journalEntry.findFirst({
        where: {
          company_id: event.companyId,
          reference_type: 'POS',
          reference_id: event.sourceEntityId
        }
      });

      if (existing) {
        this.logger.warn(`Journal entry already exists for POS sale ${event.sourceEntityId}. Skipping.`);
        return;
      }

      // Helper to get or create AccountType
      const getAccountType = async (code: string, name: string, normalBalance: string) => {
        let type = await tx.accountType.findFirst({ where: { company_id: event.companyId, code } });
        if (!type) {
          type = await tx.accountType.create({ data: { company_id: event.companyId, code, name, normal_balance: normalBalance } });
        }
        return type.id;
      };

      const assetTypeId = await getAccountType('ASSET', 'Asset', 'DEBIT');
      const revenueTypeId = await getAccountType('REVENUE', 'Revenue', 'CREDIT');

      // Helper to get or create ChartOfAccount
      const getAccount = async (code: string, name: string, typeId: string) => {
        let account = await tx.chartOfAccount.findFirst({ where: { company_id: event.companyId, account_code: code } });
        if (!account) account = await tx.chartOfAccount.findFirst({ where: { company_id: event.companyId, account_name: name } });
        if (!account) {
          account = await tx.chartOfAccount.create({ 
            data: { company_id: event.companyId, account_code: code, account_name: name, account_type_id: typeId } 
          });
        }
        return account.id;
      };

      // 2. Determine Accounts based on payment method
      let debitAccountId: string;
      if (event.payload.paymentMethod === 'CASH') {
        debitAccountId = await getAccount('1-1001', 'Kas Utama', assetTypeId);
      } else {
        debitAccountId = await getAccount('1-1002', 'Bank (QRIS/EDC)', assetTypeId);
      }

      const creditAccountId = await getAccount('4-1001', 'Pendapatan Penjualan POS', revenueTypeId);

      // 3. Create Journal Entry via GlService
      await this.glService.createJournalEntryWithinTx(tx as any, {
        companyId: event.companyId,
        entryDate: event.occurredAt,
        referenceType: 'POS',
        referenceId: event.sourceEntityId,
        description: `Penjualan POS (Event ${event.eventId})`,
        items: [
          { accountId: debitAccountId, debit: event.payload.totalAmount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: event.payload.totalAmount },
        ]
      });

      this.logger.log(`Successfully created journal entry for SO ${event.sourceEntityId}`);
    } catch (error: any) {
      this.logger.error(`Failed to process accounting for SO ${event.sourceEntityId}: ${error.message}`);
      throw error; // Let the transaction rollback
    }
  }
}
