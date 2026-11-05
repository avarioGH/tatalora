import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentProcessedEvent } from '../../events/accounting.events';
import { GlService } from '../../gl/gl.service';
import { SequenceService } from '../../reports/sequence.service';

@Injectable()
export class PaymentService {
  
  private async resolveAccount(
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

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private glService: GlService,
    private sequenceService: SequenceService,
  ) {}

  /**
   * Standard 2-decimal monetary rounding helper.
   */
  private roundMoney(val: number): number {
    return Math.round(Number(val || 0) * 100) / 100;
  }

  async create(companyId: string, data: any, userId?: string) {
    // 1. Idempotency Check on formal idempotencyKey or data.reference
    const idempotencyKey = data.idempotencyKey || data.reference;
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findFirst({
        where: {
          company_id: companyId,
          reference: idempotencyKey,
        },
        include: {
          allocations: true,
          customer: true,
        },
      });
      if (existing) {
        // Verify payload compatibility to detect conflicting payload submissions
        const existingAmount = this.roundMoney(existing.amount);
        const reqAmount = this.roundMoney(data.amount);
        if (reqAmount > 0 && Math.abs(existingAmount - reqAmount) > 0.001) {
          throw new BadRequestException(
            `Konflik kunci idempotensi: Kunci "${idempotencyKey}" sudah digunakan dengan jumlah berbeda (${existingAmount} vs ${reqAmount})`,
          );
        }
        const targetCustId = data.customerId || data.customer_id;
        if (targetCustId && existing.customer_id && existing.customer_id !== targetCustId) {
          throw new BadRequestException(
            `Konflik kunci idempotensi: Kunci "${idempotencyKey}" sudah digunakan untuk pelanggan berbeda`,
          );
        }
        const reqMethod = data.paymentMethod || data.payment_method;
        if (reqMethod && existing.payment_method && existing.payment_method !== reqMethod) {
          throw new BadRequestException(
            `Konflik kunci idempotensi: Kunci "${idempotencyKey}" sudah digunakan dengan metode pembayaran berbeda (${existing.payment_method} vs ${reqMethod})`,
          );
        }
        return existing;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const paymentAmount = this.roundMoney(data.amount);
      if (paymentAmount <= 0) {
        throw new BadRequestException('Jumlah pembayaran harus lebih besar dari 0');
      }

      // If they provide allocations explicitly or via shortcut
      const allocations: any[] = data.allocations ? [...data.allocations] : [];
      const targetSalesOrderId = data.salesOrderId || data.sales_order_id;
      const targetInvoiceId = data.invoiceId || data.invoice_id;

      if (!allocations.length && targetSalesOrderId) {
        allocations.push({
          salesOrderId: targetSalesOrderId,
          amount: paymentAmount,
        });
      } else if (!allocations.length && targetInvoiceId) {
        allocations.push({ invoiceId: targetInvoiceId, amount: paymentAmount });
      }

      if (allocations.length === 0 && !data.allowUnallocated) {
        throw new BadRequestException(
          'Pembayaran harus memiliki setidaknya satu alokasi (Faktur atau Pesanan)',
        );
      }

      let totalAllocated = 0;
      for (const alloc of allocations) {
        if (!alloc.invoiceId && alloc.invoice_id) alloc.invoiceId = alloc.invoice_id;
        if (!alloc.salesOrderId && alloc.sales_order_id) alloc.salesOrderId = alloc.sales_order_id;

        const aAmount = this.roundMoney(alloc.amount);
        if (aAmount <= 0) {
          throw new BadRequestException(
            'Jumlah alokasi pembayaran harus lebih besar dari 0',
          );
        }
        alloc.amount = aAmount;
        totalAllocated = this.roundMoney(totalAllocated + aAmount);
      }

      // Validate allocation totals vs payment amount
      if (totalAllocated > paymentAmount) {
        throw new BadRequestException(
          `Total alokasi (${totalAllocated}) melebihi jumlah pembayaran (${paymentAmount})`,
        );
      }
      if (Math.abs(totalAllocated - paymentAmount) > 0 && !data.allowUnallocated) {
        throw new BadRequestException(
          `Total alokasi (${totalAllocated}) tidak sesuai dengan jumlah pembayaran (${paymentAmount})`,
        );
      }

      // Concurrency Coordination: Establish deterministic row locks on target Sales Orders and Invoices
      // Sort IDs alphabetically to prevent cross-transaction deadlocks
      const sortedSoIds = [
        ...new Set(
          allocations
            .map((a) => a.salesOrderId)
            .filter((id): id is string => Boolean(id)),
        ),
      ].sort();

      const sortedInvIds = [
        ...new Set(
          allocations
            .map((a) => a.invoiceId)
            .filter((id): id is string => Boolean(id)),
        ),
      ].sort();

      for (const soId of sortedSoIds) {
        if (typeof (tx as any).$executeRaw === 'function') {
          await (tx as any).$executeRaw`SELECT 1 FROM "SalesOrder" WHERE id = ${soId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        }
      }

      for (const invId of sortedInvIds) {
        if (typeof (tx as any).$executeRaw === 'function') {
          await (tx as any).$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${invId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        }
      }

      // Pre-validate all Invoices and Sales Orders
      for (const alloc of allocations) {
        if (alloc.invoiceId) {
          const inv = await tx.invoice.findFirst({
            where: { id: alloc.invoiceId, company_id: companyId },
          });
          if (!inv) {
            throw new NotFoundException(`Faktur ${alloc.invoiceId} tidak ditemukan`);
          }
          if (inv.status === 'DRAFT') {
            throw new BadRequestException(
              `Faktur ${inv.invoice_number} masih berstatus DRAFT. Faktur harus disetujui (POSTED) sebelum dapat menerima pembayaran.`,
            );
          }
          if (inv.status === 'CANCELLED' || inv.status === 'VOID') {
            throw new BadRequestException(
              `Faktur ${inv.invoice_number} berstatus ${inv.status} dan tidak dapat menerima alokasi pembayaran.`,
            );
          }
          const targetCustId = data.customerId || data.customer_id;
          if (targetCustId && inv.customer_id && inv.customer_id !== targetCustId) {
            throw new BadRequestException(
              `Faktur ${inv.invoice_number} milik pelanggan berbeda dari data pembayaran.`,
            );
          }

          const invRemaining = this.roundMoney(inv.remaining_amount);
          if (alloc.amount > invRemaining) {
            throw new BadRequestException(
              `Jumlah pembayaran (${alloc.amount}) melebihi sisa tagihan Faktur ${inv.invoice_number} (${invRemaining})`,
            );
          }
        }

        if (alloc.salesOrderId) {
          const so = await tx.salesOrder.findFirst({
            where: { id: alloc.salesOrderId, company_id: companyId },
          });
          if (!so) {
            throw new NotFoundException(`Sales Order ${alloc.salesOrderId} tidak ditemukan`);
          }
          if (data.customerId && so.customer_id && so.customer_id !== data.customerId) {
            throw new BadRequestException(
              `Pesanan ${so.order_number} milik pelanggan berbeda dari data pembayaran.`,
            );
          }

          const allAllocations = await tx.paymentAllocation.findMany({
            where: { sales_order_id: alloc.salesOrderId },
          });
          const totalPaid = this.roundMoney(
            allAllocations.reduce((sum, a) => sum + a.amount, 0),
          );
          const outstanding = this.roundMoney(so.total_amount - totalPaid);
          if (alloc.amount > outstanding) {
            throw new BadRequestException(
              `Jumlah pembayaran melebihi sisa pesanan untuk SO ${so.order_number}`,
            );
          }
        }
      }

      // Generate sequence number using SequenceService
      const paymentNumber =
        data.paymentNumber ||
        (await this.sequenceService.generateNumber(
          tx,
          companyId,
          'PAYMENT',
          'PAY',
        ));

      // Create Payment
      const payment = await tx.payment.create({
        data: {
          company_id: companyId,
          customer_id: data.customerId || data.customer_id || undefined,
          invoice_id: data.invoiceId || data.invoice_id || undefined,
          payment_number: paymentNumber,
          payment_date: new Date(data.paymentDate || Date.now()),
          amount: paymentAmount,
          payment_method: data.paymentMethod || 'BANK_TRANSFER',
          reference: idempotencyKey,
          notes: data.notes,
          created_by: userId,
        },
      });

      let isAP = false;
      const isCustomerDeposit =
        allocations.length === 0 ||
        allocations.every((a) => a.salesOrderId && !a.invoiceId);
      const isSplitPayment = !isAP && !isCustomerDeposit && totalAllocated > 0 && totalAllocated < paymentAmount;

      // Process Allocations
      for (const alloc of allocations) {
        await tx.paymentAllocation.create({
          data: {
            payment_id: payment.id,
            sales_order_id: alloc.salesOrderId || undefined,
            invoice_id: alloc.invoiceId || undefined,
            amount: alloc.amount,
          },
        });

        if (alloc.salesOrderId) {
          const so = await tx.salesOrder.findFirst({
            where: { id: alloc.salesOrderId },
          });
          if (so) {
            const allAllocations = await tx.paymentAllocation.findMany({
              where: { sales_order_id: alloc.salesOrderId },
            });
            const totalPaid = this.roundMoney(
              allAllocations.reduce((sum, a) => sum + a.amount, 0),
            );
            let newStatus = 'UNPAID';
            if (totalPaid >= this.roundMoney(so.total_amount)) newStatus = 'PAID';
            else if (totalPaid > 0) newStatus = 'PARTIAL';

            await tx.salesOrder.update({
              where: { id: so.id },
              data: { payment_status: newStatus },
            });
          }
        }

        if (alloc.invoiceId) {
          const inv = await tx.invoice.findFirst({
            where: { id: alloc.invoiceId },
          });
          if (inv) {
            if (inv.type === 'AP' || inv.type === 'VENDOR_BILL') isAP = true;

            const newRemaining = this.roundMoney(
              Math.max(0, inv.remaining_amount - alloc.amount),
            );
            const newPaid = this.roundMoney(inv.paid_amount + alloc.amount);
            const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY PAID';

            // Atomic conditional update to guard against concurrent race conditions
            const updateResult = await tx.invoice.updateMany({
              where: {
                id: inv.id,
                remaining_amount: { gte: alloc.amount },
              },
              data: {
                remaining_amount: newRemaining,
                paid_amount: newPaid,
                status: newStatus,
              },
            });

            if (updateResult.count === 0) {
              throw new BadRequestException(
                `Gagal memproses faktur ${inv.invoice_number}: Sisa tagihan tidak mencukupi atau faktur sedang diproses oleh transaksi lain.`,
              );
            }

            if (inv.purchase_order_id) {
              const allInvs = await tx.invoice.findMany({
                where: {
                  purchase_order_id: inv.purchase_order_id,
                  type: { in: ['AP', 'VENDOR_BILL'] },
                },
              });
              const allPaid = allInvs.every((i: any) => i.status === 'PAID');
              const anyPaid = allInvs.some((i: any) => i.paid_amount > 0);

              await tx.purchaseOrder.update({
                where: { id: inv.purchase_order_id },
                data: {
                  payment_status: allPaid ? 'PAID' : anyPaid ? 'PARTIAL' : 'UNPAID',
                },
              });
            }
          }
        }
      }

      // Record to Ledger (Finance Transaction)
      let accountId = data.cashAccountId || data.cash_account_id;
      if (accountId) {
        const cashAcc = await tx.cashAccount.findFirst({
          where: { id: accountId, company_id: companyId },
        });
        if (!cashAcc) {
          throw new BadRequestException('Akun kas/bank tidak valid untuk perusahaan ini');
        }
      } else {
        const cashAcc = await tx.cashAccount.findFirst({
          where: { company_id: companyId },
        });
        if (cashAcc) accountId = cashAcc.id;
      }

      if (accountId) {
        await tx.financeTransaction.create({
          data: {
            company_id: companyId,
            transaction_no: 'TRX-' + Date.now(),
            transaction_type: isAP ? 'Cash Out' : 'Cash In',
            cash_account_id: accountId,
            reference_type: 'PAYMENT',
            reference_id: payment.id,
            transaction_date: payment.payment_date,
            status: 'COMPLETED',
            description: `Pembayaran ${paymentNumber}`,
            total_amount: payment.amount,
            created_by: userId || '000000000000000000000000',
          },
        });

        if (isSplitPayment) {
          const unappliedAmount = this.roundMoney(payment.amount - totalAllocated);
          await this.eventEmitter.emitAsync(
            'payment.processed',
            new PaymentProcessedEvent(
              companyId,
              payment.id,
              `VAL-PAY-AR-${payment.id}`,
              payment.payment_date,
              {
                type: 'RECEIVABLE',
                amount: totalAllocated,
                accountId: accountId,
                referenceType: 'PAYMENT_AR',
              },
              tx as any,
            ),
          );
          await this.eventEmitter.emitAsync(
            'payment.processed',
            new PaymentProcessedEvent(
              companyId,
              payment.id,
              `VAL-PAY-DEP-${payment.id}`,
              payment.payment_date,
              {
                type: 'CUSTOMER_DEPOSIT',
                amount: unappliedAmount,
                accountId: accountId,
                referenceType: 'PAYMENT_DEPOSIT',
              },
              tx as any,
            ),
          );
        } else {
          const eventType = isAP
          ? 'PAYABLE'
          : isCustomerDeposit
            ? 'CUSTOMER_DEPOSIT'
            : 'RECEIVABLE';

        // Emit strictly typed Accounting Event for Idempotent GlService listening
        await this.eventEmitter.emitAsync(
          'payment.processed',
          new PaymentProcessedEvent(
            companyId,
            payment.id,
            `VAL-PAY-${payment.id}`,
            payment.payment_date,
            {
              type: eventType,
              amount: payment.amount,
              accountId: accountId,
            },
            tx as any,
          ),
        );
        }
      }

      return payment;
    });
  }

  // ----------------------------------------------------
  // GET AVAILABLE CUSTOMER ADVANCE / DEPOSITS
  // ----------------------------------------------------
  async getAvailableDeposits(
    companyId: string,
    customerId?: string,
    salesOrderId?: string,
  ) {
    const where: any = { company_id: companyId };
    if (customerId) {
      where.customer_id = customerId;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        allocations: {
          include: {
            sales_order: true,
            invoice: true,
          },
        },
        customer: true,
      },
      orderBy: { payment_date: 'desc' },
    });

    const results: any[] = [];
    for (const p of payments) {
      if (p.deleted_at || (p.notes && p.notes.includes('[DIBATALKAN]'))) {
        continue;
      }

      // Include advance refunds if relation exists
      const advanceRefunds = (p as any).advance_refunds || [];
      const totalRefunded = this.roundMoney(
        advanceRefunds
          .filter((r: any) => r.status === 'COMPLETED')
          .reduce((sum: number, r: any) => sum + r.amount, 0),
      );

      // Calculate total amount already applied to INVOICES
      const invoiceAllocations = p.allocations.filter((a) => a.invoice_id != null);
      const totalAppliedToInvoices = this.roundMoney(
        invoiceAllocations.reduce((sum, a) => sum + a.amount, 0),
      );
      const availableAmount = this.roundMoney(p.amount - totalAppliedToInvoices - totalRefunded);

      if (availableAmount <= 0) {
        continue;
      }

      const salesOrderAllocations = p.allocations.filter((a) => a.sales_order_id != null);
      const soNumbers = salesOrderAllocations
        .map((a) => a.sales_order?.order_number)
        .filter(Boolean);

      if (salesOrderId) {
        const matchesSO = salesOrderAllocations.some((a) => a.sales_order_id === salesOrderId);
        if (!matchesSO) continue;
      }

      results.push({
        paymentId: p.id,
        paymentNumber: p.payment_number,
        paymentDate: p.payment_date,
        totalAmount: p.amount,
        appliedAmount: totalAppliedToInvoices,
        availableAmount: availableAmount,
        customerId: p.customer_id,
        customerName: p.customer?.name || 'Pelanggan Umum',
        reference: p.reference,
        salesOrderIds: salesOrderAllocations.map((a) => a.sales_order_id),
        salesOrderNumbers: soNumbers,
        notes: p.notes,
      });
    }

    return results;
  }

  // ----------------------------------------------------
  // APPLY CUSTOMER ADVANCE / DEPOSIT TO INVOICE
  // ----------------------------------------------------
  async applyDeposit(
    companyId: string,
    invoiceId: string,
    data: { paymentId: string; amount: number; notes?: string },
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Concurrency Coordination: Acquire deterministic row locks on Invoice and Payment
      if (typeof (tx as any).$executeRaw === 'function') {
        await (tx as any).$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${invoiceId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        await (tx as any).$executeRaw`SELECT 1 FROM "Payment" WHERE id = ${data.paymentId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // 2. Fetch and validate invoice
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, company_id: companyId },
      });
      if (!invoice) {
        throw new NotFoundException('Faktur tidak ditemukan');
      }
      if (invoice.status === 'DRAFT') {
        throw new BadRequestException('Faktur masih DRAFT. Posting faktur terlebih dahulu.');
      }
      if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        throw new BadRequestException(`Faktur berstatus ${invoice.status} dan tidak dapat dialokasikan.`);
      }
      if (invoice.remaining_amount <= 0) {
        throw new BadRequestException('Faktur ini sudah lunas');
      }

      // 3. Fetch and validate payment (deposit)
      const payment = await tx.payment.findFirst({
        where: { id: data.paymentId, company_id: companyId },
        include: { allocations: true },
      });
      if (!payment) {
        throw new NotFoundException('Data pembayaran/uang muka tidak ditemukan');
      }
      if (payment.deleted_at || (payment.notes && payment.notes.includes('[DIBATALKAN]'))) {
        throw new BadRequestException('Uang muka ini telah dibatalkan');
      }

      // Customer check: if both exist, verify they match
      if (
        invoice.customer_id &&
        payment.customer_id &&
        invoice.customer_id !== payment.customer_id
      ) {
        throw new BadRequestException(
          'Uang muka berasal dari pelanggan yang berbeda dengan faktur ini',
        );
      }

      const allocAmount = this.roundMoney(data.amount);
      if (allocAmount <= 0) {
        throw new BadRequestException('Jumlah alokasi uang muka harus lebih besar dari 0');
      }

      // Compute existing applied amount to invoices
      const existingAllocs = await tx.paymentAllocation.findMany({
        where: { payment_id: payment.id, invoice_id: { not: null } },
      });
      const totalAlreadyApplied = this.roundMoney(
        existingAllocs.reduce((sum, a) => sum + a.amount, 0),
      );
      const availableDeposit = this.roundMoney(payment.amount - totalAlreadyApplied);

      if (allocAmount > availableDeposit) {
        throw new BadRequestException(
          `Jumlah alokasi (${allocAmount}) melebihi saldo uang muka yang tersedia (${availableDeposit})`,
        );
      }

      const invRemaining = this.roundMoney(invoice.remaining_amount);
      if (allocAmount > invRemaining) {
        throw new BadRequestException(
          `Jumlah alokasi (${allocAmount}) melebihi sisa tagihan Faktur ${invoice.invoice_number} (${invRemaining})`,
        );
      }

      // 4. Atomically update Invoice paid and remaining amounts with atomic concurrency guard
      const newRemaining = this.roundMoney(Math.max(0, invRemaining - allocAmount));
      const newPaid = this.roundMoney(invoice.paid_amount + allocAmount);
      const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY PAID';

      const updateResult = await tx.invoice.updateMany({
        where: {
          id: invoice.id,
          remaining_amount: { gte: allocAmount },
        },
        data: {
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          status: newStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException(
          `Gagal menerapkan uang muka: Sisa tagihan Faktur ${invoice.invoice_number} tidak mencukupi atau faktur sedang diproses oleh transaksi lain.`,
        );
      }

      // 5. Create Payment Allocation linking existing Payment to Invoice
      const allocation = await tx.paymentAllocation.create({
        data: {
          payment_id: payment.id,
          invoice_id: invoice.id,
          amount: allocAmount,
        },
      });

      const remainingDepositAfter = this.roundMoney(availableDeposit - allocAmount);

      // CRITICAL FINANCIAL INVARIANT:
      // ZERO NEW CASH MOVEMENT! NO FinanceTransaction created!
      // Cash was already entered when the deposit payment was created.
      // 6. GL Reclassification Journal: Debit Customer Advance (2-1200), Credit AR (1-1200)
      try {
        let depositAccountId: string | undefined;
        let arAccountId: string | undefined;

        // Resolve 2-1200 / Uang Muka Penjualan
        const depCoa = await tx.chartOfAccount.findFirst({
          where: {
            company_id: companyId,
            OR: [
              { account_code: { in: ['2-1200', '2105', '2200'] } },
              { account_name: { in: ['Uang Muka Penjualan', 'Customer Deposit', 'Customer Advance'] } },
            ],
          },
        });
        if (depCoa) {
          depositAccountId = depCoa.id;
        } else {
          let liabType = await tx.accountType.findFirst({
            where: { company_id: companyId, normal_balance: 'Credit' },
          });
          if (!liabType) {
            liabType = await tx.accountType.create({
              data: {
                company_id: companyId,
                name: 'Kewajiban / Liabilitas',
                normal_balance: 'Credit',
                code: 'LIAB-' + Date.now(),
              },
            });
          }
          const createdDep = await tx.chartOfAccount.create({
            data: {
              company_id: companyId,
              account_code: '2-1200',
              account_name: 'Uang Muka Penjualan',
              account_type_id: liabType.id,
            },
          });
          depositAccountId = createdDep.id;
        }

        // Resolve 1-1200 / Piutang Usaha
        const arCoa = await tx.chartOfAccount.findFirst({
          where: {
            company_id: companyId,
            OR: [
              { account_code: { in: ['1-1200', '1200'] } },
              { account_name: { in: ['Piutang Usaha', 'Accounts Receivable'] } },
            ],
          },
        });
        if (arCoa) {
          arAccountId = arCoa.id;
        } else {
          let assetType = await tx.accountType.findFirst({
            where: { company_id: companyId, normal_balance: 'Debit' },
          });
          if (!assetType) {
            assetType = await tx.accountType.create({
              data: {
                company_id: companyId,
                name: 'Aset Lancar',
                normal_balance: 'Debit',
                code: 'AST-' + Date.now(),
              },
            });
          }
          const createdAr = await tx.chartOfAccount.create({
            data: {
              company_id: companyId,
              account_code: '1-1200',
              account_name: 'Piutang Usaha',
              account_type_id: assetType.id,
            },
          });
          arAccountId = createdAr.id;
        }

        if (depositAccountId && arAccountId) {
          await this.glService.createJournalEntryWithinTx(tx as any, {
            companyId: companyId,
            entryDate: new Date(),
            referenceType: 'DEPOSIT_ALLOCATION',
            referenceId: allocation.id,
            description: `Alokasi Uang Muka ${payment.payment_number} ke Faktur ${invoice.invoice_number}`,
            items: [
              { accountId: depositAccountId, debit: allocAmount, credit: 0 },
              { accountId: arAccountId, debit: 0, credit: allocAmount },
            ],
          });
        }
      } catch (err: any) {
        console.warn('Deposit allocation GL reclassification notice:', err.message);
      }

      return {
        success: true,
        message: 'Uang muka berhasil diterapkan ke faktur',
        allocationId: allocation.id,
        paymentId: payment.id,
        invoiceId: invoice.id,
        allocatedAmount: allocAmount,
        remainingInvoice: newRemaining,
        remainingDeposit: remainingDepositAfter,
      };
    });
  }

