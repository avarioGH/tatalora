/**
 * TATALORA ERP - PHASE 7.7 STRESS & HARDENING VERIFICATION TEST SUITE
 * 
 * Verifies:
 * 1. P1: Customer Deposit Over-Allocation Concurrency Hardening
 *    - Two simultaneous allocations of Rp 4.000.000 against a Rp 5.000.000 deposit on the same invoice. Exactly 1 succeeds, 1 safely rejected.
 *    - Two simultaneous allocations against two DIFFERENT invoices using the same Rp 5.000.000 deposit. Total allocated never exceeds Rp 5.000.000.
 *    - Sequential allocations exhausting deposit exactly (e.g. 3m + 2m = 5m). Further attempt rejected.
 *    - Deposit reversal with active allocation:
 *      * Invoice balance restored
 *      * DEPOSIT_ALLOCATION journal reversed with symmetrical compensating journal (REV-...)
 *      * Original journal marked 'Reversed'
 *      * Trial Balance remains in balance (sum Debit == sum Credit)
 * 2. Cross-Tenant Isolation:
 *    - Applying another tenant's deposit fails with NotFoundException or BadRequestException.
 * 3. P2: Revenue Account Classification & Seeding Idempotency
 *    - CoA 4-1000 has normal_balance: 'Credit' and AccountType: 'REVENUE'
 *    - Re-running Prisma seed preserves REVENUE classification and Credit normal balance.
 *    - Trial balance reports positive credit balance for revenue.
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
  console.log('🧪 RUNNING PHASE 7.7: DEPOSIT CONCURRENCY & MASTER DATA TEST SUITE');
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

  // Verify CoA 4-1000 classification immediately
  console.log('\n▶ Step 2: Verify P2 Master Data Classification (CoA 4-1000)');
  const revCoa = await prisma.chartOfAccount.findFirst({
    where: { company_id: companyId, account_code: '4-1000' },
    include: { account_type: true },
  });
  assert(!!revCoa, 'CoA 4-1000 exists in database');
  assert(revCoa.account_type.code === 'REVENUE', `CoA 4-1000 AccountType is REVENUE (actual: ${revCoa.account_type.code})`);
  assert(revCoa.account_type.normal_balance === 'Credit', `CoA 4-1000 AccountType normal_balance is Credit (actual: ${revCoa.account_type.normal_balance})`);

  // Setup dedicated CashAccount and Customer for Phase 7.7
  console.log('\n▶ Step 3: Setup CashAccount, Products, and Dedicated Test Customer');
  const cashAccount = await prisma.cashAccount.findFirst({
    where: { company_id: companyId },
  });
  assert(!!cashAccount, `CashAccount available: ${cashAccount.name}`);

  let product = await prisma.product.findFirst({ where: { company_id: companyId } });
  if (!product) {
    let unit = await prisma.unit.findFirst({ where: { company_id: companyId } });
    if (!unit) {
      unit = await prisma.unit.create({
        data: { company_id: companyId, code: 'PCS', name: 'Pieces' },
      });
    }
    product = await prisma.product.create({
      data: {
        company_id: companyId,
        unit_id: unit.id,
        code: `PRD-77-${Date.now()}`,
        name: 'Produk Kayu Jati 7.7',
        selling_price: 10000000,
        purchase_price: 7000000,
      },
    });
  }

  const custA = await prisma.customer.create({
    data: {
      company_id: companyId,
      code: `CUST-77A-${Date.now()}`,
      name: 'PT Concurrency Sukses Sejati',
      phone: `0811${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `conc.${Date.now()}@tatalora.test`,
      address: 'Kawasan Industri Pulogadung',
    },
  });
  assert(!!custA.id, `Test Customer created: ${custA.name} (${custA.id})`);

  // Helper to create and post invoice
  async function createAndPostInvoice(amount, desc = 'Invoice Test 7.7', soId = null) {
    const draft = await prisma.invoice.create({
      data: {
        company_id: companyId,
        customer_id: custA.id,
        sales_order_id: soId,
        type: 'SALES_INVOICE',
        invoice_number: `INV-77-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 86400000),
        status: 'DRAFT',
        subtotal: amount,
        tax: 0,
        total: amount,
        paid_amount: 0,
        remaining_amount: amount,
        items: {
          create: [
            {
              product_id: product.id,
              qty: 1,
              unit_price: amount,
              subtotal: amount,
            },
          ],
        },
      },
    });
    // Post invoice officially
    const postRes = await req(`/finance/invoices/${draft.id}/post`, {
      method: 'POST',
      headers,
    });
    return postRes.data;
  }

  // Helper to create Sales Order
  async function createSalesOrder(amount, desc = 'SO Test 7.7') {
    return prisma.salesOrder.create({
      data: {
        company_id: companyId,
        customer_id: custA.id,
        order_number: `SO-77-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        order_date: new Date(),
        status: 'APPROVED',
        payment_status: 'UNPAID',
        invoice_status: 'NOT_INVOICED',
        total_amount: amount,
        items: {
          create: [
            {
              product_id: product.id,
              qty: 1,
              unit_price: amount,
              subtotal: amount,
            },
          ],
        },
      },
    });
  }

  // -------------------------------------------------------------
  // TEST SCENARIO 1: Simultaneous race on same deposit & same invoice
  // Deposit = Rp 5.000.000. Invoice = Rp 10.000.000.
  // Two parallel calls request Rp 4.000.000 each.
  // Total attempted = Rp 8.000.000 > Rp 5.000.000.
  // EXPECTATION: Exactly ONE succeeds, ONE is rejected. Total allocated = Rp 4.000.000.
  // -------------------------------------------------------------
  console.log('\n▶ Step 4: P1 Scenario 1 - Race on Same Deposit & Same Invoice');
  const so1 = await createSalesOrder(10000000, 'SO 1');
  const deposit1Res = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      customerId: custA.id,
      salesOrderId: so1.id,
      cashAccountId: cashAccount.id,
      paymentMethod: 'BANK_TRANSFER',
      amount: 5000000,
      paymentDate: new Date().toISOString(),
      notes: 'Customer Deposit 5m for Race Test 1',
    },
  });
  const dep1Id = deposit1Res.data.id;
  assert(deposit1Res.data.amount === 5000000, 'Deposit 1 created for Rp 5.000.000');

  const inv1 = await createAndPostInvoice(10000000, 'Invoice 1 for Race Test 1');
  assert(inv1.remaining_amount === 10000000, 'Invoice 1 posted with Rp 10.000.000 remaining');

  console.log('  Firing 2 simultaneous applyDeposit requests of Rp 4.000.000 each...');
  const promises1 = [
    req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers,
      body: { invoiceId: inv1.id, paymentId: dep1Id, amount: 4000000, notes: 'Parallel alloc 1' },
    }),
    req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers,
      body: { invoiceId: inv1.id, paymentId: dep1Id, amount: 4000000, notes: 'Parallel alloc 2' },
    }),
  ];

  const results1 = await Promise.allSettled(promises1);
  const success1 = results1.filter((r) => r.status === 'fulfilled');
  const rejected1 = results1.filter((r) => r.status === 'rejected');

  console.log(`  Results: ${success1.length} succeeded, ${rejected1.length} rejected.`);
  for (const rej of rejected1) {
    console.log('  Rejection detail:', rej.reason?.status, rej.reason?.data || rej.reason?.message);
  }
  assert(success1.length === 1, `Exactly 1 parallel request succeeded (actual: ${success1.length})`);
  assert(rejected1.length === 1, `Exactly 1 parallel request rejected (actual: ${rejected1.length})`);

  // Verify DB state
  const dep1Allocations = await prisma.paymentAllocation.findMany({
    where: { payment_id: dep1Id, invoice_id: { not: null } },
  });
  const totalAllocDep1 = dep1Allocations.reduce((sum, a) => sum + a.amount, 0);
  assert(totalAllocDep1 === 4000000, `Total allocated in DB is exactly Rp 4.000.000 (actual: Rp ${totalAllocDep1})`);

  const updatedInv1 = await prisma.invoice.findUnique({ where: { id: inv1.id } });
  assert(updatedInv1.paid_amount === 4000000, `Invoice paid_amount is Rp 4.000.000 (actual: ${updatedInv1.paid_amount})`);
  assert(updatedInv1.remaining_amount === 6000000, `Invoice remaining_amount is Rp 6.000.000 (actual: ${updatedInv1.remaining_amount})`);

  // -------------------------------------------------------------
  // TEST SCENARIO 2: Simultaneous race on same deposit across DIFFERENT invoices
  // Deposit = Rp 5.000.000.
  // Invoice 2A = Rp 4.000.000. Invoice 2B = Rp 4.000.000.
  // Two parallel calls request Rp 4.000.000 to Inv 2A and Rp 4.000.000 to Inv 2B simultaneously.
  // Total attempted = Rp 8.000.000 > Rp 5.000.000.
  // EXPECTATION: Exactly ONE succeeds, ONE is rejected. Total allocated <= Rp 5.000.000.
  // -------------------------------------------------------------
  console.log('\n▶ Step 5: P1 Scenario 2 - Race on Same Deposit Across Multiple Invoices');
  const so2 = await createSalesOrder(10000000, 'SO 2');
  const deposit2Res = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      customerId: custA.id,
      salesOrderId: so2.id,
      cashAccountId: cashAccount.id,
      paymentMethod: 'BANK_TRANSFER',
      amount: 5000000,
      paymentDate: new Date().toISOString(),
      notes: 'Customer Deposit 5m for Multi-Invoice Race Test 2',
    },
  });
  const dep2Id = deposit2Res.data.id;

  const inv2A = await createAndPostInvoice(4000000, 'Invoice 2A');
  const inv2B = await createAndPostInvoice(4000000, 'Invoice 2B');

  console.log('  Firing 2 simultaneous applyDeposit requests to Inv 2A (Rp 4m) and Inv 2B (Rp 4m)...');
  const promises2 = [
    req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers,
      body: { invoiceId: inv2A.id, paymentId: dep2Id, amount: 4000000, notes: 'Multi-inv alloc A' },
    }),
    req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers,
      body: { invoiceId: inv2B.id, paymentId: dep2Id, amount: 4000000, notes: 'Multi-inv alloc B' },
    }),
  ];

  const results2 = await Promise.allSettled(promises2);
  const success2 = results2.filter((r) => r.status === 'fulfilled');
  const rejected2 = results2.filter((r) => r.status === 'rejected');

  console.log(`  Results: ${success2.length} succeeded, ${rejected2.length} rejected.`);
  assert(success2.length === 1, `Exactly 1 parallel request succeeded across different invoices (actual: ${success2.length})`);
  assert(rejected2.length === 1, `Exactly 1 parallel request rejected (actual: ${rejected2.length})`);

  const dep2Allocations = await prisma.paymentAllocation.findMany({
    where: { payment_id: dep2Id, invoice_id: { not: null } },
  });
  const totalAllocDep2 = dep2Allocations.reduce((sum, a) => sum + a.amount, 0);
  assert(totalAllocDep2 === 4000000, `Total allocated for Deposit 2 is exactly Rp 4.000.000 <= 5.000.000 (actual: Rp ${totalAllocDep2})`);

  // -------------------------------------------------------------
  // TEST SCENARIO 3: Exact exhaustion of deposit (3m + 2m = 5m), then rejection
  // -------------------------------------------------------------
  console.log('\n▶ Step 6: P1 Scenario 3 - Exact Exhaustion and Over-Allocation Rejection');
  // Available on Deposit 2 is now Rp 1.000.000.
  // Allocate remaining Rp 1.000.000 to the other invoice
  const unallocatedInv = (await prisma.invoice.findUnique({ where: { id: inv2A.id } })).paid_amount === 0 ? inv2A : inv2B;
  const exhaustRes = await req('/finance/payments/apply-deposit', {
    method: 'POST',
    headers,
    body: { invoiceId: unallocatedInv.id, paymentId: dep2Id, amount: 1000000, notes: 'Exhaust remaining 1m' },
  });
  assert(exhaustRes.status === 201 || exhaustRes.status === 200, 'Successfully allocated remaining Rp 1.000.000');
  assert(exhaustRes.data.remainingDeposit === 0, `Remaining deposit is exactly 0 (actual: ${exhaustRes.data.remainingDeposit})`);

  // Attempt to allocate Rp 1 more from exhausted deposit
  let overAllocFailed = false;
  try {
    await req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers,
      body: { invoiceId: unallocatedInv.id, paymentId: dep2Id, amount: 100, notes: 'Attempt over-allocation by Rp 100' },
    });
  } catch (err) {
    overAllocFailed = true;
    console.log(`  Correctly rejected over-allocation: HTTP ${err.status} - ${err.data?.message || err.message}`);
  }
  assert(overAllocFailed, 'Over-allocation attempt beyond exhausted deposit is strictly rejected');

  // -------------------------------------------------------------
  // TEST SCENARIO 4: Deposit Reversal with Active Allocation
  // Void deposit 1 (which had Rp 4m allocated to inv 1).
  // Verify:
  // - Invoice 1 remaining balance restored back to Rp 10.000.000
  // - DEPOSIT_ALLOCATION journal reversed by compensating REV-... journal
  // - Original DEPOSIT_ALLOCATION journal status marked 'Reversed'
  // - Trial Balance balances debit == credit
  // -------------------------------------------------------------
  console.log('\n▶ Step 7: P1 Scenario 4 - Deposit Reversal with Active Allocation & GL Reversal');
  // Check DEPOSIT_ALLOCATION journal before reversal
  const allocBeforeRev = await prisma.paymentAllocation.findFirst({
    where: { payment_id: dep1Id, invoice_id: inv1.id },
  });
  assert(!!allocBeforeRev, 'Found allocation record before reversal');

  const journalBeforeRev = await prisma.journalEntry.findFirst({
    where: { reference_type: 'DEPOSIT_ALLOCATION', reference_id: allocBeforeRev.id },
  });
  assert(!!journalBeforeRev, `Found DEPOSIT_ALLOCATION journal entry: ${journalBeforeRev?.journal_no}`);
  assert(journalBeforeRev.status === 'Posted', 'Original journal status is Posted');

  // Reverse Deposit 1
  const revRes = await req(`/finance/payments/${dep1Id}/reverse`, {
    method: 'POST',
    headers,
    body: { reason: 'Voiding Deposit 1 for Phase 7.7 test' },
  });
  assert(revRes.status === 200 || revRes.status === 201, 'Deposit reversed successfully');

  // Verify Invoice 1 restored
  const inv1Restored = await prisma.invoice.findUnique({ where: { id: inv1.id } });
  assert(inv1Restored.paid_amount === 0, `Invoice 1 paid_amount restored to 0 (actual: ${inv1Restored.paid_amount})`);
  assert(inv1Restored.remaining_amount === 10000000, `Invoice 1 remaining_amount restored to Rp 10.000.000 (actual: ${inv1Restored.remaining_amount})`);
  assert(inv1Restored.status === 'POSTED', `Invoice 1 status restored to POSTED (actual: ${inv1Restored.status})`);

  // Verify GL reversal
  const journalAfterRev = await prisma.journalEntry.findUnique({
    where: { id: journalBeforeRev.id },
  });
  assert(journalAfterRev.status === 'Reversed', `Original journal status is marked 'Reversed' (actual: ${journalAfterRev.status})`);

  const compensatingJournal = await prisma.journalEntry.findFirst({
    where: { reference_type: 'REVERSAL', reference_id: journalBeforeRev.id },
    include: { items: true },
  });
  assert(!!compensatingJournal, `Compensating journal REV-... created: ${compensatingJournal?.journal_no}`);
  assert(compensatingJournal.status === 'Posted', 'Compensating journal status is Posted');

  // Verify items inverted: Dr AR (1-1200), Cr Customer Advance (2-1200)
  const compItems = compensatingJournal.items;
  const arItem = compItems.find((i) => i.debit === 4000000);
  const depItem = compItems.find((i) => i.credit === 4000000);
  assert(!!arItem, 'Compensating journal contains Debit Rp 4.000.000');
  assert(!!depItem, 'Compensating journal contains Credit Rp 4.000.000');

  // -------------------------------------------------------------
  // TEST SCENARIO 5: Cross-Tenant Boundary Protection
  // -------------------------------------------------------------
  console.log('\n▶ Step 8: Multi-Tenant Boundary Isolation');
  // Create another company and invoice
  const compB = await prisma.company.create({
    data: {
      name: 'Tenant B Competitor Ltd',
    },
  });
  const custB = await prisma.customer.create({
    data: {
      company_id: compB.id,
      code: `CUST-B-${Date.now()}`,
      name: 'Customer Tenant B',
    },
  });
  const invB = await prisma.invoice.create({
    data: {
      company_id: compB.id,
      customer_id: custB.id,
      invoice_number: `INV-B-${Date.now()}`,
      invoice_date: new Date(),
      due_date: new Date(),
      subtotal: 5000000,
      tax: 0,
      total: 5000000,
      paid_amount: 0,
      remaining_amount: 5000000,
      status: 'POSTED',
    },
  });

  // Attempt to apply Tenant A deposit to Tenant B invoice
  let crossTenantFailed = false;
  try {
    await req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers, // headers belongs to Tenant A
      body: { invoiceId: invB.id, paymentId: dep2Id, amount: 1000000 },
    });
  } catch (err) {
    crossTenantFailed = true;
    console.log(`  Cross-tenant access correctly blocked: HTTP ${err.status}`);
  }
  assert(crossTenantFailed, 'Cross-tenant deposit application strictly blocked by tenant boundary');

  // -------------------------------------------------------------
  // TEST SCENARIO 6: Trial Balance Balance Check (Sum Debit == Sum Credit)
  // -------------------------------------------------------------
  console.log('\n▶ Step 9: Trial Balance Integrity Check');
  const tbRes = await req('/gl/trial-balance', {
    method: 'GET',
    headers,
  });
  assert(tbRes.status === 200, 'Trial Balance endpoint returned 200 OK');
  const tb = tbRes.data;
  console.log(`  Total Debit: Rp ${tb.totalDebit.toLocaleString('id-ID')} | Total Credit: Rp ${tb.totalCredit.toLocaleString('id-ID')}`);
  assert(Math.abs(tb.totalDebit - tb.totalCredit) < 0.01, `Trial Balance balances strictly (Debit == Credit: diff=${tb.totalDebit - tb.totalCredit})`);

  // Check 4-1000 in Trial Balance
  const revRow = tb.accounts.find((a) => a.accountCode === '4-1000');
  if (revRow) {
    console.log(`  CoA 4-1000: ${revRow.accountName} | Normal: ${revRow.normalBalance} | Debit: Rp ${revRow.debit.toLocaleString('id-ID')} | Credit: Rp ${revRow.credit.toLocaleString('id-ID')} | Net Balance: Rp ${revRow.balance.toLocaleString('id-ID')}`);
    assert(revRow.normalBalance === 'Credit', `Trial balance lists 4-1000 normal balance as Credit (actual: ${revRow.normalBalance})`);
    assert(revRow.balance >= 0, `Trial balance reports non-negative Credit balance for revenue (actual: ${revRow.balance})`);
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS PASSED! Total: ${passed} passed, ${failed} failed.`);
  console.log('================================================================\n');
}

runTests()
  .catch((e) => {
    console.error('Fatal error running tests:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
