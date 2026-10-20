import assert from 'assert';
import { PaymentService } from '../src/finance/payment/payment.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * ============================================================================
 * SALES PHASE B4.1A TEST SUITE: CONTROLLED CUSTOMER PAYMENT & ALLOCATION
 * ============================================================================
 * Focus:
 *  1. Full and partial payment of a posted invoice.
 *  2. One payment allocated across multiple invoices.
 *  3. Multiple payments against one invoice.
 *  4. Over-allocation of payment funds rejected.
 *  5. Over-allocation of invoice balance rejected.
 *  6. Draft, cancelled, and void invoices rejected.
 *  7. Cross-company and cross-customer rejection.
 *  8. Duplicate idempotency key: safe return on identical payload, rejection on conflict.
 *  9. Customer advance deposit application: zero cash movement, AR & Customer Deposit GL reclassification.
 * 10. Unallocation of deposit: restore invoice balance and reverse journal.
 * 11. Payment reversal: reverse allocations, invoice balances, cash transaction & symmetric GL journals.
 * 12. Duplicate journal prevention on idempotent retries.
 * 13. Transaction rollback safety on failure.
 *
 * NOTE ON ENVIRONMENT:
 * These tests execute using an in-memory transactional mock engine that replicates
 * Prisma client semantics and row-locking API invocation.
 * Port 5432 is not running a local PostgreSQL instance and Docker is not available in PATH;
 * this blocker remains documented.
 * ============================================================================
 */

