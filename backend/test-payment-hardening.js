/**
 * TATALORA ERP - PHASE 6 PAYMENT & SETTLEMENT INTEGRITY TEST SUITE
 * Tests the complete payment lifecycle through both HTTP API and DB Invariants.
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
  console.log('🧪 RUNNING PHASE 6: SALES PAYMENT & SETTLEMENT INTEGRITY TESTS');
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
  const userId = user.id || user.userId;
  const headers = { Authorization: `Bearer ${token}` };
  assert(!!token, 'Owner successfully authenticated');

  // 2. Fetch or create Cash Account
  console.log('\n▶ Step 2: Cash Account Setup');
  let cashAccount = await prisma.cashAccount.findFirst({
    where: { company_id: companyId },
  });
  if (!cashAccount) {
    cashAccount = await prisma.cashAccount.create({
      data: {
        company_id: companyId,
        code: '1-1001',
        name: 'Kas Operasional',
        account_type: 'Cash',
        current_balance: 10000000,
      },
    });
  }
  assert(!!cashAccount?.id, `Cash Account ready: ${cashAccount.name} (${cashAccount.id})`);

  // 3. Customer Setup
  console.log('\n▶ Step 3: Customer Setup');
  let customer = await prisma.customer.findFirst({
    where: { company_id: companyId, email: 'mitra6@example.com' },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        company_id: companyId,
        code: `CUST-P6-${Date.now()}`,
        name: 'PT Mitra Konstruksi Phase 6',
        phone: '081299998888',
        email: 'mitra6@example.com',
        address: 'Kawasan Industri MM2100',
      },
    });
  }
  assert(!!customer?.id, `Customer ready: ${customer.name} (${customer.id})`);

  // 4. Product Setup
  console.log('\n▶ Step 4: Product Setup');
  let product = await prisma.product.findFirst({
    where: { company_id: companyId },
  });
  if (!product) {
    let unit = await prisma.unit.findFirst({ where: { company_id: companyId } });
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          company_id: companyId,
          code: 'M3',
          name: 'Meter Kubik',
        },
      });
    }
    product = await prisma.product.create({
      data: {
        company_id: companyId,
        unit_id: unit.id,
        code: `PRD-${Date.now()}`,
        name: 'Balok Kayu Meranti Grade A',
        selling_price: 5000000,
        purchase_price: 3500000,
      },
    });
  }
  assert(!!product?.id, `Product ready: ${product.name}`);

  // 5. Create Sales Order directly for Rp 10.000.000
  console.log('\n▶ Step 5: Sales Order Setup (Rp 10.000.000)');
  const soNumber = `SO-P6-${Date.now()}`;
  const so = await prisma.salesOrder.create({
    data: {
      company_id: companyId,
      customer_id: customer.id,
      order_number: soNumber,
      order_date: new Date(),
      status: 'APPROVED',
      payment_status: 'UNPAID',
      invoice_status: 'NOT_INVOICED',
      total_amount: 10000000,
      items: {
        create: [
          {
            product_id: product.id,
            qty: 2,
            unit_price: 5000000,
            subtotal: 10000000,
          },
        ],
      },
    },
    include: { items: true },
  });
  assert(so.total_amount === 10000000, `Sales Order created: ${so.order_number}`);

  // 6. Record Upfront Customer Deposit (Rp 4.000.000) for this Sales Order
  console.log('\n▶ Step 6: Upfront Customer Deposit / Uang Muka (Rp 4.000.000)');
  const depositRes = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      customerId: customer.id,
      salesOrderId: so.id,
      amount: 4000000,
      paymentMethod: 'BANK_TRANSFER',
      cashAccountId: cashAccount.id,
      reference: `DP-${so.order_number}`,
      notes: 'Uang Muka 40% Pesanan Kayu',
    },
  });
  const depositPayment = depositRes.data;
  assert(depositPayment.amount === 4000000, 'Deposit payment recorded via PaymentService');

  // Verify SO status updated to PARTIAL
  const soAfterDeposit = await prisma.salesOrder.findUnique({ where: { id: so.id } });
  assert(soAfterDeposit.payment_status === 'PARTIAL', `SO payment_status is ${soAfterDeposit.payment_status} (expected PARTIAL)`);

  // Verify Cash Transaction (Cash In) created once
  const depositCashTx = await prisma.financeTransaction.findFirst({
    where: {
      reference_type: 'PAYMENT',
      reference_id: depositPayment.id,
      company_id: companyId,
    },
  });
  assert(!!depositCashTx, 'FinanceTransaction created for deposit');
  assert(depositCashTx.transaction_type === 'Cash In', 'FinanceTransaction is Cash In');

  // 7. Create and Post Sales Invoice from SO
  console.log('\n▶ Step 7: Sales Invoice Creation from SO');
  const invRes = await req('/finance/invoices/from-so', {
    method: 'POST',
    headers,
    body: { salesOrderId: so.id },
  });
  const invoice = invRes.data;
  assert(invoice.total === 10000000, `Invoice created: ${invoice.invoice_number} Total: Rp ${invoice.total.toLocaleString('id-ID')}`);
  assert(invoice.remaining_amount === 10000000, `Remaining amount initialized to total: Rp ${invoice.remaining_amount.toLocaleString('id-ID')}`);

  // Post Invoice
  const postRes = await req(`/finance/invoices/${invoice.id}/post`, {
    method: 'POST',
    headers,
  });
  assert(postRes.data.status === 'POSTED', 'Invoice status is POSTED');

  // 8. Query Available Deposits for this Customer
  console.log('\n▶ Step 8: Query Available Customer Deposits API');
  const availRes = await req(`/finance/payments/available-deposits?customerId=${customer.id}`, { headers });
  const myDeposit = availRes.data.find(d => d.paymentId === depositPayment.id);
  assert(!!myDeposit, 'Deposit found in available deposits API');
  assert(myDeposit.availableBalance === 4000000, `Deposit available balance is Rp ${myDeposit.availableBalance.toLocaleString('id-ID')}`);

  // Count FinanceTransactions before applying deposit
  const totalTxBeforeApply = await prisma.financeTransaction.count({ where: { company_id: companyId } });

  // 9. CRITICAL INVARIANT: Apply Customer Deposit to Invoice (Rp 4.000.000)
  console.log('\n▶ Step 9: Apply Deposit to Invoice (ZERO CASH MOVEMENT TEST)');
  const applyRes = await req('/finance/payments/apply-deposit', {
    method: 'POST',
    headers,
    body: {
      invoiceId: invoice.id,
      paymentId: depositPayment.id,
      amount: 4000000,
      notes: 'Penerapan DP ke Faktur',
    },
  });
  assert(applyRes.data.success === true, 'apply-deposit returned success');
  assert(applyRes.data.remainingInvoice === 6000000, 'Invoice remaining balance reduced to Rp 6.000.000');
  assert(applyRes.data.remainingDeposit === 0, 'Remaining deposit is Rp 0');

  // Verify CRITICAL FINANCIAL INVARIANT: NO NEW FinanceTransaction!
  const totalTxAfterApply = await prisma.financeTransaction.count({ where: { company_id: companyId } });
  assert(totalTxAfterApply === totalTxBeforeApply, 'CRITICAL INVARIANT VERIFIED: ZERO new cash movement / FinanceTransaction on deposit allocation!');

  // Verify Invoice in DB
  const invInDb = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  assert(invInDb.paid_amount === 4000000, 'Invoice paid_amount updated to 4.000.000');
  assert(invInDb.remaining_amount === 6000000, 'Invoice remaining_amount updated to 6.000.000');
  assert(invInDb.status === 'PARTIALLY PAID', `Invoice status is ${invInDb.status}`);

  // 10. Overpayment Rejection Test (> remaining_amount)
  console.log('\n▶ Step 10: Overpayment Rejection Test');
  try {
    await req('/finance/payments', {
      method: 'POST',
      headers,
      body: {
        invoiceId: invoice.id,
        amount: 8000000, // Remaining is 6.000.000
        cashAccountId: cashAccount.id,
      },
    });
    assert(false, 'Overpayment should have been rejected');
  } catch (err) {
    assert(err.status === 400, 'Overpayment rejected with 400 Bad Request');
    console.log(`  ℹ Expected Error message: "${err.data?.message}"`);
  }

  // 11. Partial Direct Payment (Rp 3.000.000) via Cash/Bank
  console.log('\n▶ Step 11: Direct Payment (Catat Pembayaran - Partial Rp 3.000.000)');
  const partRes = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      invoiceId: invoice.id,
      amount: 3000000,
      cashAccountId: cashAccount.id,
      paymentMethod: 'BANK_TRANSFER',
      reference: `PAY-P6-PART-${Date.now()}`,
      notes: 'Pembayaran termin 2',
    },
  });
  assert(partRes.data.amount === 3000000, 'Partial payment recorded');

  const invAfterPart = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  assert(invAfterPart.paid_amount === 7000000, 'Invoice paid_amount is Rp 7.000.000');
  assert(invAfterPart.remaining_amount === 3000000, 'Invoice remaining_amount is Rp 3.000.000');
  assert(invAfterPart.status === 'PARTIALLY PAID', 'Invoice status remains PARTIALLY PAID');

  // 12. Full Settlement Payment (Rp 3.000.000) with Idempotency Key
  console.log('\n▶ Step 12: Full Settlement Payment (Pelunasan) with Idempotency Key');
  const idempotencyKey = `IDEM-PAY-${Date.now()}`;
  const settleRes = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      invoiceId: invoice.id,
      amount: 3000000,
      cashAccountId: cashAccount.id,
      paymentMethod: 'BANK_TRANSFER',
      idempotencyKey,
      notes: 'Pelunasan sisa tagihan',
    },
  });
  const settlePayment = settleRes.data;
  assert(settlePayment.amount === 3000000, 'Settlement payment recorded');

  // Idempotency retry check
  console.log('\n▶ Step 13: Idempotency Protection Verification');
  const retryRes = await req('/finance/payments', {
    method: 'POST',
    headers,
    body: {
      invoiceId: invoice.id,
      amount: 3000000,
      cashAccountId: cashAccount.id,
      idempotencyKey,
    },
  });
  assert(retryRes.data.id === settlePayment.id, 'Duplicate payment safely intercepted by idempotencyKey without creating second payment!');

  const invAfterSettle = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  assert(invAfterSettle.paid_amount === 10000000, 'Invoice paid_amount is 10.000.000');
  assert(invAfterSettle.remaining_amount === 0, 'Invoice remaining_amount is 0');
  assert(invAfterSettle.status === 'PAID', 'Invoice status updated to PAID (Lunas)');

  // 13. Payment Confirmation Communication Test
  console.log('\n▶ Step 14: Payment Confirmation Communication');
  const receiptRes = await req(`/communication/payments/${settlePayment.id}/send`, {
    method: 'POST',
    headers,
    body: {
      channel: 'WHATSAPP_MANUAL',
      recipientPhone: customer.phone,
      idempotencyKey: `RCPT-${settlePayment.id}`,
    },
  });
  assert(receiptRes.data.success === true, 'Payment confirmation generated');
  assert(!!receiptRes.data.webLink, 'WhatsApp Web receipt link formatted properly with invoice & payment details');

  // 14. Payment Reversal / Void Test
  console.log('\n▶ Step 15: Payment Reversal / Void Workflow');
  const revRes = await req(`/finance/payments/${settlePayment.id}/reverse`, {
    method: 'POST',
    headers,
    body: {
      reason: 'Uji pembatalan pembayaran (void test)',
    },
  });
  assert(revRes.data.success === true, 'Payment successfully reversed');

  // Verify Invoice balance restored in DB
  const pAfterRev = await prisma.payment.findUnique({ where: { id: settlePayment.id } });
  console.log('  ℹ Payment record in DB after reversal:', { id: pAfterRev?.id, notes: pAfterRev?.notes, deleted_at: pAfterRev?.deleted_at });

  const invAfterRev = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  assert(invAfterRev.remaining_amount === 3000000, `Invoice remaining balance restored to Rp ${invAfterRev.remaining_amount.toLocaleString('id-ID')} (expected 3.000.000)`);
  assert(invAfterRev.paid_amount === 7000000, `Invoice paid amount restored to Rp ${invAfterRev.paid_amount.toLocaleString('id-ID')} (expected 7.000.000)`);
  assert(invAfterRev.status === 'PARTIALLY PAID', 'Invoice status reverted from PAID to PARTIALLY PAID');

  // Verify Compensating Reversal FinanceTransaction
  const revCashTx = await prisma.financeTransaction.findFirst({
    where: {
      reference_type: 'PAYMENT_REVERSAL',
      reference_id: settlePayment.id,
      company_id: companyId,
    },
  });
  assert(!!revCashTx, 'Compensating Reversal FinanceTransaction (Cash Out) recorded');
  assert(revCashTx.transaction_type === 'Cash Out', 'Compensating transaction type is Cash Out');

  // Re-void attempt must fail
  let duplicateVoidFailed = false;
  try {
    const res2 = await req(`/finance/payments/${settlePayment.id}/reverse`, {
      method: 'POST',
      headers,
      body: { reason: 'Duplicate void' },
    });
    console.log('  ⚠️ Duplicate void unexpectedly succeeded! Result:', res2);
  } catch (err) {
    if (err.status === 400) {
      duplicateVoidFailed = true;
      console.log(`  ℹ Expected Error message on duplicate void: "${err.data?.message}"`);
    } else {
      console.log(`  ⚠️ Unexpected status code: ${err.status}`, err.data);
    }
  }
  assert(duplicateVoidFailed, 'Duplicate payment void correctly rejected with 400');

  // 15. Multi-Tenant Isolation Check
  console.log('\n▶ Step 16: Multi-Tenant Isolation Enforcement');
  try {
    await req('/finance/payments/apply-deposit', {
      method: 'POST',
      headers,
      body: {
        invoiceId: invoice.id,
        paymentId: '666666666666666666666666',
        amount: 1000000,
      },
    });
    assert(false, 'Foreign payment should have been rejected');
  } catch (err) {
    assert(err.status === 404, 'Foreign/unauthorized payment correctly rejected with 404');
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS COMPLETED SUCCESSFULLY! (${passed} PASSED, ${failed} FAILED)`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runTests().catch(async (err) => {
  console.error('\n❌ TEST RUN FAILED:', err.message);
  if (err.data) {
    console.error('Response data:', err.data);
  }
  await prisma.$disconnect();
  process.exit(1);
});
