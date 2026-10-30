import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GlService } from '../../gl/gl.service';
import { SequenceService } from '../../reports/sequence.service';

@Injectable()
export class SupplierCreditService {
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
   * List all supplier credit notes for a company with optional filters
   */
  async findAll(companyId: string, query?: { supplierId?: string; status?: string }) {
    const where: any = { company_id: companyId };
    if (query?.supplierId) where.supplier_id = query.supplierId;
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    return (this.prisma as any).supplierCreditNote.findMany({
      where,
      include: {
        supplier: true,
        purchase_return: true,
        applications: {
          include: {
            vendor_bill: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Find a single supplier credit note by ID
   */
  async findOne(companyId: string, id: string) {
    const sc = await (this.prisma as any).supplierCreditNote.findFirst({
      where: { id, company_id: companyId },
      include: {
        supplier: true,
        purchase_return: {
          include: {
            purchase_order: true,
            items: { include: { product: true } },
          },
        },
        applications: {
          include: {
            vendor_bill: true,
          },
        },
      },
    });
    if (!sc) throw new NotFoundException('Supplier Credit Note tidak ditemukan');
    return sc;
  }

  /**
   * Create and Post a dedicated SupplierCreditNote from a posted PurchaseReturn.
   * Atomic, idempotent, and replaces negative invoice usage.
   */
  async createFromPurchaseReturn(
    companyId: string,
    purchaseReturnId: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Validate Purchase Return
      const pr = await tx.purchaseReturn.findUnique({
        where: { id: purchaseReturnId, company_id: companyId },
        include: { purchase_order: true, items: true },
      });
      if (!pr) throw new NotFoundException('Purchase Return tidak ditemukan');
      if (pr.status !== 'POSTED') {
        throw new BadRequestException('Hanya Purchase Return berstatus POSTED yang dapat dibuatkan Credit Note');
      }

      // 2. Prevent duplicate credit notes for the same return
      const existing = await tx.supplierCreditNote.findFirst({
        where: { company_id: companyId, purchase_return_id: pr.id },
      });
      if (existing) {
        if (existing.status !== 'REVERSED') {
          return existing; // Idempotent return
        }
      }

      // 3. Generate sequential credit note number (SCN/YYYY/00001)
      let creditNoteNumber: string;
      try {
        creditNoteNumber = await this.sequenceService.generateNumber(
          tx,
          companyId,
          'SUPPLIER_CREDIT_NOTE',
          'SCN',
          5,
        );
      } catch {
        creditNoteNumber = `SCN-${Date.now()}`;
      }

      // 4. Calculate amounts from PR items
      const subtotal = this.roundMoney(pr.total_amount || 0);
      const taxAmount = 0; // Tax is isolated separately in accounting reconciliation
      const totalAmount = this.roundMoney(subtotal + taxAmount);

      const sc = await tx.supplierCreditNote.create({
        data: {
          company_id: companyId,
          credit_note_number: creditNoteNumber,
          supplier_id: pr.supplier_id,
          purchase_return_id: pr.id,
          currency: 'IDR',
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          remaining_credit: totalAmount,
          status: 'POSTED',
          created_by: userId,
        },
      });

      return sc;
    });
  }

  /**
   * Apply Supplier Credit Note to one or more eligible Vendor Bills.
   * Concurrency-guarded, strictly non-cash, atomic GL posting.
   */
  async applyCredit(
    companyId: string,
    creditNoteId: string,
    data: { vendorBillId: string; amount: number; notes?: string; idempotencyKey?: string },
    userId?: string,
  ) {
    const allocAmount = this.roundMoney(data.amount);
    if (allocAmount <= 0) {
      throw new BadRequestException('Jumlah alokasi credit note harus lebih besar dari 0');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Idempotency Check
      if (data.idempotencyKey) {
        const existingApp = await tx.supplierCreditApplication.findFirst({
          where: {
            credit_note_id: creditNoteId,
            vendor_bill_id: data.vendorBillId,
            idempotency_key: data.idempotencyKey,
            status: 'APPLIED',
          },
        });
        if (existingApp) {
          const sc = await tx.supplierCreditNote.findUnique({ where: { id: creditNoteId } });
          const vb = await tx.invoice.findUnique({ where: { id: data.vendorBillId } });
          return {
            success: true,
            idempotent: true,
            applicationId: existingApp.id,
            remainingCredit: sc.remaining_credit,
            remainingBill: vb.remaining_amount,
          };
        }
      }

      // 2. Concurrency Lock: Order by ID to eliminate deadlocks
      if (typeof tx.$executeRaw === 'function') {
        const lockIds = [creditNoteId, data.vendorBillId].sort();
        for (const id of lockIds) {
          if (id === creditNoteId) {
            await tx.$executeRaw`SELECT 1 FROM "SupplierCreditNote" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          } else {
            await tx.$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          }
        }
      }

      // 3. Fetch and validate Credit Note
      const sc = await tx.supplierCreditNote.findFirst({
        where: { id: creditNoteId, company_id: companyId },
      });
      if (!sc) throw new NotFoundException('Supplier Credit Note tidak ditemukan');
      if (sc.status === 'REVERSED' || sc.status === 'DRAFT') {
        throw new BadRequestException(`Credit note berstatus ${sc.status} tidak dapat dialokasikan`);
      }
      if (allocAmount > sc.remaining_credit) {
        throw new BadRequestException(
          `Jumlah alokasi (${allocAmount}) melebihi saldo kredit yang tersedia (${sc.remaining_credit})`,
        );
      }

      // 4. Fetch and validate Target Vendor Bill
      const vb = await tx.invoice.findFirst({
        where: { id: data.vendorBillId, company_id: companyId, type: 'AP' },
      });
      if (!vb) throw new NotFoundException('Faktur Vendor Bill tidak ditemukan');
      if (vb.status === 'DRAFT' || vb.status === 'CANCELLED' || vb.status === 'VOID') {
        throw new BadRequestException(`Faktur Vendor Bill berstatus ${vb.status} tidak dapat dialokasikan`);
      }
      if (vb.remaining_amount <= 0 || vb.status === 'PAID') {
        throw new BadRequestException('Faktur Vendor Bill ini sudah lunas');
      }

      // 5. Cross-Supplier & Cross-Company Guard
      if (sc.supplier_id !== vb.supplier_id) {
        throw new BadRequestException('Credit note berasal dari supplier yang berbeda dengan Vendor Bill');
      }
      if (allocAmount > vb.remaining_amount) {
        throw new BadRequestException(
          `Jumlah alokasi (${allocAmount}) melebihi sisa tagihan faktur (${vb.remaining_amount})`,
        );
      }

      // 6. Optimistic / atomic conditional updates
      const newBillRemaining = this.roundMoney(vb.remaining_amount - allocAmount);
      const newBillPaid = this.roundMoney(vb.paid_amount + allocAmount);
      const newBillStatus = newBillRemaining <= 0 ? 'PAID' : 'PARTIALLY PAID';

      const updateBill = await tx.invoice.updateMany({
        where: { id: vb.id, remaining_amount: { gte: allocAmount } },
        data: {
          paid_amount: newBillPaid,
          remaining_amount: newBillRemaining,
          status: newBillStatus,
        },
      });
      if (updateBill.count === 0) {
        throw new BadRequestException('Konflik konkurensi: Sisa tagihan Vendor Bill berubah saat pemrosesan');
      }

      const newCreditRemaining = this.roundMoney(sc.remaining_credit - allocAmount);
      const newCreditStatus = newCreditRemaining <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';

      const updateCredit = await tx.supplierCreditNote.updateMany({
        where: { id: sc.id, remaining_credit: { gte: allocAmount } },
        data: {
          remaining_credit: newCreditRemaining,
          status: newCreditStatus,
        },
      });
      if (updateCredit.count === 0) {
        throw new BadRequestException('Konflik konkurensi: Saldo credit note berubah saat pemrosesan');
      }

      // 7. Record Credit Application history
      const application = await tx.supplierCreditApplication.create({
        data: {
          company_id: companyId,
          credit_note_id: sc.id,
          vendor_bill_id: vb.id,
          amount: allocAmount,
          status: 'APPLIED',
          notes: data.notes,
          idempotency_key: data.idempotencyKey,
          applied_by: userId,
        },
      });

      // 8. GL Journal Entry: Debit Hutang Usaha (2-1100), Credit Piutang Retur / Supplier Credit (1-1420)
      // ZERO cash movement!
      const apAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1100', '2100'],
        ['Hutang Usaha', 'Accounts Payable'],
        'Credit',
      );
      const creditAssetAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['1-1420', '1-1400', '1420'],
        ['Piutang Retur / Supplier Credit Balance', 'Piutang Retur Pembelian', 'Supplier Credit Balance'],
        'Debit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CREDIT_NOTE_APPLICATION',
        referenceId: application.id,
        description: `Alokasi Supplier Credit ${sc.credit_note_number} ke Faktur ${vb.invoice_number}`,
        items: [
          { accountId: apAccountId, debit: allocAmount, credit: 0 },
          { accountId: creditAssetAccountId, debit: 0, credit: allocAmount },
        ],
      });

      return {
        success: true,
        applicationId: application.id,
        creditNoteNumber: sc.credit_note_number,
        vendorBillNumber: vb.invoice_number,
        appliedAmount: allocAmount,
        remainingCredit: newCreditRemaining,
        remainingBill: newBillRemaining,
        creditStatus: newCreditStatus,
        billStatus: newBillStatus,
      };
    });
  }

  /**
   * Supplier Refund workflow: Cash/Bank received for remaining credit.
   * Separate from credit application, posts Dr Kas/Bank, Cr Piutang Retur (1-1420).
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
        const existingRef = await tx.supplierCreditRefund.findFirst({
          where: {
            credit_note_id: creditNoteId,
            idempotency_key: data.idempotencyKey,
            status: 'COMPLETED',
          },
        });
        if (existingRef) {
          const sc = await tx.supplierCreditNote.findUnique({ where: { id: creditNoteId } });
          return {
            success: true,
            idempotent: true,
            refundId: existingRef.id,
            remainingCredit: sc.remaining_credit,
          };
        }
      }

      // 2. Concurrency Lock on Credit Note
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT 1 FROM "SupplierCreditNote" WHERE id = ${creditNoteId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      const sc = await tx.supplierCreditNote.findFirst({
        where: { id: creditNoteId, company_id: companyId },
      });
      if (!sc) throw new NotFoundException('Supplier Credit Note tidak ditemukan');
      if (sc.status === 'REVERSED' || sc.status === 'DRAFT') {
        throw new BadRequestException(`Credit note berstatus ${sc.status} tidak dapat direfund`);
      }
      if (refundAmount > sc.remaining_credit) {
        throw new BadRequestException(
          `Jumlah refund (${refundAmount}) melebihi saldo kredit yang tersedia (${sc.remaining_credit})`,
        );
      }

      // 3. Verify Cash Account
      const cashAcc = await tx.cashAccount.findFirst({
        where: { id: data.cashAccountId, company_id: companyId },
      });
      if (!cashAcc) throw new BadRequestException('Akun Kas/Bank tidak valid untuk perusahaan ini');

      // 4. Update Credit Note balance
      const newRemaining = this.roundMoney(sc.remaining_credit - refundAmount);
      const newStatus = newRemaining <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';

      const updateCredit = await tx.supplierCreditNote.updateMany({
        where: { id: sc.id, remaining_credit: { gte: refundAmount } },
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
          'SUPPLIER_REFUND',
          'REF',
          5,
        );
      } catch {
        refundNumber = `REF-${Date.now()}`;
      }

      // 6. Record SupplierCreditRefund record
      const refund = await tx.supplierCreditRefund.create({
        data: {
          company_id: companyId,
          credit_note_id: sc.id,
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

      // 7. Record Cash In in FinanceTransaction ledger
      await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          transaction_no: 'TRX-' + Date.now(),
          transaction_type: 'Cash In',
          cash_account_id: cashAcc.id,
          reference_type: 'SUPPLIER_REFUND',
          reference_id: refund.id,
          transaction_date: refund.refund_date,
          status: 'COMPLETED',
          description: `Pengembalian Dana Supplier (Refund) atas Nota Kredit ${sc.credit_note_number}`,
          total_amount: refundAmount,
          created_by: userId || '000000000000000000000000',
        },
      });

      // Update cashAccount current_balance
      await tx.cashAccount.update({
        where: { id: cashAcc.id },
        data: {
          current_balance: { increment: refundAmount },
        },
      });

      // 8. GL Journal Entry: Debit Kas/Bank (1-1001), Credit Piutang Retur / Supplier Credit (1-1420)
      const cashGlAccount = cashAcc.chart_of_account_id || (await this.resolveAccount(
        tx,
        companyId,
        ['1-1001', '1001', '1-1002'],
        ['Kas Utama', 'Bank', cashAcc.name],
        'Debit',
      ));

      const creditAssetAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['1-1420', '1-1400', '1420'],
        ['Piutang Retur / Supplier Credit Balance', 'Piutang Retur Pembelian', 'Supplier Credit Balance'],
        'Debit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'SUPPLIER_REFUND',
        referenceId: refund.id,
        description: `Penerimaan Refund Supplier atas Credit Note ${sc.credit_note_number}`,
        items: [
          { accountId: cashGlAccount, debit: refundAmount, credit: 0 },
          { accountId: creditAssetAccountId, debit: 0, credit: refundAmount },
        ],
      });

      return {
        success: true,
        refundId: refund.id,
        refundNumber: refund.refund_number,
        creditNoteNumber: sc.credit_note_number,
        refundAmount: refundAmount,
        remainingCredit: newRemaining,
        creditStatus: newStatus,
      };
    });
  }

  /**
   * Reversal of Credit Application:
   * Restores bill remaining_amount and credit note remaining_credit.
   * Reverses GL journal entry using compensating reversal.
   */
  async reverseApplication(
    companyId: string,
    applicationId: string,
    reason: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const app = await tx.supplierCreditApplication.findFirst({
        where: { id: applicationId, company_id: companyId },
        include: { credit_note: true, vendor_bill: true },
      });
      if (!app) throw new NotFoundException('Alokasi credit note tidak ditemukan');
      if (app.status === 'REVERSED') {
        throw new BadRequestException('Alokasi ini sudah pernah dibatalkan (reversed) sebelumnya');
      }

      // Concurrency lock
      if (typeof tx.$executeRaw === 'function') {
        const lockIds = [app.credit_note_id, app.vendor_bill_id].sort();
        for (const id of lockIds) {
          if (id === app.credit_note_id) {
            await tx.$executeRaw`SELECT 1 FROM "SupplierCreditNote" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          } else {
            await tx.$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
          }
        }
      }

      // 1. Mark Application as REVERSED
      await tx.supplierCreditApplication.update({
        where: { id: app.id },
        data: {
          status: 'REVERSED',
          reversal_reason: reason,
          reversed_at: new Date(),
          reversed_by: userId,
        },
      });

      // 2. Restore Vendor Bill AP
      const restoredRemaining = this.roundMoney(app.vendor_bill.remaining_amount + app.amount);
      const restoredPaid = this.roundMoney(Math.max(0, app.vendor_bill.paid_amount - app.amount));
      const restoredStatus = restoredPaid <= 0 ? 'POSTED' : 'PARTIALLY PAID';

      await tx.invoice.update({
        where: { id: app.vendor_bill_id },
        data: {
          remaining_amount: restoredRemaining,
          paid_amount: restoredPaid,
          status: restoredStatus,
        },
      });

      // 3. Restore Credit Note remaining credit
      const restoredCredit = this.roundMoney(app.credit_note.remaining_credit + app.amount);
      const restoredCreditStatus = restoredCredit >= app.credit_note.total_amount ? 'POSTED' : 'PARTIALLY_APPLIED';

      await tx.supplierCreditNote.update({
        where: { id: app.credit_note_id },
        data: {
          remaining_credit: restoredCredit,
          status: restoredCreditStatus,
        },
      });

      // 4. Compensating GL Journal: Debit Piutang Retur (1-1420), Credit Hutang Usaha (2-1100)
      const apAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1100', '2100'],
        ['Hutang Usaha', 'Accounts Payable'],
        'Credit',
      );
      const creditAssetAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['1-1420', '1-1400', '1420'],
        ['Piutang Retur / Supplier Credit Balance', 'Piutang Retur Pembelian', 'Supplier Credit Balance'],
        'Debit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CREDIT_NOTE_APPLICATION_REVERSAL',
        referenceId: app.id,
        description: `Pembatalan Alokasi Credit Note ${app.credit_note.credit_note_number}: ${reason}`,
        items: [
          { accountId: creditAssetAccountId, debit: app.amount, credit: 0 },
          { accountId: apAccountId, debit: 0, credit: app.amount },
        ],
      });

      return {
        success: true,
        restoredCredit,
        restoredRemainingBill: restoredRemaining,
      };
    });
  }