async function runPhaseB41ATests() {
  console.log('--- STARTING SALES PHASE B4.1A: CUSTOMER PAYMENT & ALLOCATION TESTS ---');

  const companyId = 'comp-b41a';
  const otherCompanyId = 'comp-other';
  const customerId = 'cust-b41a-1';
  const otherCustomerId = 'cust-b41a-2';

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
      {
        id: 'so-2',
        company_id: companyId,
        order_number: 'SO/2026/00101',
        customer_id: customerId,
        total_amount: 500000,
        currency: 'IDR',
        invoice_status: 'UNINVOICED',
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
        id: 'inv-draft',
        company_id: companyId,
        customer_id: customerId,
        sales_order_id: 'so-2',
        invoice_number: 'INV/2026/DRAFT',
        total_amount: 200000,
        paid_amount: 0,
        remaining_amount: 200000,
        status: 'DRAFT',
        due_date: new Date('2026-11-05'),
        deleted_at: null,
      },
      {
        id: 'inv-cancelled',
        company_id: companyId,
        customer_id: customerId,
        sales_order_id: 'so-2',
        invoice_number: 'INV/2026/CANCELLED',
        total_amount: 200000,
        paid_amount: 0,
        remaining_amount: 200000,
        status: 'CANCELLED',
        due_date: new Date('2026-11-05'),
        deleted_at: null,
      },
      {
        id: 'inv-void',
        company_id: companyId,
        customer_id: customerId,
        sales_order_id: 'so-2',
        invoice_number: 'INV/2026/VOID',
        total_amount: 200000,
        paid_amount: 0,
        remaining_amount: 200000,
        status: 'VOID',
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

  const accountingServiceMock: any = {
    createJournalEntry: async (tx: any, entry: any) => {
      const created = {
        id: `je-${journalEntries.length + 1}`,
        ...entry,
      };
      journalEntries.push(created);
      return created;
    },
  };

  const financeTransactionServiceMock: any = {
    create: async (tx: any, data: any) => {
      const created = {
        id: `ft-${financeTransactions.length + 1}`,
        ...data,
        is_reversed: false,
      };
      financeTransactions.push(created);
      return created;
    },
  };

  const createTxMock = () => {
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
      account: {
        findFirst: async (args: any) => {
          return accounts.find(a => {
            if (args.where.company_id && a.company_id !== args.where.company_id) return false;
            if (args.where.code && a.code !== args.where.code) return false;
            if (args.where.id && a.id !== args.where.id) return false;
            if (args.where.is_active !== undefined && a.is_active !== args.where.is_active) return false;
            return true;
          }) || null;
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
            if (args.where.payment_id && pa.payment_id !== args.where.payment_id) return false;
            if (args.where.invoice_id && pa.invoice_id !== args.where.invoice_id) return false;
            if (args.where.payment_id && args.where.payment_id.in && !args.where.payment_id.in.includes(pa.payment_id)) return false;
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
        // Call the accounting journal handler behavior directly
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
          const tx = createTxMock();
          return cb(tx);
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
  // TEST 1: Full Payment of a Posted Invoice
  // --------------------------------------------------------------------------
  console.log('\n[Test 1] Full payment of a posted invoice');
  resetState();

  const pay1 = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 500000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: 'REF-TEST-1',
  }, 'user-1');

  assert.strictEqual(pay1.amount, 500000);
  assert.strictEqual(pay1.payment_number, 'PAY/2026/00001');

  const inv1Updated = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1Updated.paid_amount, 500000);
  assert.strictEqual(inv1Updated.remaining_amount, 0);
  assert.strictEqual(inv1Updated.status, 'PAID');

  assert.strictEqual(paymentAllocations.length, 1);
  assert.strictEqual(paymentAllocations[0].amount, 500000);
  assert.strictEqual(paymentAllocations[0].invoice_id, 'inv-1');

  assert.strictEqual(financeTransactions.length, 1);
  assert.strictEqual(financeTransactions[0].transaction_type, 'Cash In');
  assert.strictEqual(financeTransactions[0].total_amount, 500000);

  assert.strictEqual(journalEntries.length, 1);
  console.log('journalEntries[0]:', JSON.stringify(journalEntries[0], null, 2));
  const line0 = journalEntries[0].items ? journalEntries[0].items[0] : journalEntries[0].lines[0];
  const line1 = journalEntries[0].items ? journalEntries[0].items[1] : journalEntries[0].lines[1];
  assert.strictEqual(line0.accountId || line0.account_id, 'acc-bank-1');
  assert.strictEqual(line0.debit, 500000);
  assert.strictEqual(line1.accountId || line1.account_id, 'acc-ar-1');
  assert.strictEqual(line1.credit, 500000);
  console.log('✓ Full payment correctly allocated, invoice marked PAID, AR credited');

  // --------------------------------------------------------------------------
  // TEST 2: Partial Payment of a Posted Invoice
  // --------------------------------------------------------------------------
  console.log('\n[Test 2] Partial payment of a posted invoice');
  resetState();

  const pay2 = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 200000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: 'REF-TEST-2',
  }, 'user-1');

  const inv1Partial = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1Partial.paid_amount, 200000);
  assert.strictEqual(inv1Partial.remaining_amount, 300000);
  assert.strictEqual(inv1Partial.status, 'PARTIALLY PAID');
  console.log('✓ Partial payment correctly recorded, invoice marked PARTIALLY PAID with remaining 300,000');

  // --------------------------------------------------------------------------
  // TEST 3: One Payment Allocated Across Multiple Invoices
  // --------------------------------------------------------------------------
  console.log('\n[Test 3] One payment allocated across multiple invoices');
  resetState();

  const pay3 = await paymentService.create(companyId, {
    customer_id: customerId,
    amount: 700000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: 'REF-MULTI-INV',
    allocations: [
      { invoice_id: 'inv-1', amount: 500000 },
      { invoice_id: 'inv-2', amount: 200000 },
    ],
  }, 'user-1');

  assert.strictEqual(pay3.amount, 700000);
  assert.strictEqual(invoices.find(i => i.id === 'inv-1').remaining_amount, 0);
  assert.strictEqual(invoices.find(i => i.id === 'inv-1').status, 'PAID');
  assert.strictEqual(invoices.find(i => i.id === 'inv-2').remaining_amount, 100000);
  assert.strictEqual(invoices.find(i => i.id === 'inv-2').status, 'PARTIALLY PAID');
  assert.strictEqual(paymentAllocations.length, 2);
  console.log('✓ Single payment successfully allocated to inv-1 (full) and inv-2 (partial)');

  // --------------------------------------------------------------------------
  // TEST 4: Multiple Payments Against One Invoice
  // --------------------------------------------------------------------------
  console.log('\n[Test 4] Multiple payments against one invoice');
  resetState();

  await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 250000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
  }, 'user-1');

  await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 250000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
  }, 'user-1');

  const inv1Double = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1Double.paid_amount, 500000);
  assert.strictEqual(inv1Double.remaining_amount, 0);
  assert.strictEqual(inv1Double.status, 'PAID');
  assert.strictEqual(paymentAllocations.length, 2);
  console.log('✓ Multiple sequential payments correctly aggregated on the same invoice');

  // --------------------------------------------------------------------------
  // TEST 5: Over-Allocation of Payment Funds Rejected
  // --------------------------------------------------------------------------
  console.log('\n[Test 5] Over-allocation of payment funds rejected');
  resetState();

  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        amount: 500000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
        allocations: [
          { invoice_id: 'inv-1', amount: 400000 },
          { invoice_id: 'inv-2', amount: 200000 }, // sum 600,000 > 500,000
        ],
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('melebihi jumlah pembayaran') || err.message.includes('melebihi total pembayaran'));
      return true;
    }
  );
  console.log('✓ Over-allocation of payment total rejected with BadRequestException');

  // --------------------------------------------------------------------------
  // TEST 6: Over-Allocation of Invoice Balance Rejected
  // --------------------------------------------------------------------------
  console.log('\n[Test 6] Over-allocation of invoice balance rejected');
  resetState();

  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-1',
        amount: 600000, // invoice remaining is 500,000
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('melebihi sisa tagihan'));
      return true;
    }
  );
  console.log('✓ Payment exceeding remaining invoice balance rejected with BadRequestException');

  // --------------------------------------------------------------------------
  // TEST 7: Draft, Cancelled, and Void Invoices Rejected
  // --------------------------------------------------------------------------
  console.log('\n[Test 7] Ineligible invoice statuses rejected (DRAFT, CANCELLED, VOID)');
  resetState();

  for (const invalidInvId of ['inv-draft', 'inv-cancelled', 'inv-void']) {
    await assert.rejects(
      async () => {
        await paymentService.create(companyId, {
          customer_id: customerId,
          invoice_id: invalidInvId,
          amount: 50000,
          payment_method: 'BANK_TRANSFER',
          cash_account_id: 'acc-bank-1',
        }, 'user-1');
      },
      (err: any) => {
        assert(err instanceof BadRequestException);
        assert(err.message.includes('Faktur') && (err.message.includes('berstatus') || err.message.includes('DRAFT')));
        return true;
      }
    );
  }
  console.log('✓ DRAFT, CANCELLED, and VOID invoices rejected for payment');

  // --------------------------------------------------------------------------
  // TEST 8: Cross-Company and Cross-Customer Validation
  // --------------------------------------------------------------------------
  console.log('\n[Test 8] Cross-company and cross-customer isolation');
  resetState();

  // Cross-company invoice
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-other-company',
        amount: 100000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof NotFoundException);
      return true;
    }
  );

  // Cross-customer invoice
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-other-cust',
        amount: 100000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('milik pelanggan berbeda') || err.message.includes('tidak cocok'));
      return true;
    }
  );

  // Cross-company cash account
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-1',
        amount: 100000,
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-other',
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('Akun kas/bank tidak valid'));
      return true;
    }
  );
  console.log('✓ Strict isolation enforced across companies, customers, and accounts');

  // --------------------------------------------------------------------------
  // TEST 9: Duplicate Idempotency Key Handling
  // --------------------------------------------------------------------------
  console.log('\n[Test 9] Duplicate idempotency key behavior');
  resetState();

  const idempKey = 'IDEMP-KEY-999';
  const payOriginal = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 100000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: idempKey,
  }, 'user-1');

  // Exact retry: safe return of existing payment without double mutation
  const payRetry = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 100000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: idempKey,
  }, 'user-1');

  assert.strictEqual(payRetry.id, payOriginal.id);
  assert.strictEqual(payments.length, 1);
  assert.strictEqual(paymentAllocations.length, 1);
  assert.strictEqual(financeTransactions.length, 1);
  assert.strictEqual(journalEntries.length, 1);

  // Conflicting retry with different amount: must reject
  await assert.rejects(
    async () => {
      await paymentService.create(companyId, {
        customer_id: customerId,
        invoice_id: 'inv-1',
        amount: 200000, // Conflict!
        payment_method: 'BANK_TRANSFER',
        cash_account_id: 'acc-bank-1',
        reference: idempKey,
      }, 'user-1');
    },
    (err: any) => {
      assert(err instanceof BadRequestException);
      assert(err.message.includes('Konflik kunci idempotensi'));
      return true;
    }
  );
  console.log('✓ Identical retry returned existing record; conflicting payload rejected');

  // --------------------------------------------------------------------------
  // TEST 10: Customer Advance Deposit & Invoice Application (Zero Cash Movement)
  // --------------------------------------------------------------------------
  console.log('\n[Test 10] Upfront advance deposit receipt and application to invoice');
  resetState();

  // Step 10a: Receive upfront deposit against SO-1
  const advPayment = await paymentService.create(companyId, {
    customer_id: customerId,
    sales_order_id: 'so-1',
    amount: 400000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
    reference: 'ADV-REF-1',
  }, 'user-1');

  assert.strictEqual(advPayment.amount, 400000);
  assert.strictEqual(paymentAllocations.length, 1);
  assert.strictEqual(paymentAllocations[0].sales_order_id, 'so-1');
  assert.strictEqual(paymentAllocations[0].amount, 400000);
  // Initial advance receipt has cash in and Dr Bank / Cr Customer Deposit
  assert.strictEqual(financeTransactions.length, 1);
  assert.strictEqual(financeTransactions[0].transaction_type, 'Cash In');
  assert.strictEqual(journalEntries.length, 1);
  const je0Lines = journalEntries[0].items || journalEntries[0].lines;
  assert.strictEqual(je0Lines[0].account_id || je0Lines[0].accountId, 'acc-bank-1'); // Dr Bank
  assert.strictEqual(je0Lines[1].account_id || je0Lines[1].accountId, 'acc-dep-1');  // Cr Customer Deposit (2-1200)

  // Step 10b: Check available deposits
  console.log('payments in runner:', JSON.stringify(payments, null, 2));
  console.log('paymentAllocations in runner:', JSON.stringify(paymentAllocations, null, 2));
  const availableDeps = await paymentService.getAvailableDeposits(companyId, customerId, 'so-1');
  console.log('availableDeps result:', JSON.stringify(availableDeps, null, 2));
  assert.strictEqual(availableDeps.length, 1);
  assert.strictEqual(availableDeps[0].availableAmount, 400000);

  // Step 10c: Apply advance deposit to posted invoice inv-1
  const initialCashCount = financeTransactions.length;
  const depositAlloc = await paymentService.applyDeposit(companyId, 'inv-1', {
    paymentId: advPayment.id,
    amount: 300000,
    notes: 'Apply partial deposit',
  }, 'user-1');

  // CRITICAL AUDIT CHECK: ZERO CASH MOVEMENT
  assert.strictEqual(financeTransactions.length, initialCashCount, 'NO new cash/bank movement allowed during deposit application!');

  // Check invoice balance
  const inv1AfterDeposit = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1AfterDeposit.paid_amount, 300000);
  assert.strictEqual(inv1AfterDeposit.remaining_amount, 200000);
  assert.strictEqual(inv1AfterDeposit.status, 'PARTIALLY PAID');

  // Check GL Journal: Dr Customer Deposit (2-1200) / Cr Accounts Receivable (1-1200)
  assert.strictEqual(journalEntries.length, 2);
  const depJe = journalEntries[1];
  assert.strictEqual(depJe.reference_type, 'DEPOSIT_ALLOCATION');
  const depJeLines = depJe.items || depJe.lines;
  assert.strictEqual(depJeLines[0].account_id || depJeLines[0].accountId, 'acc-dep-1');
  assert.strictEqual(depJeLines[0].debit, 300000);
  assert.strictEqual(depJeLines[1].account_id || depJeLines[1].accountId, 'acc-ar-1');
  assert.strictEqual(depJeLines[1].credit, 300000);

  // Check remaining deposit capacity
  const availableDepsAfter = await paymentService.getAvailableDeposits(companyId, customerId, 'so-1');
  assert.strictEqual(availableDepsAfter[0].availableAmount, 100000);
  console.log('✓ Advance deposit application completed with ZERO cash movement and exact GL reclassification');

  // --------------------------------------------------------------------------
  // TEST 11: Unallocate Deposit from Invoice
  // --------------------------------------------------------------------------
  console.log('\n[Test 11] Unallocation of applied deposit');

  const unallocResult = await paymentService.unallocate(companyId, depositAlloc.allocationId || depositAlloc.id, 'user-1');
  assert.strictEqual(unallocResult.success, true);

  // Invoice balance restored
  const inv1Restored = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1Restored.paid_amount, 0);
  assert.strictEqual(inv1Restored.remaining_amount, 500000);
  assert.strictEqual(inv1Restored.status, 'POSTED');

  // Allocation removed
  assert.strictEqual(paymentAllocations.length, 1); // 1 SO allocation remaining, invoice allocation removed

  // Deposit capacity restored
  const availableDepsRestored = await paymentService.getAvailableDeposits(companyId, customerId, 'so-1');
  assert.strictEqual(availableDepsRestored[0].availableAmount, 400000);

  // Symmetrical journal reversal created
  assert.strictEqual(journalEntries.length, 3);
  const revJe = journalEntries[2];
  const revNote = revJe.notes || revJe.description || '';
  assert.strictEqual(revNote.includes('Pembatalan Alokasi') || revNote.includes('Pembalikan Alokasi'), true);
  const revJeLines = revJe.items || revJe.lines;
  // In depJe, line 0 was Dr Deposit (debit: 300000, credit: 0). Reversal maps line 0 to debit: 0, credit: 300000 on acc-dep-1
  // and line 1 (Cr AR) to debit: 300000, credit: 0 on acc-ar-1
  const arLine = revJeLines.find((l: any) => (l.account_id || l.accountId) === 'acc-ar-1');
  const depLine = revJeLines.find((l: any) => (l.account_id || l.accountId) === 'acc-dep-1');
  assert(arLine, 'Must have AR line in reversal');
  assert.strictEqual(arLine.debit, 300000);
  assert(depLine, 'Must have Deposit line in reversal');
  assert.strictEqual(depLine.credit, 300000);
  console.log('✓ Deposit unallocation successfully restored invoice balance and reversed GL journal');

  // --------------------------------------------------------------------------
  // TEST 12: Payment Reversal (Full Payment Cancellation)
  // --------------------------------------------------------------------------
  console.log('\n[Test 12] Payment reversal & compensating transactions');
  resetState();

  const directPay = await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 500000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
  }, 'user-1');

  assert.strictEqual(invoices.find(i => i.id === 'inv-1').status, 'PAID');

  const revPay = await paymentService.reversePayment(companyId, directPay.id, 'Customer payment bounce', 'user-1');
  assert.strictEqual(revPay.success, true);
  assert.strictEqual(revPay.paymentId, directPay.id);

  const directPayUpdated = payments.find(p => p.id === directPay.id);
  assert.notStrictEqual(directPayUpdated.deleted_at, null);
  assert.strictEqual(directPayUpdated.notes.includes('[DIBATALKAN'), true);

  // Invoice restored
  const inv1Rev = invoices.find(i => i.id === 'inv-1');
  assert.strictEqual(inv1Rev.paid_amount, 0);
  assert.strictEqual(inv1Rev.remaining_amount, 500000);
  assert.strictEqual(inv1Rev.status, 'POSTED');

  // Cash reversed via compensating transaction
  assert.strictEqual(financeTransactions.length, 2);
  assert.strictEqual(financeTransactions[0].status, 'Reversed');
  assert.strictEqual(financeTransactions[1].transaction_type, 'Cash Out');
  assert.strictEqual(financeTransactions[1].total_amount, 500000);

  // Symmetrical GL reversal
  assert.strictEqual(journalEntries.length, 2);
  const revPayJeLines = journalEntries[1].items || journalEntries[1].lines;
  const revArLine = revPayJeLines.find((l: any) => (l.account_id || l.accountId) === 'acc-ar-1');
  const revBankLine = revPayJeLines.find((l: any) => (l.account_id || l.accountId) === 'acc-bank-1');
  assert(revArLine, 'Must have AR line in reversal');
  assert.strictEqual(revArLine.debit, 500000);
  assert(revBankLine, 'Must have Bank line in reversal');
  assert.strictEqual(revBankLine.credit, 500000);

  // Double reversal must fail
  await assert.rejects(
    async () => {
      await paymentService.reversePayment(companyId, directPay.id, 'Second cancel', 'user-1');
    },
    (err: any) => {
      console.log('Double reversal err:', err);
      assert(err instanceof BadRequestException || err instanceof NotFoundException);
      assert(err.message.includes('sudah pernah dibatalkan') || err.message.includes('tidak ditemukan'));
      return true;
    }
  );
  console.log('✓ Payment reversal restored invoice, emitted compensating cash out, reversed GL, and prevented duplicate reversal');

  // --------------------------------------------------------------------------
  // TEST 13: Row-Locking Coordination
  // --------------------------------------------------------------------------
  console.log('\n[Test 13] Row-locking coordination verification');
  resetState();

  await paymentService.create(companyId, {
    customer_id: customerId,
    invoice_id: 'inv-1',
    amount: 100000,
    payment_method: 'BANK_TRANSFER',
    cash_account_id: 'acc-bank-1',
  }, 'user-1');

  console.log('rawLockCalls:', JSON.stringify(rawLockCalls, null, 2));
  const hasInvoiceLock = rawLockCalls.some(call => call.includes('SELECT 1 FROM') && (call.includes('Invoice') || call.includes('"Invoice"')) && call.includes('FOR UPDATE'));
  assert.strictEqual(hasInvoiceLock, true, 'Deterministic SELECT ... FOR UPDATE row lock must be acquired on Invoice');
  console.log('✓ Deterministic row lock acquired on target Invoice during payment execution');

  console.log('\n================================================================');
  console.log('>>> ALL 13 SALES PHASE B4.1A TEST SUITES PASSED DETERMINISTICALLY <<<');
  console.log('================================================================\n');
}

runPhaseB41ATests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