  // ----------------------------------------------------
  // UNALLOCATE DEPOSIT FROM INVOICE
  // ----------------------------------------------------
  async unallocate(
    companyId: string,
    allocationId: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const alloc = await tx.paymentAllocation.findFirst({
        where: { id: allocationId },
        include: { payment: true, invoice: true },
      });

      if (!alloc) {
        throw new NotFoundException('Alokasi pembayaran tidak ditemukan');
      }
      if (alloc.payment.company_id !== companyId) {
        throw new BadRequestException('Alokasi tidak sesuai dengan perusahaan pengguna');
      }
      if (!alloc.invoice_id) {
        throw new BadRequestException('Hanya alokasi faktur yang dapat dibatalkan alokasinya');
      }

      const inv = alloc.invoice;
      const payment = alloc.payment;

      if (!inv || !payment) {
        throw new NotFoundException('Faktur atau Pembayaran terkait tidak ditemukan');
      }

      // Lock invoice and payment
      if (typeof (tx as any).$executeRaw === 'function') {
        await (tx as any).$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${inv.id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        await (tx as any).$executeRaw`SELECT 1 FROM "Payment" WHERE id = ${payment.id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // 1. Revert invoice paid and remaining amount
      const newPaid = this.roundMoney(Math.max(0, inv.paid_amount - alloc.amount));
      const newRemaining = this.roundMoney(inv.remaining_amount + alloc.amount);
      const newStatus = newPaid === 0 ? 'POSTED' : 'PARTIALLY PAID';

      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          status: newStatus,
        },
      });

      // 2. Revert GL DEPOSIT_ALLOCATION journal if present
      const allocJournal = await tx.journalEntry.findFirst({
        where: {
          company_id: companyId,
          reference_type: 'DEPOSIT_ALLOCATION',
          reference_id: alloc.id,
          status: 'Posted',
        },
        include: { items: true },
      });

      if (allocJournal) {
        const revJournal = await tx.journalEntry.create({
          data: {
            company_id: companyId,
            journal_no: 'REV-' + allocJournal.journal_no,
            reference_type: 'REVERSAL',
            reference_id: allocJournal.id,
            journal_date: new Date(),
            description: `Reversal of ${allocJournal.journal_no}: Pembatalan Alokasi`,
            status: 'Posted',
            created_by: userId || 'SYSTEM',
            items: {
              create: allocJournal.items.map((item: any) => ({
                account_id: item.account_id,
                debit: item.credit,
                credit: item.debit,
                description: 'Reversal: ' + item.description,
              })),
            },
          },
        });

        await tx.journalEntry.update({
          where: { id: allocJournal.id },
          data: { status: 'Reversed' },
        });

        await tx.journalReversal.create({
          data: {
            company_id: companyId,
            original_journal_id: allocJournal.id,
            reverse_journal_id: revJournal.id,
            reason: 'Pembatalan Alokasi',
            created_by: userId || 'SYSTEM',
          },
        });
      }

      // 3. Delete allocation record
      await tx.paymentAllocation.delete({
        where: { id: alloc.id },
      });

      return {
        success: true,
        message: 'Alokasi berhasil dibatalkan',
        invoiceId: inv.id,
        restoredRemainingInvoice: newRemaining,
        paymentId: payment.id,
      };
    });
  }

  // ----------------------------------------------------
  // REVERSE PAYMENT / PEMBATALAN PEMBAYARAN
  // ----------------------------------------------------
  async reversePayment(
    companyId: string,
    paymentId: string,
    reason: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch payment allocations first to determine all linked Invoices and Sales Orders
      const paymentPreview = await tx.payment.findFirst({
        where: { id: paymentId, company_id: companyId },
        include: { allocations: true },
      });

      if (!paymentPreview) {
        throw new NotFoundException('Pembayaran tidak ditemukan');
      }

      if (paymentPreview.deleted_at || (paymentPreview.notes && paymentPreview.notes.includes('[DIBATALKAN'))) {
        throw new BadRequestException('Pembayaran ini sudah pernah dibatalkan sebelumnya');
      }

      // 2. Concurrency Coordination: Establish deterministic row locks
      // Consistent protocol: Lock all linked Invoices (sorted alphabetically) BEFORE locking Payment
      const sortedInvIds = [
        ...new Set(
          paymentPreview.allocations
            .map((a) => a.invoice_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ].sort();

      for (const invId of sortedInvIds) {
        if (typeof (tx as any).$executeRaw === 'function') {
          await (tx as any).$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${invId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        }
      }

      // Now lock the Payment row
      if (typeof (tx as any).$executeRaw === 'function') {
        await (tx as any).$executeRaw`SELECT 1 FROM "Payment" WHERE id = ${paymentId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // Re-fetch Payment and its allocations under protection of the locks
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, company_id: companyId },
        include: {
          allocations: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Pembayaran tidak ditemukan');
      }

      if (payment.deleted_at || (payment.notes && payment.notes.includes('[DIBATALKAN'))) {
        throw new BadRequestException('Pembayaran ini sudah pernah dibatalkan sebelumnya');
      }

      // Concurrency claim on cancellation status
      await tx.payment.update({
        where: { id: payment.id },
        data: { updated_at: new Date() },
      });

      // 1. Revert Allocations on Invoices
      for (const alloc of payment.allocations) {
        if (alloc.invoice_id) {
          const inv = await tx.invoice.findFirst({
            where: { id: alloc.invoice_id },
          });
          if (inv) {
            const newPaid = this.roundMoney(
              Math.max(0, inv.paid_amount - alloc.amount),
            );
            const newRemaining = this.roundMoney(inv.remaining_amount + alloc.amount);
            const newStatus = newPaid === 0 ? 'POSTED' : 'PARTIALLY PAID';

            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                paid_amount: newPaid,
                remaining_amount: newRemaining,
                status: newStatus,
              },
            });

            // If this allocation has an associated DEPOSIT_ALLOCATION journal, reverse it symmetrically
            const allocJournal = await tx.journalEntry.findFirst({
              where: {
                company_id: companyId,
                reference_type: 'DEPOSIT_ALLOCATION',
                reference_id: alloc.id,
                status: 'Posted',
              },
              include: { items: true },
            });

            if (allocJournal) {
              const revAllocJournal = await tx.journalEntry.create({
                data: {
                  company_id: companyId,
                  journal_no: 'REV-' + allocJournal.journal_no,
                  reference_type: 'REVERSAL',
                  reference_id: allocJournal.id,
                  journal_date: new Date(),
                  description: 'Reversal of ' + allocJournal.journal_no + ': ' + (reason || 'Dibatalkan'),
                  status: 'Posted',
                  created_by: userId || 'SYSTEM',
                  items: {
                    create: allocJournal.items.map((item: any) => ({
                      account_id: item.account_id,
                      debit: item.credit,
                      credit: item.debit,
                      description: 'Reversal: ' + item.description,
                    })),
                  },
                },
              });

              await tx.journalEntry.update({
                where: { id: allocJournal.id },
                data: { status: 'Reversed' },
              });

              await tx.journalReversal.create({
                data: {
                  company_id: companyId,
                  original_journal_id: allocJournal.id,
                  reverse_journal_id: revAllocJournal.id,
                  reason: reason || 'Pembatalan Alokasi Uang Muka',
                  created_by: userId || 'SYSTEM',
                },
              });
            }
          }
        }

        // Revert Allocations on Sales Orders
        if (alloc.sales_order_id) {
          const so = await tx.salesOrder.findFirst({
            where: { id: alloc.sales_order_id },
          });
          if (so) {
            const remainingAllocs = await tx.paymentAllocation.findMany({
              where: {
                sales_order_id: alloc.sales_order_id,
                payment_id: { not: payment.id },
              },
            });
            const remainingPaid = this.roundMoney(
              remainingAllocs.reduce((sum, a) => sum + a.amount, 0),
            );
            let newStatus = 'UNPAID';
            if (remainingPaid >= this.roundMoney(so.total_amount)) newStatus = 'PAID';
            else if (remainingPaid > 0) newStatus = 'PARTIAL';

            await tx.salesOrder.update({
              where: { id: so.id },
              data: { payment_status: newStatus },
            });
          }
        }
      }

