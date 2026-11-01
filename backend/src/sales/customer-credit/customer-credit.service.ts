import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GlService } from '../../gl/gl.service';
import { SequenceService } from '../../reports/sequence.service';

@Injectable()
export class CustomerCreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly glService: GlService,
    private readonly sequenceService: SequenceService,
  ) {}

  private roundMoney(amount: number): number {
    return Math.round(Number(amount || 0) * 100) / 100;
  }

  /**
   * Helper to resolve or create Chart of Account within transaction
   */
  async resolveAccount(
    tx: any,
    companyId: string,
    codes: string[],
    names: string[],
    expectedNormalBalance: 'Debit' | 'Credit' = 'Debit',
  ): Promise<string> {
    for (const code of codes) {
      const acc = await tx.chartOfAccount.findFirst({
        where: { company_id: companyId, account_code: code },
      });
      if (acc) return acc.id;
    }
    for (const name of names) {
      const acc = await tx.chartOfAccount.findFirst({
        where: { company_id: companyId, account_name: name },
      });
      if (acc) return acc.id;
    }

    let act = await tx.accountType.findFirst({
      where: { company_id: companyId, normal_balance: expectedNormalBalance },
    });
    if (!act) {
      act = await tx.accountType.findFirst({
        where: { normal_balance: expectedNormalBalance },
      });
    }
    if (!act) {
      act = await tx.accountType.create({
        data: {
          company_id: companyId,
          name: expectedNormalBalance === 'Credit' ? 'Kewajiban / Liabilitas' : 'Aset Lancar',
          normal_balance: expectedNormalBalance,
          code: (expectedNormalBalance === 'Credit' ? 'LIAB-' : 'ACT-') + Date.now(),
        },
      });
    }
    const newAcc = await tx.chartOfAccount.create({
      data: {
        company_id: companyId,
        account_code: codes[0],
        account_name: names[0],
        account_type_id: act.id,
      },
    });
    return newAcc.id;
  }

  /**
   * List all customer credit notes for a company with optional filters
   */
  async findAll(companyId: string, query?: { customerId?: string; status?: string }) {
    const where: any = { company_id: companyId };
    if (query?.customerId) where.customer_id = query.customerId;
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    return (this.prisma as any).customerCreditNote.findMany({
      where,
      include: {
        customer: true,
        sales_return: true,
        applications: {
          include: {
            invoice: true,
          },
        },
        refunds: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Find a single customer credit note by ID
   */
  async findOne(companyId: string, id: string) {
    const cc = await (this.prisma as any).customerCreditNote.findFirst({
      where: { id, company_id: companyId },
      include: {
        customer: true,
        sales_return: {
          include: {
            sales_order: true,
            items: { include: { product: true } },
          },
        },
        applications: {
          include: {
            invoice: true,
          },
        },
        refunds: true,
      },
    });
    if (!cc) throw new NotFoundException('Customer Credit Note tidak ditemukan');
    return cc;
  }

  /**
   * Create and Post a dedicated CustomerCreditNote from a posted SalesReturn.
   * Atomic, idempotent, replaces negative invoice usage.
   */
  async createFromSalesReturn(
    companyId: string,
    salesReturnId: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const sr = await tx.salesReturn.findFirst({
        where: { id: salesReturnId, company_id: companyId },
        include: { sales_order: true, items: true },
      });
      if (!sr) throw new NotFoundException('Sales Return tidak ditemukan');
      if (sr.status !== 'POSTED') {
        throw new BadRequestException('Hanya Sales Return berstatus POSTED yang dapat dibuatkan Customer Credit Note');
      }

      // Prevent duplicate credit notes for the same sales return
      const existing = await tx.customerCreditNote.findFirst({
        where: { company_id: companyId, sales_return_id: sr.id },
      });
      if (existing) {
        if (existing.status !== 'REVERSED') {
          return existing; // Idempotent return
        }
      }

      // Generate sequential credit note number (CCN/YYYY/00001)
      let creditNoteNumber: string;
      try {
        creditNoteNumber = await this.sequenceService.generateNumber(
          tx,
          companyId,
          'CUSTOMER_CREDIT_NOTE',
          'CCN',
          5,
        );
      } catch {
        creditNoteNumber = `CCN-${Date.now()}`;
      }

      const subtotal = this.roundMoney(sr.total_amount || 0);
      const taxAmount = 0; // Tax is managed according to invoice rules
      const totalAmount = this.roundMoney(subtotal + taxAmount);

      const cc = await tx.customerCreditNote.create({
        data: {
          company_id: companyId,
          credit_note_number: creditNoteNumber,
          customer_id: sr.customer_id,
          sales_return_id: sr.id,
          currency: 'IDR',
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          remaining_credit: totalAmount,
          status: 'POSTED',
          created_by: userId,
        },
      });

      return cc;
    });
  }

  /**
   * Apply Customer Credit Note to one or more eligible open Customer Invoices.
   * Concurrency-guarded, strictly non-cash, atomic GL posting.
   */
  async applyCredit(
    companyId: string,
    creditNoteId: string,
    data: { invoiceId: string; amount: number; notes?: string; idempotencyKey?: string },
    userId?: string,
  ) {
    const allocAmount = this.roundMoney(data.amount);
    if (allocAmount <= 0) {
      throw new BadRequestException('Jumlah alokasi credit note harus lebih besar dari 0');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Idempotency Check
      if (data.idempotencyKey) {
        const existingApp = await tx.customerCreditApplication.findFirst({
          where: {
            credit_note_id: creditNoteId,
            invoice_id: data.invoiceId,
            idempotency_key: data.idempotencyKey,
            status: 'APPLIED',
          },
        });
        if (existingApp) {
          const cc = await tx.customerCreditNote.findUnique({ where: { id: creditNoteId } });
          const inv = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
          return {
            success: true,
            idempotent: true,
            applicationId: existingApp.id,
            remainingCredit: cc.remaining_credit,
            remainingInvoice: inv.remaining_amount,
          };
        }
      }

      // 2. Concurrency Lock: Order by ID to eliminate deadlocks
      if (typeof tx.$executeRaw === 'function') {
        const lockIds = [creditNoteId, data.invoiceId].sort();
        for (const id of lockIds) {
          if (id === creditNoteId) {
            await tx.$executeRaw`SELECT 1 FROM "CustomerCreditNote" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          } else {
            await tx.$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          }
        }
      }

      // 3. Fetch and validate Customer Credit Note
      const cc = await tx.customerCreditNote.findFirst({
        where: { id: creditNoteId, company_id: companyId },
      });
      if (!cc) throw new NotFoundException('Customer Credit Note tidak ditemukan');
      if (cc.status === 'REVERSED' || cc.status === 'DRAFT') {
        throw new BadRequestException(`Credit note berstatus ${cc.status} tidak dapat dialokasikan`);
      }
      if (allocAmount > cc.remaining_credit) {
        throw new BadRequestException(
          `Jumlah alokasi (${allocAmount}) melebihi saldo kredit yang tersedia (${cc.remaining_credit})`,
        );
      }

      // 4. Fetch and validate Target Invoice (AR)
      const inv = await tx.invoice.findFirst({
        where: { id: data.invoiceId, company_id: companyId, type: 'AR' },
      });
      if (!inv) throw new NotFoundException('Faktur Penjualan tidak ditemukan');
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED' || inv.status === 'VOID') {
        throw new BadRequestException(`Faktur Penjualan berstatus ${inv.status} tidak dapat dialokasikan`);
      }
      if (inv.remaining_amount <= 0 || inv.status === 'PAID') {
        throw new BadRequestException('Faktur Penjualan ini sudah lunas');
      }

      // 5. Cross-Customer & Cross-Company Guard
      if (cc.customer_id !== inv.customer_id) {
        throw new BadRequestException('Credit note berasal dari pelanggan yang berbeda dengan Faktur');
      }
      if (allocAmount > inv.remaining_amount) {
        throw new BadRequestException(
          `Jumlah alokasi (${allocAmount}) melebihi sisa tagihan faktur (${inv.remaining_amount})`,
        );
      }

      // 6. Optimistic / atomic conditional updates
      const newInvRemaining = this.roundMoney(inv.remaining_amount - allocAmount);
      const newInvPaid = this.roundMoney(inv.paid_amount + allocAmount);
      const newInvStatus = newInvRemaining <= 0 ? 'PAID' : 'PARTIALLY PAID';

      const updateInv = await tx.invoice.updateMany({
        where: { id: inv.id, remaining_amount: { gte: allocAmount } },
        data: {
          paid_amount: newInvPaid,
          remaining_amount: newInvRemaining,
          status: newInvStatus,
        },
      });
      if (updateInv.count === 0) {
        throw new BadRequestException('Konflik konkurensi: Sisa tagihan Faktur berubah saat pemrosesan');
      }

      const newCreditRemaining = this.roundMoney(cc.remaining_credit - allocAmount);
      const newCreditStatus = newCreditRemaining <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';

      const updateCredit = await tx.customerCreditNote.updateMany({
        where: { id: cc.id, remaining_credit: { gte: allocAmount } },
        data: {
          remaining_credit: newCreditRemaining,
          status: newCreditStatus,
        },
      });
      if (updateCredit.count === 0) {
        throw new BadRequestException('Konflik konkurensi: Saldo credit note berubah saat pemrosesan');
      }

      // 7. Record Customer Credit Application history
      const application = await tx.customerCreditApplication.create({
        data: {
          company_id: companyId,
          credit_note_id: cc.id,
          invoice_id: inv.id,
          amount: allocAmount,
          status: 'APPLIED',
          notes: data.notes,
          idempotency_key: data.idempotencyKey,
          applied_by: userId,
        },
      });

      // 8. GL Journal Entry:
      // Debit Customer Credit Liability (2-1200 / Hutang Retur Pelanggan)
      // Credit Piutang Usaha / Accounts Receivable (1-1200 / 1-1100)
      // ZERO cash movement!
      const liabilityAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1200', '2-1210', '2120'],
        ['Hutang Retur Penjualan / Customer Credit', 'Uang Muka Penjualan', 'Customer Deposit'],
        'Credit',
      );
      const arAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['1-1200', '1-1100', '1120', '1100'],
        ['Piutang Usaha', 'Accounts Receivable'],
        'Debit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CUSTOMER_CREDIT_APPLICATION',
        referenceId: application.id,
        description: `Alokasi Nota Kredit ${cc.credit_note_number} ke Faktur Penjualan ${inv.invoice_number}`,
        items: [
          { accountId: liabilityAccountId, debit: allocAmount, credit: 0 },
          { accountId: arAccountId, debit: 0, credit: allocAmount },
        ],
      });

      return {
        success: true,
        applicationId: application.id,
        creditNoteNumber: cc.credit_note_number,
        invoiceNumber: inv.invoice_number,
        appliedAmount: allocAmount,
        remainingCredit: newCreditRemaining,
        remainingInvoice: newInvRemaining,
        creditStatus: newCreditStatus,
        invoiceStatus: newInvStatus,
      };
    });
  }

  /**
   * Customer Refund workflow: Cash/Bank disbursed for remaining customer credit note.
   * Posts Dr Customer Credit Liability (2-1200), Cr Kas/Bank (1-1001).
   */
  async refundCredit(
    companyId: string,
    creditNoteId: string,
    data: { cashAccountId: string; amount: number; reference?: string; notes?: string; idempotencyKey?: string },
    userId?: string,
  ) {
    const refundAmount = this.roundMoney(data.amount);
    if (refundAmount <= 0) {
      throw new BadRequestException('Jumlah pengembalian dana (refund) harus lebih besar dari 0');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Idempotency Check
      if (data.idempotencyKey) {
        const existingRef = await tx.customerCreditRefund.findFirst({
          where: {
            credit_note_id: creditNoteId,
            idempotency_key: data.idempotencyKey,
            status: 'COMPLETED',
          },
        });
        if (existingRef) {
          const cc = await tx.customerCreditNote.findUnique({ where: { id: creditNoteId } });
          return {
            success: true,
            idempotent: true,
            refundId: existingRef.id,
            remainingCredit: cc.remaining_credit,
          };
        }
      }

      // 2. Concurrency Lock on Credit Note
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT 1 FROM "CustomerCreditNote" WHERE id = ${creditNoteId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      const cc = await tx.customerCreditNote.findFirst({
        where: { id: creditNoteId, company_id: companyId },
      });
      if (!cc) throw new NotFoundException('Customer Credit Note tidak ditemukan');
      if (cc.status === 'REVERSED' || cc.status === 'DRAFT') {
        throw new BadRequestException(`Credit note berstatus ${cc.status} tidak dapat direfund`);
      }
      if (refundAmount > cc.remaining_credit) {
        throw new BadRequestException(
          `Jumlah refund (${refundAmount}) melebihi saldo kredit yang tersedia (${cc.remaining_credit})`,
        );
      }

      // 3. Verify Cash Account
      const cashAcc = await tx.cashAccount.findFirst({
        where: { id: data.cashAccountId, company_id: companyId },
      });
      if (!cashAcc) throw new BadRequestException('Akun Kas/Bank tidak valid untuk perusahaan ini');

      // 4. Update Credit Note balance
      const newRemaining = this.roundMoney(cc.remaining_credit - refundAmount);
      const newStatus = newRemaining <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';

      const updateCredit = await tx.customerCreditNote.updateMany({
        where: { id: cc.id, remaining_credit: { gte: refundAmount } },
        data: {
          remaining_credit: newRemaining,
          status: newStatus,
        },
      });
      if (updateCredit.count === 0) {
        throw new BadRequestException('Konflik konkurensi: Saldo credit note berubah saat pemrosesan refund');
      }

      // 5. Generate Refund Number
      let refundNumber: string;
      try {
        refundNumber = await this.sequenceService.generateNumber(
          tx,
          companyId,
          'CUSTOMER_REFUND',
          'CREF',
          5,
        );
      } catch {
        refundNumber = `CREF-${Date.now()}`;
      }

      // 6. Record CustomerCreditRefund
      const refund = await tx.customerCreditRefund.create({
        data: {
          company_id: companyId,
          credit_note_id: cc.id,
          refund_number: refundNumber,
          cash_account_id: cashAcc.id,
          amount: refundAmount,
          reference: data.reference,
          idempotency_key: data.idempotencyKey,
          status: 'COMPLETED',
          refund_date: new Date(),
          notes: data.notes,
          created_by: userId,
        },
      });

      // 7. Record Cash Out in FinanceTransaction ledger
      await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          transaction_no: 'TRX-' + Date.now(),
          transaction_type: 'Cash Out',
          cash_account_id: cashAcc.id,
          reference_type: 'CUSTOMER_REFUND',
          reference_id: refund.id,
          transaction_date: refund.refund_date,
          status: 'COMPLETED',
          description: `Pengembalian Dana Pelanggan (Refund) atas Nota Kredit ${cc.credit_note_number}`,
          total_amount: refundAmount,
          created_by: userId || '000000000000000000000000',
        },
      });

      // Update cashAccount current_balance (disbursement reduces balance)
      await tx.cashAccount.update({
        where: { id: cashAcc.id },
        data: {
          current_balance: { decrement: refundAmount },
        },
      });

      // 8. GL Journal Entry: Debit Customer Credit Liability (2-1200), Credit Kas/Bank (1-1001)
      const cashGlAccount = cashAcc.chart_of_account_id || (await this.resolveAccount(
        tx,
        companyId,
        ['1-1001', '1001', '1-1002'],
        ['Kas Utama', 'Bank', cashAcc.name],
        'Debit',
      ));

      const liabilityAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1200', '2-1210', '2120'],
        ['Hutang Retur Penjualan / Customer Credit', 'Uang Muka Penjualan', 'Customer Deposit'],
        'Credit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CUSTOMER_REFUND',
        referenceId: refund.id,
        description: `Pengeluaran Refund Pelanggan atas Nota Kredit ${cc.credit_note_number}`,
        items: [
          { accountId: liabilityAccountId, debit: refundAmount, credit: 0 },
          { accountId: cashGlAccount, debit: 0, credit: refundAmount },
        ],
      });

      return {
        success: true,
        refundId: refund.id,
        refundNumber: refund.refund_number,
        creditNoteNumber: cc.credit_note_number,
        refundAmount: refundAmount,
        remainingCredit: newRemaining,
        creditStatus: newStatus,
      };
    });
  }

  /**
   * Reversal of Customer Credit Application:
   * Restores invoice remaining_amount and credit note remaining_credit.
   * Reverses GL journal entry using compensating reversal.
   */
  async reverseApplication(
    companyId: string,
    applicationId: string,
    reason: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const app = await tx.customerCreditApplication.findFirst({
        where: { id: applicationId, company_id: companyId },
        include: { credit_note: true, invoice: true },
      });
      if (!app) throw new NotFoundException('Alokasi credit note tidak ditemukan');
      if (app.status === 'REVERSED') {
        throw new BadRequestException('Alokasi ini sudah pernah dibatalkan (reversed) sebelumnya');
      }

      // Concurrency lock
      if (typeof tx.$executeRaw === 'function') {
        const lockIds = [app.credit_note_id, app.invoice_id].sort();
        for (const id of lockIds) {
          if (id === app.credit_note_id) {
            await tx.$executeRaw`SELECT 1 FROM "CustomerCreditNote" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          } else {
            await tx.$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          }
        }
      }

      // 1. Mark Application as REVERSED
      await tx.customerCreditApplication.update({
        where: { id: app.id },
        data: {
          status: 'REVERSED',
          reversal_reason: reason,
          reversed_at: new Date(),
          reversed_by: userId,
        },
      });

      // 2. Restore Invoice AR
      const restoredRemaining = this.roundMoney(app.invoice.remaining_amount + app.amount);
      const restoredPaid = this.roundMoney(Math.max(0, app.invoice.paid_amount - app.amount));
      const restoredStatus = restoredPaid <= 0 ? 'POSTED' : 'PARTIALLY PAID';

      await tx.invoice.update({
        where: { id: app.invoice_id },
        data: {
          remaining_amount: restoredRemaining,
          paid_amount: restoredPaid,
          status: restoredStatus,
        },
      });

      // 3. Restore Credit Note remaining credit
      const restoredCredit = this.roundMoney(app.credit_note.remaining_credit + app.amount);
      const restoredCreditStatus = restoredCredit >= app.credit_note.total_amount ? 'POSTED' : 'PARTIALLY_APPLIED';

      await tx.customerCreditNote.update({
        where: { id: app.credit_note_id },
        data: {
          remaining_credit: restoredCredit,
          status: restoredCreditStatus,
        },
      });

      // 4. Compensating GL Journal: Debit Piutang Usaha (1-1200), Credit Customer Credit Liability (2-1200)
      const liabilityAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1200', '2-1210', '2120'],
        ['Hutang Retur Penjualan / Customer Credit', 'Uang Muka Penjualan', 'Customer Deposit'],
        'Credit',
      );
      const arAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['1-1200', '1-1100', '1120', '1100'],
        ['Piutang Usaha', 'Accounts Receivable'],
        'Debit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CUSTOMER_CREDIT_APPLICATION_REVERSAL',
        referenceId: app.id,
        description: `Pembatalan Alokasi Nota Kredit ${app.credit_note.credit_note_number}: ${reason}`,
        items: [
          { accountId: arAccountId, debit: app.amount, credit: 0 },
          { accountId: liabilityAccountId, debit: 0, credit: app.amount },
        ],
      });

      return {
        success: true,
        restoredCredit,
        restoredRemainingInvoice: restoredRemaining,
      };
    });
  }

  /**
   * Reversal of Customer Credit Note itself:
   * Only permitted if NO active applications or refunds exist (remaining_credit === total_amount).
   */
  async reverseCreditNote(
    companyId: string,
    creditNoteId: string,
    reason: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const cc = await tx.customerCreditNote.findFirst({
        where: { id: creditNoteId, company_id: companyId },
        include: { applications: true, refunds: true },
      });
      if (!cc) throw new NotFoundException('Customer Credit Note tidak ditemukan');
      if (cc.status === 'REVERSED') {
        throw new BadRequestException('Credit Note sudah pernah dibatalkan (reversed) sebelumnya');
      }

      // Concurrency lock
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT 1 FROM "CustomerCreditNote" WHERE id = ${creditNoteId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // Check if any active applications or refunds exist
      const activeApps = (cc.applications || []).filter((a: any) => a.status === 'APPLIED');
      if (activeApps.length > 0) {
        throw new BadRequestException(
          `Tidak dapat membatalkan Credit Note: Masih terdapat ${activeApps.length} alokasi aktif. Batalkan alokasi terlebih dahulu.`,
        );
      }

      const activeRefunds = (cc.refunds || []).filter((r: any) => r.status === 'COMPLETED');
      if (activeRefunds.length > 0) {
        throw new BadRequestException(
          `Tidak dapat membatalkan Credit Note: Masih terdapat ${activeRefunds.length} refund aktif.`,
        );
      }

      if (cc.remaining_credit < cc.total_amount) {
        throw new BadRequestException(
          'Tidak dapat membatalkan Credit Note: Sebagian saldo telah dialokasikan atau direfund.',
        );
      }

      // Update status to REVERSED
      await tx.customerCreditNote.update({
        where: { id: cc.id },
        data: {
          status: 'REVERSED',
          remaining_credit: 0,
        },
      });

      return {
        success: true,
        message: 'Customer Credit note berhasil dibatalkan',
        creditNoteNumber: cc.credit_note_number,
      };
    });
  }
}
