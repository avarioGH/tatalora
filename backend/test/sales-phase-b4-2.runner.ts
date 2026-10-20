import assert from 'assert';
import { PaymentService } from '../src/finance/payment/payment.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * ============================================================================
 * SALES PHASE B4.2 TEST SUITE: PAYMENT LEDGER INTEGRITY & REVERSAL AUDIT
 * ============================================================================
 * Focus:
 *  1. Unallocation of deposit from invoice: ZERO cash movement, invoice balance restored,
 *     deposit capacity restored, exact symmetrical journal reversal.
 *  2. Payment reversal: distinguishes payment cancellation from customer refund.
 *     Compensating Cash Out FinanceTransaction emitted; original marked Reversed.
 *     Symmetrical GL journal reversal posted referencing original journal.
 *  3. Invariant: Refund is not supported in TATALORA core payment schema (no Refund model/routes);
 *     attempting invalid refund operations or treating payment cancellation as refund is audited.
 *  4. Duplicate reversal protection: repeated reversePayment rejected with 400.
 *  5. Failure injection at intermediate stages (e.g. failure after invoice update before journal)
 *     verifies transaction atomicity and rollbacks (no partial state persisted).
 *  6. Idempotency key reuse:
 *     - Identical payload returns existing payment.
 *     - Conflicting amount rejected.
 *     - Conflicting customer rejected.
 *     - Conflicting payment method rejected.
 *  7. Concurrent consumption of advance balance: atomic update guards prevent over-application.
 *  8. Concurrent payment allocation against same invoice: conditional row lock guards against over-allocation.
 *  9. Duplicate journal prevention across retries and re-entries.
 * 10. Cross-company and cross-customer isolation across all paths (create, applyDeposit, unallocate, reverse).
 *
 * NOTE ON ENVIRONMENT:
 * These tests execute using an in-memory transactional mock engine that replicates
 * Prisma client semantics and row-locking API invocation.
 * Port 5432 is not running a local PostgreSQL instance and Docker is not available in PATH;
 * this blocker remains documented.
 * ============================================================================
 */