      // 2. Compensating Cash Ledger Transaction (FinanceTransaction)
      const originalTrx = await tx.financeTransaction.findFirst({
        where: {
          company_id: companyId,
          reference_type: 'PAYMENT',
          reference_id: payment.id,
          status: 'COMPLETED',
        },
      });

      if (originalTrx) {
        // Create Compensating Reversal Entry
        const revType =
          originalTrx.transaction_type === 'Cash In' ? 'Cash Out' : 'Cash In';

        await tx.financeTransaction.create({
          data: {
            company_id: companyId,
            transaction_no: 'REV-' + Date.now(),
            transaction_type: revType,
            cash_account_id: originalTrx.cash_account_id,
            reference_type: 'PAYMENT_REVERSAL',
            reference_id: payment.id,
            transaction_date: new Date(),
            status: 'COMPLETED',
            description: `Pembatalan Pembayaran ${payment.payment_number}: ${reason || 'Dibatalkan'}`,
            total_amount: payment.amount,
            created_by: userId || '000000000000000000000000',
          },
        });

        // Mark original as Reversed
        await tx.financeTransaction.update({
          where: { id: originalTrx.id },
          data: { status: 'Reversed' },
        });
      }

      // 3. GL Journal Reversal - MUST BE STRICTLY ATOMIC (NO TRY-CATCH SWALLOWING)
      const journals = await tx.journalEntry.findMany({
        where: {
          company_id: companyId,
          reference_type: { in: ['PAYMENT_AR', 'PAYMENT_DEPOSIT', 'PAYMENT_AP'] },
          reference_id: payment.id,
          status: 'Posted',
        },
        include: { items: true },
      });