  /**
   * Reversal of Supplier Credit Note itself:
   * Only permitted if NO active applications or refunds exist (remaining_credit === total_amount).
   */
  async reverseCreditNote(
    companyId: string,
    creditNoteId: string,
    reason: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const sc = await tx.supplierCreditNote.findFirst({
        where: { id: creditNoteId, company_id: companyId },
        include: { applications: true },
      });
      if (!sc) throw new NotFoundException('Supplier Credit Note tidak ditemukan');
      if (sc.status === 'REVERSED') {
        throw new BadRequestException('Credit Note sudah pernah dibatalkan (reversed) sebelumnya');
      }

      // Concurrency lock
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT 1 FROM "SupplierCreditNote" WHERE id = ${creditNoteId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // Check if any active applications exist
      const activeApps = (sc.applications || []).filter((a: any) => a.status === 'APPLIED');
      if (activeApps.length > 0) {
        throw new BadRequestException(
          `Tidak dapat membatalkan Credit Note: Masih terdapat ${activeApps.length} alokasi aktif. Batalkan alokasi terlebih dahulu.`,
        );
      }

      if (sc.remaining_credit < sc.total_amount) {
        throw new BadRequestException(
          'Tidak dapat membatalkan Credit Note: Sebagian saldo telah dialokasikan atau direfund.',
        );
      }

      // Update status to REVERSED
      await tx.supplierCreditNote.update({
        where: { id: sc.id },
        data: {
          status: 'REVERSED',
          remaining_credit: 0,
        },
      });

      return {
        success: true,
        message: 'Credit note berhasil dibatalkan',
        creditNoteNumber: sc.credit_note_number,
      };
    });
  }
}