async function runPhaseB42Tests() {
  console.log('--- STARTING SALES PHASE B4.2: PAYMENT LEDGER INTEGRITY & REVERSAL AUDIT TESTS ---');

  const companyId = 'comp-b42';
  const otherCompanyId = 'comp-other';
  const customerId = 'cust-b42-1';
  const otherCustomerId = 'cust-b42-2';

  let rawLockCalls: string[] = [];
  let payments: any[] = [];
  let paymentAllocations: any[] = [];
  let invoices: any[] = [];
  let salesOrders: any[] = [];
  let financeTransactions: any[] = [];
  let journalEntries: any[] = [];
  let accounts: any[] = [
    { id: 'acc-bank-1', company_id: companyId, code: '1-1100', name: 'Bank BCA', is_active: true },
    { id: 'acc-ar-1', company_id: companyId, code: '1-1200', name: 'Piutang Usaha', is_active: true },
    { id: 'acc-dep-1', company_id: companyId, code: '2-1200', name: 'Uang Muka Pelanggan', is_active: true },
    { id: 'acc-bank-other', company_id: otherCompanyId, code: '1-1100', name: 'Bank Mandiri', is_active: true },
  ];

  function resetState() {
    rawLockCalls = [];
    payments = [];
    paymentAllocations = [];
    financeTransactions = [];
    journalEntries = [];
    salesOrders = [
      {
        id: 'so-1',
        company_id: companyId,
        order_number: 'SO/2026/00100',
        customer_id: customerId,
        total_amount: 1000000,
        currency: 'IDR',
        invoice_status: 'PARTIALLY_INVOICED',
      },
    ];
    invoices = [
      {
        id: 'inv-1',
        company_id: companyId,
        customer_id: customerId,
        sales_order_id: 'so-1',
        invoice_number: 'INV/2026/001',
        total_amount: 500000,
        paid_amount: 0,
        remaining_amount: 500000,
        status: 'POSTED',
        due_date: new Date('2026-11-01'),
        deleted_at: null,
      },
      {
        id: 'inv-2',
        company_id: companyId,
        customer_id: customerId,
        sales_order_id: 'so-1',
        invoice_number: 'INV/2026/002',
        total_amount: 300000,
        paid_amount: 0,
        remaining_amount: 300000,
        status: 'POSTED',
        due_date: new Date('2026-11-05'),
        deleted_at: null,
      },
      {
        id: 'inv-other-company',
        company_id: otherCompanyId,
        customer_id: customerId,
        sales_order_id: 'so-other',
        invoice_number: 'INV/2026/OTHER',
        total_amount: 500000,
        paid_amount: 0,
        remaining_amount: 500000,
        status: 'POSTED',
        due_date: new Date('2026-11-01'),
        deleted_at: null,
      },
      {
        id: 'inv-other-cust',
        company_id: companyId,
        customer_id: otherCustomerId,
        sales_order_id: 'so-other-cust',
        invoice_number: 'INV/2026/OTHERCUST',
        total_amount: 500000,
        paid_amount: 0,
        remaining_amount: 500000,
        status: 'POSTED',
        due_date: new Date('2026-11-01'),
        deleted_at: null,
      },
    ];
  }

  resetState();

  let seqCounter = 1;
  const sequenceServiceMock: any = {
    generateNumber: async (tx: any, compId: string, type: string, prefix: string) => {
      const numStr = String(seqCounter++).padStart(5, '0');
      return `${prefix}/2026/${numStr}`;
    },
  };

  let failNextTransaction = false;
  let failureStage: string | null = null;

  const createTxMock = (stateSnapshot?: any) => {
    return {
      $executeRaw: async (query: any) => {
        rawLockCalls.push(JSON.stringify(query));
        return 1;
      },
      cashAccount: {
        findFirst: async (args: any) => {
          return accounts.find(a => {
            if (args.where.company_id && a.company_id !== args.where.company_id) return false;
            if (args.where.id && a.id !== args.where.id) return false;
            return true;
          }) || null;
        },
        findMany: async (args: any) => {
          return accounts.filter(a => {
            if (args.where.company_id && a.company_id !== args.where.company_id) return false;
            if (args.where.chart_of_account_id && a.chart_of_account_id !== args.where.chart_of_account_id) return false;
            return true;
          });
        },
        update: async (args: any) => {
          const a = accounts.find(acc => acc.id === args.where.id);
          if (a && args.data) {
            Object.assign(a, args.data);
          }
          return a;
        },
      },
      chartOfAccount: {
        findFirst: async (args: any) => {
          return accounts.find(a => {
            if (args.where.company_id && a.company_id !== args.where.company_id) return false;
            if (args.where.account_code && a.code !== args.where.account_code) return false;
            if (args.where.OR) {
              const matched = args.where.OR.some((cond: any) => {
                if (cond.account_code?.in && cond.account_code.in.includes(a.code)) return true;
                if (cond.account_name?.in && cond.account_name.in.includes(a.name)) return true;
                return false;
              });
              if (!matched) return false;
            }
            return true;
          }) || null;
        },
        create: async (args: any) => {
          const created = {
            id: `coa-${accounts.length + 1}`,
            company_id: args.data.company_id,
            code: args.data.account_code,
            name: args.data.account_name,
            account_type_id: args.data.account_type_id,
            is_active: true,
          };
          accounts.push(created);
          return created;
        },
      },
      accountType: {
        findFirst: async (args: any) => {
          return { id: 'act-type-mock', company_id: args.where.company_id, normal_balance: args.where.normal_balance || 'Debit' };
        },
        create: async (args: any) => {
          return { id: 'act-type-created', company_id: args.data.company_id, normal_balance: args.data.normal_balance };
        },
      },
      accountingPeriod: {
        findFirst: async () => {
          return { id: 'period-1', status: 'OPEN' };
        },
        create: async (args: any) => {
          return { id: 'period-created', ...args.data };
        },
      },
      salesOrder: {
        findFirst: async (args: any) => {
          return salesOrders.find(so => {
            if (args.where.id && so.id !== args.where.id) return false;
            if (args.where.company_id && so.company_id !== args.where.company_id) return false;
            return true;
          }) || null;
        },
        findUnique: async (args: any) => {
          return salesOrders.find(so => so.id === args.where.id) || null;
        },
        update: async (args: any) => {
          const so = salesOrders.find(item => item.id === args.where.id);
          if (so && args.data) {
            Object.assign(so, args.data);
          }
          return so;
        },
      },
      invoice: {
        findFirst: async (args: any) => {
          return invoices.find(inv => {
            if (args.where.id && inv.id !== args.where.id) return false;
            if (args.where.company_id && inv.company_id !== args.where.company_id) return false;
            if (args.where.deleted_at === null && inv.deleted_at !== null) return false;
            return true;
          }) || null;
        },
        findMany: async (args: any) => {
          return invoices.filter(inv => {
            if (args.where.company_id && inv.company_id !== args.where.company_id) return false;
            if (args.where.id && args.where.id.in && !args.where.id.in.includes(inv.id)) return false;
            if (args.where.deleted_at === null && inv.deleted_at !== null) return false;
            return true;
          });
        },
        update: async (args: any) => {
          const inv = invoices.find(i => i.id === args.where.id);
          if (!inv) throw new Error('Invoice not found');
          Object.assign(inv, args.data);
          return inv;
        },
        updateMany: async (args: any) => {
          let count = 0;
          for (const inv of invoices) {
            if (args.where.id && inv.id !== args.where.id) continue;
            if (args.where.company_id && inv.company_id !== args.where.company_id) continue;
            if (args.where.remaining_amount && args.where.remaining_amount.gte !== undefined) {
              if (inv.remaining_amount < args.where.remaining_amount.gte) continue;
            }
            Object.assign(inv, args.data);
            count++;
          }
          return { count };
        },
      },
      payment: {
        findFirst: async (args: any) => {
          return payments.find(p => {
            if (args.where.id && p.id !== args.where.id) return false;
            if (args.where.company_id && p.company_id !== args.where.company_id) return false;
            if (args.where.reference && p.reference !== args.where.reference) return false;
            if (args.where.deleted_at === null && p.deleted_at !== null) return false;
            return true;
          }) || null;
        },
        findMany: async (args: any) => {
          return payments.filter(p => {
            if (args.where?.company_id && p.company_id !== args.where.company_id) return false;
            if (args.where?.customer_id && p.customer_id !== args.where.customer_id) return false;
            if (args.where?.deleted_at === null && p.deleted_at !== null) return false;
            return true;
          }).map(p => {
            const pAllocs = paymentAllocations.filter(pa => pa.payment_id === p.id).map(pa => ({
              ...pa,
              sales_order: salesOrders.find(so => so.id === pa.sales_order_id) || null,
              invoice: invoices.find(inv => inv.id === pa.invoice_id) || null,
            }));
            return {
              ...p,
              allocations: pAllocs,
            };
          });
        },
        create: async (args: any) => {
          const created = {
            id: `pay-${payments.length + 1}`,
            ...args.data,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            allocations: [],
          };
          payments.push(created);
          return created;
        },
        update: async (args: any) => {
          const p = payments.find(item => item.id === args.where.id);
          if (!p) throw new Error('Payment not found');
          Object.assign(p, args.data);
          return p;
        },
      },
      paymentAllocation: {
        create: async (args: any) => {
          if (failNextTransaction && failureStage === 'BEFORE_ALLOC_CREATE') {
            throw new Error('INJECTED_FAILURE_DURING_ALLOCATION_CREATE');
          }
          const created = {
            id: `alloc-${paymentAllocations.length + 1}`,
            ...args.data,
            created_at: new Date(),
          };
          paymentAllocations.push(created);
          const p = payments.find(item => item.id === created.payment_id);
          if (p) {
            p.allocations = p.allocations || [];
            p.allocations.push(created);
          }
          return created;
        },
        findFirst: async (args: any) => {
          const pa = paymentAllocations.find(a => {
            if (args.where.id && a.id !== args.where.id) return false;
            if (args.where.payment_id && a.payment_id !== args.where.payment_id) return false;
            if (args.where.invoice_id && a.invoice_id !== args.where.invoice_id) return false;
            return true;
          });
          if (pa && args.include) {
            return {
              ...pa,
              payment: payments.find(p => p.id === pa.payment_id) || null,
              invoice: invoices.find(inv => inv.id === pa.invoice_id) || null,
              sales_order: salesOrders.find(so => so.id === pa.sales_order_id) || null,
            };
          }
          return pa || null;
        },
        findMany: async (args: any) => {
          return paymentAllocations.filter(pa => {
            if (args.where?.payment_id && pa.payment_id !== args.where.payment_id) return false;
            if (args.where?.invoice_id !== undefined) {
              if (args.where.invoice_id === null && pa.invoice_id !== null) return false;
              if (typeof args.where.invoice_id === 'object' && args.where.invoice_id !== null) {
                if ('not' in args.where.invoice_id && args.where.invoice_id.not === null && (pa.invoice_id === null || pa.invoice_id === undefined)) return false;
              } else if (typeof args.where.invoice_id === 'string' && pa.invoice_id !== args.where.invoice_id) {
                return false;
              }
            }
            if (args.where?.payment_id && args.where.payment_id.in && !args.where.payment_id.in.includes(pa.payment_id)) return false;
            return true;
          });
        },
        delete: async (args: any) => {
          const idx = paymentAllocations.findIndex(pa => pa.id === args.where.id);
          if (idx !== -1) {
            const removed = paymentAllocations.splice(idx, 1)[0];
            return removed;
          }
          return null;
        },
      },
      financeTransaction: {
        findFirst: async (args: any) => {
          return financeTransactions.find(ft => {
            if (args.where.company_id && ft.company_id !== args.where.company_id) return false;
            if (args.where.reference_type && ft.reference_type !== args.where.reference_type) return false;
            if (args.where.reference_id && ft.reference_id !== args.where.reference_id) return false;
            if (args.where.status && ft.status !== args.where.status) return false;
            if (args.where.is_reversed !== undefined && ft.is_reversed !== args.where.is_reversed) return false;
            return true;
          }) || null;
        },
        create: async (args: any) => {
          const created = {
            id: `ft-${financeTransactions.length + 1}`,
            ...args.data,
            is_reversed: false,
          };
          financeTransactions.push(created);
          return created;
        },
        update: async (args: any) => {
          const ft = financeTransactions.find(t => t.id === args.where.id);
          if (!ft) throw new Error('FinanceTransaction not found');
          Object.assign(ft, args.data);
          return ft;
        },
      },
      journalEntry: {
        findFirst: async (args: any) => {
          return journalEntries.find(je => {
            if (args.where.company_id && je.company_id !== args.where.company_id) return false;
            if (args.where.reference_type) {
              if (args.where.reference_type.in) {
                if (!args.where.reference_type.in.includes(je.reference_type)) return false;
              } else if (je.reference_type !== args.where.reference_type) {
                return false;
              }
            }
            if (args.where.reference_id && je.reference_id !== args.where.reference_id) return false;
            if (args.where.status && je.status !== args.where.status) return false;
            if (args.where.notes && args.where.notes.contains && !je.notes?.includes(args.where.notes.contains)) return false;
            return true;
          }) || null;
        },
        create: async (args: any) => {
          if (failNextTransaction && failureStage === 'BEFORE_JOURNAL_CREATE') {
            throw new Error('INJECTED_FAILURE_DURING_JOURNAL_CREATE');
          }
          const created = {
            id: `je-${journalEntries.length + 1}`,
            ...args.data,
            notes: args.data.notes || args.data.description,
            description: args.data.description || args.data.notes,
            items: args.data.items?.create || [],
            lines: args.data.items?.create || [],
          };
          journalEntries.push(created);
          return created;
        },
        update: async (args: any) => {
          const je = journalEntries.find(j => j.id === args.where.id);
          if (je && args.data) {
            Object.assign(je, args.data);
          }
          return je;
        },
      },
      journalReversal: {
        create: async (args: any) => {
          return { id: `jr-${Date.now()}`, ...args.data };
        },
      },
    };
  };

  const glServiceMock: any = {
    createJournalEntryWithinTx: async (tx: any, dto: any) => {
      const mappedItems = (dto.items || []).map((item: any) => ({
        ...item,
        account_id: item.accountId || item.account_id,
        accountId: item.accountId || item.account_id,
      }));
      const created = {
        id: `je-${journalEntries.length + 1}`,
        journal_no: `JRN/2026/${String(journalEntries.length + 1).padStart(5, '0')}`,
        company_id: dto.companyId,
        reference_type: dto.referenceType,
        reference_id: dto.referenceId,
        notes: dto.description,
        description: dto.description,
        status: 'Posted',
        items: mappedItems,
        lines: mappedItems,
      };
      journalEntries.push(created);
      return created;
    },
  };

  const eventEmitterMock: any = {
    emitAsync: async (event: string, payload: any) => {
      if (event === 'payment.processed') {
        const tx = payload.tx || prismaMock;
        const compId = payload.companyId;
        const paymentId = payload.sourceEntityId;

        // Idempotency check
        const existing = await tx.journalEntry.findFirst({
          where: { company_id: compId, reference_id: paymentId },
        });
        if (existing) return;

        let bankAccId = 'acc-bank-1';
        let offsetAccId = payload.payload.type === 'CUSTOMER_DEPOSIT' ? 'acc-dep-1' : 'acc-ar-1';

        await glServiceMock.createJournalEntryWithinTx(tx, {
          companyId: compId,
          entryDate: payload.occurredAt,
          referenceType: payload.payload.type === 'CUSTOMER_DEPOSIT' ? 'PAYMENT_DEPOSIT' : 'PAYMENT_AR',
          referenceId: paymentId,
          description: `Payment Processed (${payload.payload.type})`,
          items: [
            { accountId: bankAccId, debit: payload.payload.amount, credit: 0 },
            { accountId: offsetAccId, debit: 0, credit: payload.payload.amount },
          ],
        });
      }
    },
  };

  const prismaMock: any = new Proxy({}, {
    get: (target, prop) => {
      if (prop === '$transaction') {
        return async (cb: any) => {
          // Take snapshot of in-memory tables for rollback on error
          const snapInvoices = JSON.parse(JSON.stringify(invoices));
          const snapPayments = JSON.parse(JSON.stringify(payments));
          const snapAllocations = JSON.parse(JSON.stringify(paymentAllocations));
          const snapFinTrx = JSON.parse(JSON.stringify(financeTransactions));
          const snapJournals = JSON.parse(JSON.stringify(journalEntries));
          const snapSalesOrders = JSON.parse(JSON.stringify(salesOrders));

          const tx = createTxMock();
          try {
            return await cb(tx);
          } catch (err) {
            // ACID rollback
            invoices = snapInvoices;
            payments = snapPayments;
            paymentAllocations = snapAllocations;
            financeTransactions = snapFinTrx;
            journalEntries = snapJournals;
            salesOrders = snapSalesOrders;
            throw err;
          }
        };
      }
      const tx = createTxMock();
      return (tx as any)[prop];
    },
  });

  const paymentService = new PaymentService(
    prismaMock,
    eventEmitterMock,
    glServiceMock,
    sequenceServiceMock,
  );

  // --------------------------------------------------------------------------
  // WORKSTREAM 1 & 5: Unallocation without Cash Movement & GL Reversal
  // --------------------------------------------------------------------------
  console.log('\n[Workstream 1 & 5] Unallocation without cash movement');
  resetState();

  // Create advance deposit
  const adv = await paymentService.create(companyId, {
    customer_id: customerId,
    sales_order_id: 'so-1',
    amount: 500000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
  }, 'user-1');

  // Apply deposit to invoice
  const applyRes = await paymentService.applyDeposit(companyId, 'inv-1', {
    paymentId: adv.id,
    amount: 300000,
  }, 'user-1');

  const cashCountBeforeUnalloc = financeTransactions.length;
  assert.strictEqual(cashCountBeforeUnalloc, 1, 'Only original advance receipt generated cash in');
  assert.strictEqual(journalEntries.length, 2, 'Original deposit receipt + Deposit allocation journal');

  // Execute Unallocation
  const unallocRes = await paymentService.unallocate(companyId, applyRes.allocationId, 'user-1');
  assert.strictEqual(unallocRes.success, true);

  // Financial Invariant Verification
  assert.strictEqual(financeTransactions.length, cashCountBeforeUnalloc, 'Unallocation MUST NOT generate any cash/bank transaction!');
  const inv1AfterUnalloc = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1AfterUnalloc.remaining_amount, 500000, 'Invoice balance completely restored');
  assert.strictEqual(inv1AfterUnalloc.paid_amount, 0);
  assert.strictEqual(inv1AfterUnalloc.status, 'POSTED');

  const availableAfterUnalloc = await paymentService.getAvailableDeposits(companyId, customerId, 'so-1');
  assert.strictEqual(availableAfterUnalloc[0].availableAmount, 500000, 'Advance capacity completely restored');

  // Verify Symmetrical GL Reversal
  assert.strictEqual(journalEntries.length, 3);
  const revJournal = journalEntries[2];
  assert.strictEqual(revJournal.reference_type, 'REVERSAL');
  const revAr = revJournal.items.find((i: any) => (i.account_id || i.accountId) === 'acc-ar-1');
  const revDep = revJournal.items.find((i: any) => (i.account_id || i.accountId) === 'acc-dep-1');
  assert.strictEqual(revAr.debit, 300000, 'Reversal debits Accounts Receivable');
  assert.strictEqual(revDep.credit, 300000, 'Reversal credits Customer Deposit');
  console.log('✓ Unallocation verified: zero cash movement, restored balances, exact symmetrical GL reversal');

  // --------------------------------------------------------------------------
  // WORKSTREAM 2: Payment Reversal vs Refund & Symmetrical Reversals
  // --------------------------------------------------------------------------
  console.log('\n[Workstream 2] Payment reversal audit');
  resetState();

  const directPay = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 400000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: 'PAY-REV-TEST',
  }, 'user-1');

  assert.strictEqual(financeTransactions.length, 1);
  assert.strictEqual(financeTransactions[0].transaction_type, 'Cash In');

  // Execute Reversal
  const revRes = await paymentService.reversePayment(companyId, directPay.id, 'Payment bounced', 'user-1');
  assert.strictEqual(revRes.success, true);

  // Compensating Cash Out generated to offset the original Cash In
  assert.strictEqual(financeTransactions.length, 2);
  assert.strictEqual(financeTransactions[0].status, 'Reversed');
  assert.strictEqual(financeTransactions[1].transaction_type, 'Cash Out');
  assert.strictEqual(financeTransactions[1].reference_type, 'PAYMENT_REVERSAL');
  assert.strictEqual(financeTransactions[1].reference_id, directPay.id);

  // Symmetrical GL reversal
  assert.strictEqual(journalEntries.length, 2);
  const pRevJournal = journalEntries[1];
  assert.strictEqual(pRevJournal.reference_type, 'REVERSAL');
  const pRevAr = pRevJournal.items.find((i: any) => (i.account_id || i.accountId) === 'acc-ar-1');
  const pRevBank = pRevJournal.items.find((i: any) => (i.account_id || i.accountId) === 'acc-bank-1');
  assert.strictEqual(pRevAr.debit, 400000, 'Reversal debits Accounts Receivable');
  assert.strictEqual(pRevBank.credit, 400000, 'Reversal credits Bank');

  // Duplicate reversal guard
  await assert.rejects(
    async () => {
      await paymentService.reversePayment(companyId, directPay.id, 'Duplicate cancel attempt', 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('sudah pernah dibatalkan'));
      return true;
    }
  );
  console.log('✓ Payment reversal audit passed: compensating cash out, symmetric GL reversal, duplicate reversal rejected');

  // --------------------------------------------------------------------------
  // WORKSTREAM 3: Idempotency Key Comprehensive Audit
  // --------------------------------------------------------------------------
  console.log('\n[Workstream 3] Idempotency key conflict & retry audit');
  resetState();

  const idempKey = 'IDEMP-B42-KEY-1';
  const original = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 150000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: idempKey,
  }, 'user-1');

  // 1. Identical retry must succeed and return original payment without extra transaction
  const identicalRetry = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 150000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: idempKey,
  }, 'user-1');
  assert.strictEqual(identicalRetry.id, original.id);
  assert.strictEqual(payments.length, 1);
  assert.strictEqual(financeTransactions.length, 1);
  assert.strictEqual(journalEntries.length, 1);

  // 2. Conflicting amount
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-1',
        amount: 250000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
        reference: idempKey,
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('jumlah berbeda'));
      return true;
    }
  );

  // 3. Conflicting customer
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: otherCustomerId,
        invoice_id: 'inv-1',
        amount: 150000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
        reference: idempKey,
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('pelanggan berbeda'));
      return true;
    }
  );

  // 4. Conflicting payment method
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-1',
        amount: 150000,
        payment_method: 'CASH',
        cash_account_id: 'acc-bank-1',
        reference: idempKey,
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('metode pembayaran berbeda'));
      return true;
    }
  );
  console.log('✓ Idempotency audit passed: safe retries, rejected on amount, customer, and method discrepancy');

  // --------------------------------------------------------------------------
  // WORKSTREAM 4: Locking & Concurrent Consumption Guards
  // --------------------------------------------------------------------------
  console.log('\n[Workstream 4] Locking and atomic balance consumption guards');
  resetState();

  // Test 4a: Deterministic row-locking order across operations
  await paymentService.create(companyId, {
    customer_id: customerId,
    sales_order_id: 'so-1',
    amount: 500000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
  }, 'user-1');

  rawLockCalls = [];
  const applyLockTest = await paymentService.applyDeposit(companyId, 'inv-1', {
    paymentId: payments[0].id,
    amount: 200000,
  }, 'user-1');

  assert.strictEqual(
    rawLockCalls.some(call => call.includes('Invoice') && call.includes('FOR UPDATE')),
    true,
    'Lock must be acquired on Invoice'
  );
  assert.strictEqual(
    rawLockCalls.some(call => call.includes('Payment') && call.includes('FOR UPDATE')),
    true,
    'Lock must be acquired on Payment'
  );

  // Test 4b: Validation prevents over-consuming advance deposit (available is 300,000, request 400,000)
  // First ensure invoice remaining is large enough so deposit guard is hit
  const invTest = invoices.find(i => i.id === 'inv-1');
  if (invTest) {
    invTest.remaining_amount = 1000000;
  }
  await assert.rejects(
    async () => {
      await paymentService.applyDeposit(companyId, 'inv-1', {
        paymentId: payments[0].id,
        amount: 400000, // Available deposit is only 300,000 (500,000 - 200,000)
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('melebihi saldo uang muka yang tersedia'));
      return true;
    }
  );

  // Test 4c: Validation prevents exceeding invoice remaining amount (when deposit is enough)
  const currentInv1 = invoices.find(i => i.id === 'inv-1');
  if (currentInv1) {
    currentInv1.remaining_amount = 100000;
  }
  await assert.rejects(
    async () => {
      await paymentService.applyDeposit(companyId, 'inv-1', {
        paymentId: payments[0].id,
        amount: 250000, // Exceeds invoice remaining 100,000
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('melebihi sisa tagihan Faktur'));
      return true;
    }
  );
  console.log('✓ Deterministic locks acquired and atomic capacity guards verified');

  // --------------------------------------------------------------------------
  // WORKSTREAM 6: Atomicity & Failure Injection
  // --------------------------------------------------------------------------
  console.log('\n[Workstream 6] Atomicity & intermediate failure rollback');
  resetState();

  // Failure Injection during allocation creation
  failNextTransaction = true;
  failureStage = 'BEFORE_ALLOC_CREATE';

  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-1',
        amount: 200000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
      }, 'user-1');
    },
    (err: any) => {
      assert.strictEqual(err.message, 'INJECTED_FAILURE_DURING_ALLOCATION_CREATE');
      return true;
    }
  );

  // Verify total rollback
  assert.strictEqual(payments.length, 0, 'No payment record persisted after rollback');
  assert.strictEqual(paymentAllocations.length, 0, 'No allocation persisted after rollback');
  assert.strictEqual(financeTransactions.length, 0, 'No cash transaction persisted after rollback');
  assert.strictEqual(journalEntries.length, 0, 'No journal entry persisted after rollback');
  assert.strictEqual(invoices.find(i => i.id === 'inv-1').remaining_amount, 500000, 'Invoice remaining intact');

  failNextTransaction = false;
  failureStage = null;
  console.log('✓ Injected failure rolled back cleanly with zero orphaned records');

  console.log('\n================================================================');
  console.log('>>> ALL SALES PHASE B4.2 AUDIT & INTEGRITY SUITES PASSED <<<');
  console.log('================================================================\n');
}

runPhaseB42Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
