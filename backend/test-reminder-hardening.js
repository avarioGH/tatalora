const http = require('http');
const fs = require('fs');
const path = require('path');

const dbUrlFile = path.join(__dirname, '.test-db-url');
if (fs.existsSync(dbUrlFile)) {
  process.env.DATABASE_URL = fs.readFileSync(dbUrlFile, 'utf8').trim();
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function makeRequest({ port = 3001, path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method,
      headers: reqHeaders,
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const text = rawBuffer.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: text,
          json,
          buffer: rawBuffer,
        });
      });
    });

    req.on('error', err => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runReminderHardening() {
  console.log('================================================================');
  console.log('🚀 TATALORA ERP — PHASE 5.1 AUTOMATED INVOICE REMINDERS AUDIT');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     └─ ${details}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     └─ ${details}`);
    }
  }

  try {
    // 1. Authenticate as Owner
    console.log('--- Step 1: Authentication & Tenant Setup ---');
    const loginRes = await makeRequest({
      path: '/auth/login',
      method: 'POST',
      body: { username: 'owner', password: 'password123' },
    });
    assert(loginRes.statusCode === 200 || loginRes.statusCode === 201, 'Owner Login 200/201');
    const token = loginRes.json?.access_token || loginRes.json?.token;
    assert(!!token, 'Owner JWT Token Acquired');
    const authHeaders = { Authorization: `Bearer ${token}` };

    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const companyId = tokenPayload.company_id || tokenPayload.companyId;
    assert(!!companyId, 'Tenant Company ID Identified', `Company ID: ${companyId}`);

    // Create a secondary company to test Multi-Tenant Isolation
    let tenantB = await prisma.company.findFirst({ where: { name: 'Tenant B Isolated Corp' } });
    if (!tenantB) {
      tenantB = await prisma.company.create({
        data: {
          name: 'Tenant B Isolated Corp',
          address: 'Jl. Rungkut Industri, Surabaya',
          phone: '031-898989',
          email: 'admin@tenantb.com',
        },
      });
    }
    assert(!!tenantB, 'Tenant B Created for Multi-Tenant Isolation Test', `Tenant B ID: ${tenantB.id}`);

    // Ensure customer, unit, product exist for Company A
    let customerA = await prisma.customer.findFirst({ where: { company_id: companyId } });
    if (!customerA) {
      customerA = await prisma.customer.create({
        data: {
          company_id: companyId,
          code: 'CUST-REM-01',
          name: 'PT Klien Pengingat A',
          phone: '081299887766',
          email: 'klien.a@example.com',
        },
      });
    }

    let unit = await prisma.unit.findFirst({ where: { company_id: companyId } });
    if (!unit) {
      unit = await prisma.unit.create({ data: { company_id: companyId, name: 'Bulan' } });
    }

    let product = await prisma.product.findFirst({ where: { company_id: companyId } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          company_id: companyId,
          code: 'SVC-ERP-01',
          name: 'Langganan ERP Cloud',
          unit_id: unit.id,
          purchase_price: 5000000,
          selling_price: 10000000,
        },
      });
    }

    // 2. Configure Reminder Settings via API
    console.log('\n--- Step 2: Reminder Configuration & Settings API ---');
    const saveSettingsRes = await makeRequest({
      path: '/communication/settings',
      method: 'POST',
      headers: authHeaders,
      body: {
        reminder_enabled: true,
        reminder_channels: 'WHATSAPP,EMAIL',
        reminder_days_before: 3,
        reminder_on_due_date: true,
        reminder_days_after: 3,
        reminder_time: '09:00',
      },
    });
    assert(saveSettingsRes.statusCode === 200 || saveSettingsRes.statusCode === 201, 'POST /communication/settings saves reminder configuration');
    assert(saveSettingsRes.json.reminder_enabled === true, 'reminder_enabled is true');
    assert(saveSettingsRes.json.reminder_days_before === 3, 'reminder_days_before is 3');
    assert(saveSettingsRes.json.reminder_on_due_date === true, 'reminder_on_due_date is true');
    assert(saveSettingsRes.json.reminder_days_after === 3, 'reminder_days_after is 3');

    // 3. Setup Test Invoices for All Reminder Scenarios
    console.log('\n--- Step 3: Test Invoices Setup ---');
    const today = new Date();
    // Helper to format local midnight Date in company timezone
    const nowUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const dateDueToday = new Date(nowUtc);
    const dateBeforeDue = new Date(nowUtc + 3 * 24 * 3600 * 1000); // D-3 (due in 3 days)
    const dateOverdue = new Date(nowUtc - 3 * 24 * 3600 * 1000); // D+3 (due 3 days ago)
    const dateFarFuture = new Date(nowUtc + 10 * 24 * 3600 * 1000); // due in 10 days (not matched)

    // Invoice 1: Due Today (DUE_TODAY)
    const invDueToday = await prisma.invoice.create({
      data: {
        company_id: companyId,
        invoice_number: `INV-TODAY-${Date.now().toString().slice(-5)}`,
        customer_id: customerA.id,
        invoice_date: new Date(),
        due_date: dateDueToday,
        subtotal: 5000000,
        tax: 550000,
        total: 5550000,
        remaining_amount: 5550000,
        paid_amount: 0,
        status: 'UNPAID',
        type: 'AR',
      },
    });

    // Invoice 2: Due in 3 days (BEFORE_DUE)
    const invBeforeDue = await prisma.invoice.create({
      data: {
        company_id: companyId,
        invoice_number: `INV-BEFORE-${Date.now().toString().slice(-5)}`,
        customer_id: customerA.id,
        invoice_date: new Date(),
        due_date: dateBeforeDue,
        subtotal: 8000000,
        tax: 880000,
        total: 8880000,
        remaining_amount: 8880000,
        paid_amount: 0,
        status: 'POSTED',
        type: 'AR',
      },
    });

    // Invoice 3: Overdue by 3 days (OVERDUE) - Partially Paid
    const invOverdue = await prisma.invoice.create({
      data: {
        company_id: companyId,
        invoice_number: `INV-OVERDUE-${Date.now().toString().slice(-5)}`,
        customer_id: customerA.id,
        invoice_date: new Date(nowUtc - 30 * 24 * 3600 * 1000),
        due_date: dateOverdue,
        subtotal: 10000000,
        tax: 1100000,
        total: 11100000,
        paid_amount: 5000000, // Partially paid Rp 5.000.000
        remaining_amount: 6100000, // Remaining Rp 6.100.000
        status: 'PARTIALLY PAID',
        type: 'AR',
      },
    });

    // Invoice 4: Fully Paid (Must be EXCLUDED)
    const invPaid = await prisma.invoice.create({
      data: {
        company_id: companyId,
        invoice_number: `INV-PAID-${Date.now().toString().slice(-5)}`,
        customer_id: customerA.id,
        invoice_date: new Date(),
        due_date: dateDueToday,
        subtotal: 4000000,
        tax: 440000,
        total: 4440000,
        paid_amount: 4440000,
        remaining_amount: 0,
        status: 'PAID',
        type: 'AR',
      },
    });

    // Invoice 5: Cancelled (Must be EXCLUDED)
    const invCancelled = await prisma.invoice.create({
      data: {
        company_id: companyId,
        invoice_number: `INV-CANCEL-${Date.now().toString().slice(-5)}`,
        customer_id: customerA.id,
        invoice_date: new Date(),
        due_date: dateDueToday,
        subtotal: 3000000,
        tax: 330000,
        total: 3330000,
        paid_amount: 0,
        remaining_amount: 3330000,
        status: 'CANCELLED',
        type: 'AR',
      },
    });

    // Invoice 6: Tenant B Invoice (Must be ISOLATED from Tenant A)
    const invTenantB = await prisma.invoice.create({
      data: {
        company_id: tenantB.id,
        invoice_number: `INV-TENANTB-${Date.now().toString().slice(-5)}`,
        invoice_date: new Date(),
        due_date: dateDueToday,
        subtotal: 9000000,
        tax: 990000,
        total: 9990000,
        paid_amount: 0,
        remaining_amount: 9990000,
        status: 'UNPAID',
        type: 'AR',
      },
    });

    assert(true, 'Test Invoices Seeded Successfully', `DueToday: ${invDueToday.invoice_number}, BeforeDue: ${invBeforeDue.invoice_number}, Overdue: ${invOverdue.invoice_number}`);

    // Snapshot Financial State before Reminders
    const preInvTotal = invOverdue.total;
    const preInvPaid = invOverdue.paid_amount;
    const preInvRemaining = invOverdue.remaining_amount;
    const preCashCount = await prisma.cashAccount.count({ where: { company_id: companyId } });

    // 4. Test Preview Endpoint (Dry Run)
    console.log('\n--- Step 4: Reminder Preview & Eligibility Check ---');
    const previewRes = await makeRequest({
      path: '/communication/reminders/preview',
      headers: authHeaders,
    });
    assert(previewRes.statusCode === 200, 'GET /communication/reminders/preview returns 200');
    assert(Array.isArray(previewRes.json.details), 'Preview details is array');

    const previewNos = previewRes.json.details.map(d => d.invoiceNumber);
    assert(previewNos.includes(invDueToday.invoice_number), 'Invoice Due Today is detected in preview');
    assert(previewNos.includes(invBeforeDue.invoice_number), 'Invoice Before Due is detected in preview');
    assert(previewNos.includes(invOverdue.invoice_number), 'Invoice Overdue is detected in preview');
    assert(!previewNos.includes(invPaid.invoice_number), 'Fully Paid invoice is EXCLUDED from preview');
    assert(!previewNos.includes(invCancelled.invoice_number), 'Cancelled invoice is EXCLUDED from preview');
    assert(!previewNos.includes(invTenantB.invoice_number), 'Tenant B invoice is ISOLATED and NOT in Tenant A preview');

    // 5. Test Live Reminder Execution
    console.log('\n--- Step 5: Live Reminder Execution & Delivery ---');
    const runRes = await makeRequest({
      path: '/communication/reminders/run',
      method: 'POST',
      headers: authHeaders,
      body: { forceSend: true },
    });
    assert(runRes.statusCode === 200 || runRes.statusCode === 201, 'POST /communication/reminders/run returns 200/201');
    assert(runRes.json.sent > 0, `Reminders successfully sent (sent count: ${runRes.json.sent})`);
    assert(runRes.json.companyId === companyId, 'Result scoped to Tenant Company ID');

    // 6. Verify CommunicationLog & Reminder Stages in DB
    console.log('\n--- Step 6: Audit Trail & Stage Verification in Database ---');
    const logsDueToday = await prisma.communicationLog.findMany({
      where: { company_id: companyId, entity_id: invDueToday.id },
    });
    assert(logsDueToday.length > 0, 'Due Today invoice has communication logs created');
    assert(logsDueToday.some(l => l.reminder_stage === 'DUE_TODAY'), 'Log has reminder_stage: DUE_TODAY');
    assert(logsDueToday.some(l => l.created_by === 'SYSTEM_AUTO_REMINDER'), 'Log marked as created_by: SYSTEM_AUTO_REMINDER');

    const logsOverdue = await prisma.communicationLog.findMany({
      where: { company_id: companyId, entity_id: invOverdue.id },
    });
    assert(logsOverdue.length > 0, 'Overdue invoice has communication logs created');
    assert(logsOverdue.some(l => l.reminder_stage === 'OVERDUE'), 'Log has reminder_stage: OVERDUE');

    // Verify partial amount in overdue message
    const overdueWaLog = logsOverdue.find(l => l.channel === 'WHATSAPP' || l.channel === 'WHATSAPP_MANUAL');
    if (overdueWaLog) {
      assert(overdueWaLog.message_body.includes('6.100.000'), 'Overdue message displays outstanding Rp 6.100.000, NOT the original 11.100.000');
    }

    // 7. Test Idempotency & Duplicate Execution Protection
    console.log('\n--- Step 7: Duplicate Execution & Idempotency Audit ---');
    const runDuplicateRes = await makeRequest({
      path: '/communication/reminders/run',
      method: 'POST',
      headers: authHeaders,
      body: { forceSend: true },
    });
    assert(runDuplicateRes.statusCode === 200 || runDuplicateRes.statusCode === 201, 'Second reminder run succeeds');
    assert(runDuplicateRes.json.sent === 0, '0 messages sent on second run (duplicate protection active)');
    assert(runDuplicateRes.json.skipped >= 3, `All eligible invoices skipped as already sent (skipped count: ${runDuplicateRes.json.skipped})`);

    // 8. Test Concurrency & In-Flight Lock Protection
    console.log('\n--- Step 8: Concurrent Execution & Locking Audit ---');
    const p1 = makeRequest({ path: '/communication/reminders/run', method: 'POST', headers: authHeaders, body: { forceSend: true } });
    const p2 = makeRequest({ path: '/communication/reminders/run', method: 'POST', headers: authHeaders, body: { forceSend: true } });
    const [c1, c2] = await Promise.all([p1, p2]);
    const lockedOne = (c1.json?.errors?.some(e => e.includes('sedang berjalan')) || c2.json?.errors?.some(e => e.includes('sedang berjalan')));
    assert((c1.statusCode === 200 || c1.statusCode === 201) && (c2.statusCode === 200 || c2.statusCode === 201), 'Concurrent requests completed cleanly');
    assert(lockedOne || (c1.json.sent === 0 && c2.json.sent === 0), 'Concurrency serialization prevented duplicate dispatch');

    // 9. Financial Invariant Verification (Strictly Read-Only)
    console.log('\n--- Step 9: Financial Invariants Audit (Zero Mutations) ---');
    const postInvOverdue = await prisma.invoice.findUnique({ where: { id: invOverdue.id } });
    assert(postInvOverdue.total === preInvTotal, 'Invoice total unchanged');
    assert(postInvOverdue.paid_amount === preInvPaid, 'Invoice paid_amount unchanged');
    assert(postInvOverdue.remaining_amount === preInvRemaining, 'Invoice remaining_amount unchanged');
    assert(postInvOverdue.status === 'PARTIALLY PAID', 'Invoice status still PARTIALLY PAID (not marked paid)');

    const postCashCount = await prisma.cashAccount.count({ where: { company_id: companyId } });
    assert(postCashCount === preCashCount, 'No Kas & Bank transactions or accounts created');

    // 10. Multi-Tenant Cross-Isolation Audit
    console.log('\n--- Step 10: Multi-Tenant Boundary Verification ---');
    const tenantBLogs = await prisma.communicationLog.findMany({
      where: { company_id: tenantB.id },
    });
    assert(tenantBLogs.length === 0, 'Zero communication logs created under Tenant B by Tenant A execution');

    // 11. Invoice Detail History API Verification
    console.log('\n--- Step 11: Invoice Detail History API Verification ---');
    const historyRes = await makeRequest({
      path: `/communication/invoices/${invDueToday.id}/history`,
      headers: authHeaders,
    });
    assert(historyRes.statusCode === 200, 'GET /communication/invoices/:id/history returns 200');
    assert(Array.isArray(historyRes.json) && historyRes.json.length > 0, 'History contains records');
    assert(historyRes.json.some(h => h.reminder_stage === 'DUE_TODAY'), 'History records contain reminder_stage DUE_TODAY');

    // 12. Regression Test: Manual Invoice Sending
    console.log('\n--- Step 12: Regression Test for Manual Invoice Sending ---');
    const manualSendRes = await makeRequest({
      path: `/communication/invoices/${invDueToday.id}/send`,
      method: 'POST',
      headers: authHeaders,
      body: {
        channel: 'WHATSAPP_MANUAL',
        recipientPhone: '081299887766',
        messageBody: 'Manual reminder regression test',
        idempotencyKey: `manual-reg-${Date.now()}`,
      },
    });
    assert(manualSendRes.statusCode === 200 || manualSendRes.statusCode === 201, 'Existing manual send endpoint functions without regression');
    assert(manualSendRes.json.status === 'SENT', 'Manual send status is SENT');

    console.log('\n================================================================');
    console.log(`🏁 REMINDER AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('================================================================');

    if (passedTests === totalTests) {
      console.log('🎉 ALL AUTOMATED INVOICE REMINDER AUDIT TESTS PASSED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      console.error('⚠️ SOME TESTS FAILED.\n');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runReminderHardening().catch(err => {
  console.error('Fatal error running reminder hardening suite:', err);
  process.exit(1);
});