      for (const journal of journals) {
        const reversedJournal = await tx.journalEntry.create({
          data: {
            company_id: companyId,
            journal_no: 'REV-' + journal.journal_no,
            reference_type: 'REVERSAL',
            reference_id: journal.id,
            journal_date: new Date(),
            description: 'Reversal of ' + journal.journal_no + ': ' + (reason || 'Dibatalkan'),
            status: 'Posted',
            created_by: userId || 'SYSTEM',
            items: {
              create: journal.items.map((item: any) => ({
                account_id: item.account_id,
                debit: item.credit,
                credit: item.debit,
                description: 'Reversal: ' + item.description,
              })),
            },
          },
        });

        await tx.journalEntry.update({
          where: { id: journal.id },
          data: { status: 'Reversed' },
        });

        await tx.journalReversal.create({
          data: {
            company_id: companyId,
            original_journal_id: journal.id,
            reverse_journal_id: reversedJournal.id,
            reason: reason || 'Pembatalan Pembayaran',
            created_by: userId || 'SYSTEM',
          },
        });

        for (const item of journal.items) {
          const cashAccounts = await tx.cashAccount.findMany({
            where: {
              company_id: companyId,
              chart_of_account_id: item.account_id,
            },
          });

          for (const cAcc of cashAccounts) {
            const delta = item.credit - item.debit;
            await tx.cashAccount.update({
              where: { id: cAcc.id },
              data: {
                current_balance: {
                  increment: delta,
                },
              },
            });
          }
        }
      }

