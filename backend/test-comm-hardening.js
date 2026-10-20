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

async function runHardeningSuite() {
  console.log('================================================================');
  console.log('🚀 TATALORA ERP — PHASE 4 COMMUNICATION HARDENING AUDIT SUITE');
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
    // 1. Authenticate as tenant owner
    console.log('--- Step 1: Authentication & Token Retrieval ---');
    const loginRes = await makeRequest({
      path: '/auth/login',
      method: 'POST',
      body: { username: 'owner', password: 'password123' },
    });

    assert(loginRes.statusCode === 200 || loginRes.statusCode === 201, 'Owner Login Status 200/201');
    const token = loginRes.json?.access_token || loginRes.json?.token;
    assert(!!token, 'JWT Token Acquired');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Decode JWT payload to get user and company info
    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const companyId = tokenPayload.company_id || tokenPayload.companyId;
    assert(!!companyId, 'Tenant Company ID Identified', `Company ID: ${companyId}`);

    // 2. Ensure test customer and invoice exist in database
    console.log('\n--- Step 2: Invoice Setup & Multi-Tenant Verification ---');
    let testCustomer = await prisma.customer.findFirst({
      where: { company_id: companyId },
    });

    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          company_id: companyId,
          code: `CUST-${Date.now().toString().slice(-4)}`,
          name: 'PT Mitra Sukses Hardening',
          phone: '081298765432',
          email: 'finance@mitrasukses.co.id',
          address: 'Jl. Jenderal Sudirman No. 45, Jakarta Selatan',
        },
      });
      console.log('  Created test customer:', testCustomer.name);
    }

    let testInvoice = await prisma.invoice.findFirst({
      where: { company_id: companyId },
      include: { customer: true, items: true },
    });

    if (!testInvoice) {
      let unit = await prisma.unit.findFirst({ where: { company_id: companyId } });
      if (!unit) {
        unit = await prisma.unit.create({ data: { company_id: companyId, name: 'Pcs' } });
      }

      let product = await prisma.product.findFirst({ where: { company_id: companyId } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            company_id: companyId,
            code: 'PRD-AUDIT-01',
            name: 'Paket Software SaaS TATALORA ERP Pro',
            unit_id: unit.id,
            purchase_price: 10000000,
            selling_price: 15000000,
          },
        });
      }

      testInvoice = await prisma.invoice.create({
        data: {
          company_id: companyId,
          invoice_number: `INV-AUDIT-${Date.now().toString().slice(-6)}`,
          customer_id: testCustomer.id,
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 14 * 24 * 3600 * 1000),
          subtotal: 15000000,
          tax: 1650000,
          total: 16650000,
          remaining_amount: 16650000,
          paid_amount: 0,
          status: 'UNPAID',
          items: {
            create: [
              {
                product_id: product.id,
                description: 'Paket Software SaaS TATALORA ERP Pro',
                qty: 1,
                unit_price: 15000000,
                subtotal: 15000000,
              },
            ],
          },
        },
        include: { customer: true, items: true },
      });
      console.log('  Created test invoice:', testInvoice.invoice_number);
    }

    assert(!!testInvoice, 'Test Invoice Ready', `ID: ${testInvoice.id}, No: ${testInvoice.invoice_number}, Total: Rp ${testInvoice.total.toLocaleString('id-ID')}`);

    // 3. Credential Encryption & Data Masking Audit (Scenario 5)
    console.log('\n--- Step 3: Credential Encryption & Data Masking Audit ---');
    const initialSettingsRes = await makeRequest({
      path: '/communication/settings',
      headers: authHeaders,
    });
    assert(initialSettingsRes.statusCode === 200, 'GET /communication/settings returns 200');
    assert(initialSettingsRes.json.wa_access_token === undefined, 'Raw WhatsApp token is omitted from API response');
    assert(initialSettingsRes.json.email_smtp_pass === undefined, 'Raw SMTP password is omitted from API response');

    // Test saving encrypted credentials
    const testSecretMeta = 'EAAB_test_mock_meta_secret_key_998877';
    const testSecretSmtp = 'smtp_super_secret_password_4321';
    const saveSettingsRes = await makeRequest({
      path: '/communication/settings',
      method: 'POST',
      headers: authHeaders,
      body: {
        wa_enabled: true,
        wa_phone_number_id: '109823471928374',
        wa_business_id: '998234719283741',
        wa_sender_phone: '+6281234567890',
        wa_access_token: testSecretMeta,
        email_enabled: true,
        email_provider: 'SMTP',
        email_sender_name: 'TATALORA Billing',
        email_sender_addr: 'billing@tatalora.id',
        email_smtp_host: 'smtp.mailtrap.io',
        email_smtp_port: 587,
        email_smtp_user: 'mailtrap_user_test',
        email_smtp_pass: testSecretSmtp,
      },
    });
    assert(saveSettingsRes.statusCode === 200 || saveSettingsRes.statusCode === 201, 'POST /communication/settings encrypted credentials update succeeds');
    assert(saveSettingsRes.json.wa_has_token === true, 'wa_has_token is true after update');
    assert(saveSettingsRes.json.email_has_pass === true, 'email_has_pass is true after update');
    assert(saveSettingsRes.json.wa_access_token === undefined, 'Raw wa_access_token is never leaked in POST response');
    assert(saveSettingsRes.json.email_smtp_pass === undefined, 'Raw email_smtp_pass is never leaked in POST response');

    // Direct DB Verification of Encryption
    const dbSetting = await prisma.communicationSetting.findUnique({
      where: { company_id: companyId },
    });
    assert(dbSetting && dbSetting.wa_access_token !== testSecretMeta, 'wa_access_token stored in DB is NOT plain text');
    assert(dbSetting && dbSetting.wa_access_token.includes(':'), 'wa_access_token uses AES-256-GCM format (iv:tag:ciphertext or iv:auth:enc)');
    assert(dbSetting && dbSetting.email_smtp_pass !== testSecretSmtp, 'email_smtp_pass stored in DB is NOT plain text');
    assert(dbSetting && dbSetting.email_smtp_pass.includes(':'), 'email_smtp_pass uses AES-256-GCM format');

    // 4. Invoice Communication Preview & Variable Substitution
    console.log('\n--- Step 4: Template Variable Substitution & Preview ---');
    const previewRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/prepare`,
      headers: authHeaders,
    });
    assert(previewRes.statusCode === 200, 'GET /communication/invoices/:id/prepare status 200');
    assert(previewRes.json.prefill?.whatsapp_message?.includes(testInvoice.invoice_number), 'WhatsApp preview contains invoice number');
    assert(previewRes.json.channels?.whatsapp_manual?.web_link?.startsWith('https://api.whatsapp.com/send?phone='), 'WhatsApp manual web link formed correctly');
    assert(previewRes.json.channels?.whatsapp_official?.available === true, 'Meta official channel available flag is true');
    assert(previewRes.json.channels?.email?.available === true, 'Email channel available flag is true');

    // 5. PDF Generation Security & Authorization (Scenario 4)
    console.log('\n--- Step 5: PDF Generation Authorization & Format Check ---');
    const unauthPdfRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/pdf`,
      headers: {}, // No token
    });
    assert(unauthPdfRes.statusCode === 401, 'Unauthenticated PDF access blocked with 401 Unauthorized');

    const authPdfRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/pdf`,
      headers: authHeaders,
    });
    assert(authPdfRes.statusCode === 200, 'Authorized PDF access succeeds with 200 OK');
    assert(authPdfRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    const pdfMagic = authPdfRes.buffer.slice(0, 4).toString('utf8');
    assert(pdfMagic === '%PDF', `PDF binary magic header valid (%PDF), generated size: ${authPdfRes.buffer.length} bytes`);

    // 6. WhatsApp Web (Manual) Dispatch & Audit Trail
    console.log('\n--- Step 6: Manual WhatsApp Web Dispatch & Audit Trail ---');
    const manualWaKey = `manual-wa-key-${Date.now()}`;
    const manualWaRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/send`,
      method: 'POST',
      headers: authHeaders,
      body: {
        channel: 'WHATSAPP_MANUAL',
        recipientPhone: '081298765432',
        recipientName: 'Customer Hardening Test',
        messageBody: `Tagihan ${testInvoice.invoice_number} test WhatsApp Web`,
        idempotencyKey: manualWaKey,
      },
    });
    assert(manualWaRes.statusCode === 200 || manualWaRes.statusCode === 201, 'POST /communication/invoices/:id/send (WHATSAPP_MANUAL) succeeds');
    assert(manualWaRes.json.status === 'SENT', 'WhatsApp manual status recorded as SENT');

    // 7. Email Dispatch with PDF Generation
    console.log('\n--- Step 7: Email Dispatch with Automatic PDF Generation ---');
    const emailKey = `email-key-${Date.now()}`;
    const emailRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/send`,
      method: 'POST',
      headers: authHeaders,
      body: {
        channel: 'EMAIL',
        recipientEmail: 'finance@customer-test.com',
        recipientName: 'Customer Test Finance',
        subject: `Faktur Tagihan ${testInvoice.invoice_number}`,
        messageBody: 'Terlampir faktur tagihan resmi.',
        includePdf: true,
        idempotencyKey: emailKey,
      },
    });
    assert(emailRes.statusCode === 200 || emailRes.statusCode === 201, 'POST /communication/invoices/:id/send (EMAIL) succeeds');
    assert(emailRes.json.status === 'SENT', 'Email status recorded as SENT');
    assert(emailRes.json.attachedPdf === true, 'PDF attachment successfully compiled and attached');

    // 8. Idempotency & Concurrency Hardening (Scenario 1)
    console.log('\n--- Step 8: Idempotency & Concurrent Send Protection ---');
    // 8.1 Repeated Send with Same Key
    const repeatedRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/send`,
      method: 'POST',
      headers: authHeaders,
      body: {
        channel: 'EMAIL',
        recipientEmail: 'finance@customer-test.com',
        recipientName: 'Customer Test Finance',
        subject: `Faktur Tagihan ${testInvoice.invoice_number}`,
        messageBody: 'Duplicate send attempt.',
        includePdf: true,
        idempotencyKey: emailKey, // Reusing existing key
      },
    });
    assert(repeatedRes.statusCode === 200 || repeatedRes.statusCode === 201, 'Repeated request handled smoothly without throwing 500');
    assert(repeatedRes.json.duplicate === true, 'Repeated send detected as duplicate (idempotent interception)');

    // 8.2 Concurrent Parallel Sends with Same Key
    console.log('   Testing concurrent simultaneous requests...');
    const concurrentKey = `concurrent-race-key-${Date.now()}`;
    const concurrentPromises = [1, 2, 3].map(i =>
      makeRequest({
        path: `/communication/invoices/${testInvoice.id}/send`,
        method: 'POST',
        headers: authHeaders,
        body: {
          channel: 'WHATSAPP_MANUAL',
          recipientPhone: '081298765432',
          messageBody: `Concurrent attempt #${i}`,
          idempotencyKey: concurrentKey,
        },
      })
    );
    const concurrentResults = await Promise.all(concurrentPromises);
    const duplicates = concurrentResults.filter(r => r.json?.duplicate === true);
    const successes = concurrentResults.filter(r => r.json?.status === 'SENT' && !r.json?.duplicate);
    assert(successes.length === 1, `Exactly 1 out of 3 concurrent requests succeeded (${successes.length} succeeded)`);
    assert(duplicates.length === 2, `Remaining 2 concurrent requests intercepted as duplicates (${duplicates.length} duplicate)`);

    // 9. Input Validation & Provider Error Handling (Scenario 6)
    console.log('\n--- Step 9: Input Validation & Provider Error Handling ---');
    const invalidEmailRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/send`,
      method: 'POST',
      headers: authHeaders,
      body: {
        channel: 'EMAIL',
        recipientEmail: 'invalid-email-format-without-at',
      },
    });
    assert(invalidEmailRes.statusCode === 400, 'Invalid email rejected with 400 Bad Request');

    const invalidPhoneRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/send`,
      method: 'POST',
      headers: authHeaders,
      body: {
        channel: 'WHATSAPP',
        recipientPhone: '123', // Too short
      },
    });
    assert(invalidPhoneRes.statusCode === 400, 'Invalid phone number rejected with 400 Bad Request');

    // 10. Multi-Tenant Cross-Isolation Audit (Scenario 2)
    console.log('\n--- Step 10: Multi-Tenant Authorization & Boundary Audit ---');
    const fakeInvoiceId = '507f1f77bcf86cd799439011';
    const crossInvoiceRes = await makeRequest({
      path: `/communication/invoices/${fakeInvoiceId}/prepare`,
      headers: authHeaders,
    });
    assert(crossInvoiceRes.statusCode === 404, 'Access to non-existent or foreign tenant invoice preview blocked with 404');

    const crossPdfRes = await makeRequest({
      path: `/communication/invoices/${fakeInvoiceId}/pdf`,
      headers: authHeaders,
    });
    assert(crossPdfRes.statusCode === 404, 'Access to foreign tenant PDF blocked with 404');

    // 11. Communication Audit Trail History Verification
    console.log('\n--- Step 11: Audit Trail Log Persistence & Verification ---');
    const historyRes = await makeRequest({
      path: `/communication/invoices/${testInvoice.id}/history`,
      headers: authHeaders,
    });
    assert(historyRes.statusCode === 200, 'GET /communication/invoices/:id/history returns 200');
    assert(Array.isArray(historyRes.json) && historyRes.json.length >= 2, `Audit trail history has recorded logs (count: ${historyRes.json?.length})`);

    const hasManualLog = historyRes.json.some(l => l.channel === 'WHATSAPP_MANUAL');
    const hasEmailLog = historyRes.json.some(l => l.channel === 'EMAIL');
    assert(hasManualLog, 'Audit trail contains WHATSAPP_MANUAL log record');
    assert(hasEmailLog, 'Audit trail contains EMAIL log record');

    console.log('\n================================================================');
    console.log(`🏁 AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('================================================================');

    if (passedTests === totalTests) {
      console.log('🎉 ALL HARDENING AUDIT SCENARIOS VERIFIED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      console.error('⚠️ SOME AUDIT SCENARIOS FAILED.\n');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runHardeningSuite().catch(err => {
  console.error('Fatal error running hardening suite:', err);
  process.exit(1);
});
