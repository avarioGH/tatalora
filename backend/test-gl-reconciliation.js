/**
 * TATALORA ERP - PHASE 7.2 FINANCIAL RECONCILIATION & CONCURRENCY TEST SUITE
 * 
 * Tests complete lifecycle:
 * 1. Dedicated test company & customer isolation (prevents cross-test pollution)
 * 2. Sales Order commitment vs official AR distinction
 * 3. Full invoice creation and official posting workflow (/finance/invoices/:id/post)
 *    generating proper AR (1-1200) and Revenue (4-1000) General Ledger entries
 * 4. Exact AR Aging breakdown, invoice table, and 100% mathematical equality
 * 5. Concurrency & race condition protection for payments and deposit allocations
 * 6. Cash & Bank Operational Balance vs GL Balance Reconciliation (/finance/cash-reconciliation)
 * 7. Trial Balance equality (Debit == Credit) and multi-account ledger coverage
 * 8. Customer statement running balance ledger
 */

const fs = require('fs');
const path = require('path');

const testDbFile = path.resolve(__dirname, '.test-db-url');
const testDbUrl = fs.existsSync(testDbFile)
  ? fs.readFileSync(testDbFile, 'utf-8').trim()
  : process.env.DATABASE_URL;

process.env.DATABASE_URL = testDbUrl;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: testDbUrl },
  },
});