      // 4. Mark Payment record
      const updatedNotes = `${payment.notes ? payment.notes + ' ' : ''}[DIBATALKAN: ${reason || 'Pembatalan'}]`;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          notes: updatedNotes,
          deleted_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Pembayaran berhasil dibatalkan dan saldo telah dipulihkan',
        paymentId: payment.id,
      };
    });
  }

  // ----------------------------------------------------
  // LIST CASH ACCOUNTS
  // ----------------------------------------------------
  async getCashAccounts(companyId: string) {
    return this.prisma.cashAccount.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(companyId: string, includeDeleted: boolean = false) {
    const where: any = { company_id: companyId };

    const list = await this.prisma.payment.findMany({
      where,
      include: {
        allocations: {
          include: { sales_order: true, invoice: true },
        },
        customer: true,
      },
      orderBy: { payment_date: 'desc' },
    });

    if (includeDeleted) return list;
    return list.filter((p) => !p.deleted_at && (!p.notes || !p.notes.includes('[DIBATALKAN]')));
  }

  async findOne(companyId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, company_id: companyId },
      include: {
        allocations: {
          include: { sales_order: true, invoice: true },
        },
        customer: true,
      },
    });
  }

  /**
   * Refund an unallocated customer advance / deposit.
   * Decreases Customer Deposit Liability (2-1200) and executes Cash Out (1-1001).
   */
  async refundCustomerAdvance(
    companyId: string,
    paymentId: string,
    data: { cashAccountId: string; amount: number; reference?: string; notes?: string; idempotencyKey?: string },
    userId?: string,
  ) {
    const refundAmount = this.roundMoney(data.amount);
    if (refundAmount <= 0) {
      throw new BadRequestException('Jumlah pengembalian dana deposit harus lebih besar dari 0');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Idempotency Check
      if (data.idempotencyKey) {
        const existingRef = await tx.customerAdvanceRefund.findFirst({
          where: {
            payment_id: paymentId,
            idempotency_key: data.idempotencyKey,
            status: 'COMPLETED',
          },
        });
        if (existingRef) {
          return {
            success: true,
            idempotent: true,
            refundId: existingRef.id,
            refundNumber: existingRef.refund_number,
          };
        }
      }

      // 2. Concurrency Lock: Lock payment row
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT 1 FROM "Payment" WHERE id = ${paymentId}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      const payment = await tx.payment.findFirst({
        where: { id: paymentId, company_id: companyId },
        include: {
          allocations: true,
          advance_refunds: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Data penerimaan pembayaran / deposit tidak ditemukan');
      }

      if (payment.deleted_at || (payment.notes && payment.notes.includes('[DIBATALKAN]'))) {
        throw new BadRequestException('Penerimaan pembayaran ini berstatus batal / reversed dan tidak dapat direfund');
      }

      // 3. Authoritative calculation of available advance balance
      const totalAppliedToInvoices = this.roundMoney(
        payment.allocations
          .filter((a: any) => a.invoice_id != null)
          .reduce((sum: number, a: any) => sum + a.amount, 0),
      );

      const totalPreviouslyRefunded = this.roundMoney(
        (payment.advance_refunds || [])
          .filter((r: any) => r.status === 'COMPLETED')
          .reduce((sum: number, r: any) => sum + r.amount, 0),
      );

      const availableAdvance = this.roundMoney(payment.amount - totalAppliedToInvoices - totalPreviouslyRefunded);

      if (refundAmount > availableAdvance) {
        throw new BadRequestException(
          `Jumlah refund (${refundAmount}) melebihi sisa deposit pelanggan yang tersedia (${availableAdvance})`,
        );
      }

      // 4. Validate Cash Account
      const cashAcc = await tx.cashAccount.findFirst({
        where: { id: data.cashAccountId, company_id: companyId },
      });
      if (!cashAcc) {
        throw new BadRequestException('Akun Kas/Bank pengeluaran tidak valid');
      }

      // 5. Generate unique refund number
      let refundNumber: string;
      try {
        refundNumber = await this.sequenceService.generateNumber(
          tx,
          companyId,
          'CUSTOMER_ADVANCE_REFUND',
          'ADVR',
          5,
        );
      } catch {
        refundNumber = `ADVR-${Date.now()}`;
      }

      // 6. Record CustomerAdvanceRefund record
      const refund = await tx.customerAdvanceRefund.create({
        data: {
          company_id: companyId,
          payment_id: payment.id,
          customer_id: payment.customer_id,
          refund_number: refundNumber,
          cash_account_id: cashAcc.id,
          amount: refundAmount,
          reference: data.reference,
          notes: data.notes,
          idempotency_key: data.idempotencyKey,
          status: 'COMPLETED',
          refund_date: new Date(),
          created_by: userId,
        },
      });

      // 7. Record Cash Out in FinanceTransaction
      await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          transaction_no: 'TRX-' + Date.now(),
          transaction_type: 'Cash Out',
          cash_account_id: cashAcc.id,
          reference_type: 'CUSTOMER_ADVANCE_REFUND',
          reference_id: refund.id,
          transaction_date: refund.refund_date,
          status: 'COMPLETED',
          description: `Pengembalian Uang Muka / Deposit Pelanggan atas Pembayaran ${payment.payment_number}`,
          total_amount: refundAmount,
          created_by: userId || '000000000000000000000000',
        },
      });

      // Update cash account balance
      await tx.cashAccount.update({
        where: { id: cashAcc.id },
        data: {
          current_balance: { decrement: refundAmount },
        },
      });

      // 8. GL Journal: Debit Customer Deposit Liability (2-1200), Credit Kas/Bank (1-1001)
      const cashGlAccount = cashAcc.chart_of_account_id || (await this.resolveAccount(
        tx,
        companyId,
        ['1-1001', '1001', '1-1002'],
        ['Kas Utama', 'Bank', cashAcc.name],
        'Debit',
      ));

      const depositLiabilityAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1200', '2-1210', '2120'],
        ['Uang Muka Penjualan', 'Customer Deposit', 'Kewajiban Uang Muka'],
        'Credit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CUSTOMER_ADVANCE_REFUND',
        referenceId: refund.id,
        description: `Pengembalian Uang Muka Pelanggan atas Pembayaran ${payment.payment_number}`,
        items: [
          { accountId: depositLiabilityAccountId, debit: refundAmount, credit: 0 },
          { accountId: cashGlAccount, debit: 0, credit: refundAmount },
        ],
      });

      const newRemainingAdvance = this.roundMoney(availableAdvance - refundAmount);

      return {
        success: true,
        refundId: refund.id,
        refundNumber: refund.refund_number,
        paymentNumber: payment.payment_number,
        refundAmount,
        remainingAdvance: newRemainingAdvance,
      };
    });
  }

  /**
   * Reverse an Advance Refund.
   * Restores deposit liability and records compensating Cash In.
   */
  async reverseAdvanceRefund(
    companyId: string,
    refundId: string,
    reason: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const refund = await tx.customerAdvanceRefund.findFirst({
        where: { id: refundId, company_id: companyId },
        include: { payment: true },
      });

      if (!refund) {
        throw new NotFoundException('Data pengembalian dana deposit tidak ditemukan');
      }

      if (refund.status === 'REVERSED') {
        throw new BadRequestException('Pengembalian dana ini sudah pernah dibatalkan sebelumnya');
      }

      // Concurrency Lock
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT 1 FROM "CustomerAdvanceRefund" WHERE id = ${refund.id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
        await tx.$executeRaw`SELECT 1 FROM "Payment" WHERE id = ${refund.payment_id}::uuid AND company_id = ${companyId}::uuid FOR UPDATE`;
      }

      // Mark Refund as REVERSED
      await tx.customerAdvanceRefund.update({
        where: { id: refund.id },
        data: {
          status: 'REVERSED',
          reversal_reason: reason,
          reversed_at: new Date(),
          reversed_by: userId,
        },
      });

      // Compensating Cash In
      await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          transaction_no: 'TRX-' + Date.now(),
          transaction_type: 'Cash In',
          cash_account_id: refund.cash_account_id,
          reference_type: 'CUSTOMER_ADVANCE_REFUND_REVERSAL',
          reference_id: refund.id,
          transaction_date: new Date(),
          status: 'COMPLETED',
          description: `Pembatalan Pengembalian Uang Muka ${refund.refund_number}: ${reason}`,
          total_amount: refund.amount,
          created_by: userId || '000000000000000000000000',
        },
      });

      // Restore cash account balance
      await tx.cashAccount.update({
        where: { id: refund.cash_account_id },
        data: {
          current_balance: { increment: refund.amount },
        },
      });

      // Compensating GL Journal: Debit Kas/Bank (1-1001), Credit Customer Deposit Liability (2-1200)
      const cashAcc = await tx.cashAccount.findFirst({
        where: { id: refund.cash_account_id },
      });
      const cashGlAccount = cashAcc?.chart_of_account_id || (await this.resolveAccount(
        tx,
        companyId,
        ['1-1001', '1001', '1-1002'],
        ['Kas Utama', 'Bank'],
        'Debit',
      ));

      const depositLiabilityAccountId = await this.resolveAccount(
        tx,
        companyId,
        ['2-1200', '2-1210', '2120'],
        ['Uang Muka Penjualan', 'Customer Deposit', 'Kewajiban Uang Muka'],
        'Credit',
      );

      await this.glService.createJournalEntryWithinTx(tx, {
        companyId,
        entryDate: new Date(),
        referenceType: 'CUSTOMER_ADVANCE_REFUND_REVERSAL',
        referenceId: refund.id,
        description: `Pembatalan Refund Uang Muka ${refund.refund_number}: ${reason}`,
        items: [
          { accountId: cashGlAccount, debit: refund.amount, credit: 0 },
          { accountId: depositLiabilityAccountId, debit: 0, credit: refund.amount },
        ],
      });

      return {
        success: true,
        message: 'Pengembalian dana deposit berhasil dibatalkan dan saldo dipulihkan',
        restoredAmount: refund.amount,
      };
    });
  }

}