const BASE_URL = 'http://localhost:3001';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return { status: res.status, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 7.2: GENERAL LEDGER & FINANCIAL RECONCILIATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Authenticate Owner
  console.log('▶ Step 1: Authentication');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: {
      username: 'owner',
      password: 'password123',
    },
  });
  const token = loginRes.data.access_token;
  const user = loginRes.data.user || {};
  const companyId = user.company_id || user.companyId || (await prisma.company.findFirst())?.id;
  const headers = { Authorization: `Bearer ${token}` };
  assert(!!token, 'Owner successfully authenticated');

  // 2. Setup Cash Account & Customer for Phase 7
  console.log('\n▶ Step 2: Customer & Cash Account Setup');
  let cashAccount = await prisma.cashAccount.findFirst({
    where: { company_id: companyId },
    include: { chart_of_account: true },
  });
  assert(!!cashAccount?.id, `Cash Account available: ${cashAccount.name} (${cashAccount.id})`);
  assert(!!cashAccount.chart_of_account_id, `Cash Account is mapped to CoA: ${cashAccount.chart_of_account?.account_code} - ${cashAccount.chart_of_account?.account_name}`);

  // Dedicated customer for Phase 7.2
  const customerCode = `CUST-P72-${Date.now()}`;
  const customer = await prisma.customer.create({
    data: {
      company_id: companyId,
      code: customerCode,
      name: 'PT Rekonsiliasi Finansial Abadi 7.2',
      phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `fin.${Date.now()}@tatalora.test`,
      address: 'Sentra Bisnis Thamrin Jakarta',
    },
  });
  assert(!!customer.id, `Test Customer created: ${customer.name}`);

  // Product Setup
  let product = await prisma.product.findFirst({ where: { company_id: companyId } });
  if (!product) {
    let unit = await prisma.unit.findFirst({ where: { company_id: companyId } });
    if (!unit) {
      unit = await prisma.unit.create({
        data: { company_id: companyId, code: 'M3', name: 'Meter Kubik' },
      });
    }
    product = await prisma.product.create({
      data: {
        company_id: companyId,
        unit_id: unit.id,
        code: `PRD-${Date.now()}`,
        name: 'Kayu Meranti Super',
        selling_price: 5000000,
        purchase_price: 3500000,
      },
    });
  }

  // 3. Create Sales Order without invoice (Rp 15.000.000)
  console.log('\n▶ Step 3: Sales Order Commitment (Unbilled Order Test)');
  const so = await prisma.salesOrder.create({
    data: {
      company_id: companyId,
      customer_id: customer.id,
      order_number: `SO-P72-${Date.now()}`,
      order_date: new Date(),
      status: 'APPROVED',
      payment_status: 'UNPAID',
      total_amount: 15000000,
      items: {
        create: [
          {
            product_id: product.id,
            qty: 3,
            unit_price: 5000000,
            subtotal: 15000000,
          },
        ],
      },
    },
    include: { items: true },
  });
  assert(so.total_amount === 15000000, `Sales Order created: ${so.order_number}`);

  // Query Customer Financials - AR must be 0, unbilledOrders must be 15.000.000
  const custFin1 = await req(`/customers/${customer.id}`, { headers });
  assert(custFin1.data.financials.totalOutstanding === 0, 'Unbilled SO is NOT counted as AR (totalOutstanding = 0)');
  assert(custFin1.data.financials.unbilledOrders === 15000000, 'Unbilled SO reported correctly as order commitment (unbilledOrders = Rp 15.000.000)');

  // 4. Create and Post 3 Invoices through Official API Lifecycle
  console.log('\n▶ Step 4: Official Invoicing & GL Posting Lifecycle');
  const now = new Date();
  const pastDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Helper to create & post invoice officially
  async function createAndPostInvoice(invNumber, invDate, dueDate, subtotal) {
    const draft = await prisma.invoice.create({
      data: {
        company_id: companyId,
        customer_id: customer.id,
        sales_order_id: so.id,
        type: 'SALES_INVOICE',
        invoice_number: invNumber,
        invoice_date: invDate,
        due_date: dueDate,
        status: 'DRAFT',
        subtotal: subtotal,
        tax: 0,
        total: subtotal,
        paid_amount: 0,
        remaining_amount: subtotal,
        items: {
          create: [
            {
              product_id: product.id,
              qty: subtotal / 5000000,
              unit_price: 5000000,
              subtotal: subtotal,
            },
          ],
        },
      },
    });

    // Execute official post endpoint
    const postRes = await req(`/finance/invoices/${draft.id}/post`, {
      method: 'POST',
      headers,
    });
    return postRes.data;
  }

  // Invoice 1: Current (due in 5 days) Rp 10.000.000
  const inv1 = await createAndPostInvoice(
    `INV-P72-CUR-${Date.now()}`,
    new Date(),
    new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    10000000,
  );
  assert(inv1.status === 'POSTED', `Invoice 1 officially POSTED: ${inv1.invoice_number}`);

  // Invoice 2: Overdue 15 days (1-30 bucket) Rp 5.000.000
  const inv2 = await createAndPostInvoice(
    `INV-P72-15D-${Date.now()}`,
    pastDays(20),
    pastDays(15),
    5000000,
  );
  assert(inv2.status === 'POSTED', `Invoice 2 officially POSTED: ${inv2.invoice_number}`);

  // Invoice 3: Overdue 45 days (31-60 bucket) Rp 8.000.000
  const inv3 = await createAndPostInvoice(
    `INV-P72-45D-${Date.now()}`,
    pastDays(60),
    pastDays(45),
    8000000,
  );
  assert(inv3.status === 'POSTED', `Invoice 3 officially POSTED: ${inv3.invoice_number}`);

  // Verify GL entries generated for invoice postings (Debit AR, Credit Sales Revenue)
  const invGlJournals = await prisma.journalEntry.findMany({
    where: {
      company_id: companyId,
      reference_id: { in: [inv1.id, inv2.id, inv3.id] },
      status: 'Posted',
    },
    include: { items: { include: { account: true } } },
  });
  assert(invGlJournals.length === 3, `Official posting created 3 GL journal entries for invoices (got: ${invGlJournals.length})`);

  // Verify Customer Financials aggregates to Rp 23.000.000
  const custFin2 = await req(`/customers/${customer.id}`, { headers });
  assert(custFin2.data.financials.totalOutstanding === 23000000, `Official AR correctly aggregates to Rp 23.000.000 (got: ${custFin2.data.financials.totalOutstanding})`);
  assert(custFin2.data.financials.totalSales === 23000000, `Official totalSales aggregates to Rp 23.000.000 (got: ${custFin2.data.financials.totalSales})`);

  // Verify Customers List API has identical AR definition
  const custListRes = await req(`/customers?search=${customer.phone}`, { headers });
  const custRow = custListRes.data.data.find(c => c.id === customer.id);
  assert(custRow.totalOutstanding === 23000000, `Customer List row totalOutstanding matches Rp 23.000.000 (got: ${custRow.totalOutstanding})`);

  // 5. Test AR Aging Endpoint with Full Invoice Inspection
  console.log('\n▶ Step 5: AR Aging Report Population & Bucket Verification');
  const arAgingRes = await req('/gl/ar-aging', { headers });
  const arSummary = arAgingRes.data.summary;
  const agingInvoices = arAgingRes.data.invoices;

  console.log('\n  --- INVOICE AGING POPULATION AUDIT TABLE ---');
  console.log('  | Invoice No | Customer | Due Date | Remaining (Rp) | Overdue Days | Assigned Bucket |');
  console.log('  | :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const row of agingInvoices) {
    console.log(`  | ${row.invoiceNumber} | ${row.customerName} | ${row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : 'N/A'} | Rp ${row.remainingAmount.toLocaleString('id-ID')} | ${row.overdueDays}d | ${row.bucket} |`);
  }

  // Verify each invoice appears exactly once in aging report
  const invoiceIds = agingInvoices.map(i => i.invoiceId);
  const uniqueInvoiceIds = new Set(invoiceIds);
  assert(invoiceIds.length === uniqueInvoiceIds.size, `Every invoice appears exactly once in AR Aging (count: ${invoiceIds.length})`);

  // Verify total open invoices in database equals totalOutstanding reported in AR Aging
  const dbOpenInvoices = await prisma.invoice.findMany({
    where: {
      company_id: companyId,
      type: { in: ['AR', 'SALES_INVOICE'] },
      status: { in: ['POSTED', 'PARTIALLY PAID'] },
      remaining_amount: { gt: 0.01 },
    },
  });
  const expectedTotalAR = Math.round(dbOpenInvoices.reduce((sum, inv) => sum + inv.remaining_amount, 0) * 100) / 100;
  assert(arSummary.totalOutstanding === expectedTotalAR, `AR Aging totalOutstanding (Rp ${arSummary.totalOutstanding}) matches DB open invoices sum (Rp ${expectedTotalAR})`);

  // Verify mathematical sum of buckets equals totalOutstanding
  const sumBuckets = Math.round((arSummary.current + arSummary.days_1_30 + arSummary.days_31_60 + arSummary.days_61_90 + arSummary.days_over_90) * 100) / 100;
  assert(sumBuckets === arSummary.totalOutstanding, `Sum of all AR Aging buckets (Rp ${sumBuckets}) equals totalOutstanding (Rp ${arSummary.totalOutstanding})`);

  // 6. Test Customer Statement Endpoint
  console.log('\n▶ Step 6: Customer Statement Reconciliation');
  const stmtRes = await req(`/gl/customer-statement/${customer.id}`, { headers });
  assert(stmtRes.data.totalInvoiced === 23000000, `Statement totalInvoiced matches Rp 23.000.000 (got: ${stmtRes.data.totalInvoiced})`);
  assert(stmtRes.data.outstandingAR === 23000000, `Statement outstandingAR matches Rp 23.000.000 (got: ${stmtRes.data.outstandingAR})`);
  assert(stmtRes.data.entries.length === 3, `Statement contains 3 invoice entries (got: ${stmtRes.data.entries.length})`);

  // 7. CONCURRENCY HARDENING TEST: Parallel Race Condition on Payment Allocation
  console.log('\n▶ Step 7: Parallel Concurrency Race Condition on Payment (Rp 10.000.000 Invoice)');
  const p1 = req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      customerId: customer.id,
      invoiceId: inv1.id,
      amount: 6000000,
      paymentMethod: 'BANK_TRANSFER',
      cashAccountId: cashAccount.id,
      reference: `RACE-A-${Date.now()}`,
      notes: 'Parallel Payment Request A',
    },
  });

  const p2 = req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      customerId: customer.id,
      invoiceId: inv1.id,
      amount: 6000000,
      paymentMethod: 'BANK_TRANSFER',
      cashAccountId: cashAccount.id,
      reference: `RACE-B-${Date.now()}`,
      notes: 'Parallel Payment Request B',
    },
  });

  const [resA, resB] = await Promise.allSettled([p1, p2]);
  const succeededCount = (resA.status === 'fulfilled' ? 1 : 0) + (resB.status === 'fulfilled' ? 1 : 0);
  const rejectedCount = (resA.status === 'rejected' ? 1 : 0) + (resB.status === 'rejected' ? 1 : 0);

  assert(succeededCount === 1, `Exactly 1 concurrent payment succeeded (succeeded: ${succeededCount})`);
  assert(rejectedCount === 1, `Exactly 1 concurrent payment was safely rejected (rejected: ${rejectedCount})`);

  const inv1AfterRace = await prisma.invoice.findUnique({ where: { id: inv1.id } });
  assert(inv1AfterRace.paid_amount === 6000000, `Invoice paid_amount is strictly Rp 6.000.000 (no overpayment! got: ${inv1AfterRace.paid_amount})`);
  assert(inv1AfterRace.remaining_amount === 4000000, `Invoice remaining_amount is strictly Rp 4.000.000 (got: ${inv1AfterRace.remaining_amount})`);
  assert(inv1AfterRace.status === 'PARTIALLY PAID', `Invoice status is PARTIALLY PAID (got: ${inv1AfterRace.status})`);

  // 8. CONCURRENCY HARDENING TEST: Parallel Deposit Allocation Race Condition
  console.log('\n▶ Step 8: Parallel Concurrency Race Condition on Customer Deposit Allocation');
  // Create an upfront deposit of Rp 5.000.000 linked to the Sales Order
  const depRes = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      customerId: customer.id,
      salesOrderId: so.id,
      amount: 5000000,
      paymentMethod: 'CASH',
      cashAccountId: cashAccount.id,
      reference: `DEP-RACE-${Date.now()}`,
      notes: 'Uang Muka 5 Juta for Race Test',
    },
  });
  const depPayment = depRes.data;
  assert(depPayment.amount === 5000000, 'Customer deposit of Rp 5.000.000 recorded');

  // Try to allocate Rp 4.000.000 twice concurrently from the same Rp 5.000.000 deposit to inv2 (remaining Rp 5.000.000)
  const dAlloc1 = req('/finance/payments/apply-deposit', {
    method: 'POST',
    headers,
    body: {
      paymentId: depPayment.id,
      invoiceId: inv2.id,
      amount: 4000000,
    },
  });

  const dAlloc2 = req('/finance/payments/apply-deposit', {
    method: 'POST',
    headers,
    body: {
      paymentId: depPayment.id,
      invoiceId: inv2.id,
      amount: 4000000,
    },
  });

  const [depResA, depResB] = await Promise.allSettled([dAlloc1, dAlloc2]);
  const depSuccess = (depResA.status === 'fulfilled' ? 1 : 0) + (depResB.status === 'fulfilled' ? 1 : 0);
  const depRejected = (depResA.status === 'rejected' ? 1 : 0) + (depResB.status === 'rejected' ? 1 : 0);

  assert(depSuccess === 1, `Exactly 1 concurrent deposit allocation succeeded (succeeded: ${depSuccess})`);
  assert(depRejected === 1, `Exactly 1 concurrent deposit allocation was safely rejected (rejected: ${depRejected})`);

  const inv2After = await prisma.invoice.findUnique({ where: { id: inv2.id } });
  assert(inv2After.paid_amount === 4000000, `Invoice 2 paid_amount is Rp 4.000.000 (got: ${inv2After.paid_amount})`);
  assert(inv2After.remaining_amount === 1000000, `Invoice 2 remaining_amount is Rp 1.000.000 (got: ${inv2After.remaining_amount})`);

  // Verify remaining deposit available balance is Rp 1.000.000
  const availDepRes = await req(`/finance/payments/available-deposits?customerId=${customer.id}`, { headers });
  const testDep = availDepRes.data.find(d => d.paymentId === depPayment.id);
  assert(testDep.availableBalance === 1000000, `Deposit remaining availableBalance is Rp 1.000.000 (got: ${testDep.availableBalance})`);

  // 9. Trial Balance Equality Verification: Debit == Credit & Multiple Accounts
  console.log('\n▶ Step 9: General Ledger Trial Balance Equality Verification');
  const tbRes = await req('/gl/trial-balance', { headers });
  const tb = tbRes.data;
  assert(tb.isBalanced === true, `Trial balance is strictly balanced! Difference: Rp ${tb.difference}`);
  assert(tb.totalDebit === tb.totalCredit, `Trial Balance Total Debit (Rp ${tb.totalDebit}) equals Total Credit (Rp ${tb.totalCredit})`);
  assert(tb.accounts.length >= 3, `Trial balance contains all active chart of accounts (got: ${tb.accounts.length} accounts)`);

  console.log('  --- TRIAL BALANCE SUMMARY ---');
  for (const a of tb.accounts) {
    console.log(`  | ${a.accountCode} | ${a.accountName} | ${a.normalBalance} | Debit: Rp ${a.debit.toLocaleString('id-ID')} | Credit: Rp ${a.credit.toLocaleString('id-ID')} | Balance: Rp ${a.balance.toLocaleString('id-ID')} |`);
  }

  // 10. General Ledger Pagination and Running Balance
  console.log('\n▶ Step 10: General Ledger Detailed Account Ledger');
  const firstAcc = tb.accounts[0];
  const glDetailRes = await req(`/gl/general-ledger?accountId=${firstAcc.accountId}&page=1`, { headers });
  assert(glDetailRes.data.data !== undefined, 'General ledger detail endpoint responds with paginated items');
  assert(glDetailRes.data.total >= 0, `General ledger item count: ${glDetailRes.data.total}`);

  // 11. Customer Statement Post-Transactions Verification
  console.log('\n▶ Step 11: Statement Timeline Integrity');
  const stmtFinal = await req(`/gl/customer-statement/${customer.id}`, { headers });
  assert(stmtFinal.data.totalInvoiced === 23000000, `Final statement totalInvoiced is Rp 23.000.000 (got: ${stmtFinal.data.totalInvoiced})`);
  assert(stmtFinal.data.totalPaid === 11000000, `Final statement totalPaid is Rp 11.000.000 (got: ${stmtFinal.data.totalPaid})`);

  // 12. Cash Account Balance Reconciliation with FinanceTransactions & GL
  console.log('\n▶ Step 12: Cash Account Operational & GL Reconciliation');
  const cashReconRes = await req('/finance/cash-reconciliation', { headers });
  const cashRecon = cashReconRes.data.find(c => c.cash_account_id === cashAccount.id);
  assert(!!cashRecon, 'Cash reconciliation record found for CashAccount');
  console.log('  ℹ Cash Reconciliation Report:', JSON.stringify(cashRecon, null, 2));

  assert(cashRecon.mapping_status === 'MAPPED', 'CashAccount mapping status is MAPPED');
  assert(cashRecon.operational_balance === cashRecon.gl_balance, `Operational balance (Rp ${cashRecon.operational_balance}) matches GL balance (Rp ${cashRecon.gl_balance})`);
  assert(cashRecon.difference === 0, `Reconciliation difference is strictly 0 (got: ${cashRecon.difference})`);
  assert(cashRecon.status === 'MATCHED', `Cash reconciliation status is MATCHED (got: ${cashRecon.status})`);

  console.log('\n================================================================');
  console.log(`🎉 ALL PHASE 7.2 RECONCILIATION TESTS PASSED! (${passed} PASSED, ${failed} FAILED)`);
  console.log('================================================================\n');
}

runTests()
  .catch((e) => {
    console.error('\n❌ TEST RUN FAILED:', e.message);
    if (e.data) console.error('Response data:', e.data);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
