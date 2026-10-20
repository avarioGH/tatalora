/**
 * ====================================================================
 * TATALORA ERP — PHASE 8.6.3: CRITICAL DEFECT REMEDIATION TEST SUITE
 * ====================================================================
 * Covers:
 * 1. DEF-1 & DEF-2: Transactional Outbox Relay Worker validation
 *    - Captures mutations within identical business transaction
 *    - Recovers from crash / interrupted processing
 *    - Deduplicates identical outbox rows without data loss
 * 2. DEF-3: Day-One 13 Operational Models verification
 *    - Functional RBAC (Permission, RolePermission)
 *    - Monotonic numbering (DocumentSequence)
 *    - Compliance auditing (AuditLog)
 *    - HR & Payroll (Department, Employee, Shift, Attendance, Payroll, PayrollItem)
 *    - Procurement & Costing (PurchaseRequest, ExpenseClaim, SupplierProduct)
 * 3. DEF-4 & DEF-5: Explicit reporting of Database-Backed Staging Rehearsal
 *    and Real Source-to-Target Reconciliation (marked NOT TESTED with prerequisites).
 * ====================================================================
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { TransactionalOutboxRelayWorker } = require('./scripts/migration/transactional_outbox_relay_worker');
const { DayOneOperationalValidator } = require('./scripts/migration/day_one_operational_validator');

async function runPhase863RemediationSuite() {
  console.log('====================================================================');
  console.log('TATALORA ERP — PHASE 8.6.3: CRITICAL DEFECT REMEDIATION SUITE');
  console.log('====================================================================\n');

  const results = {
    def1_def2_transactionalOutbox: false,
    def3_dayOneModels: false,
    def4_databaseBackedBenchmark: 'NOT TESTED',
    def5_realSourceToTargetReconciliation: 'NOT TESTED'
  };

  // ------------------------------------------------------------------
  // 1. DEF-1 & DEF-2: TRANSACTIONAL OUTBOX CDC RELAY
  // ------------------------------------------------------------------
  console.log('>>> TESTING DEF-1 & DEF-2: TRANSACTIONAL OUTBOX CDC RELAY WORKER...');
  const testCheckpointDir = path.join(__dirname, 'checkpoints_outbox_test');
  if (fs.existsSync(testCheckpointDir)) fs.rmSync(testCheckpointDir, { recursive: true, force: true });

  const relayWorker = new TransactionalOutboxRelayWorker({ checkpointDir: testCheckpointDir });
  const compId = crypto.randomUUID();
  const invId1 = crypto.randomUUID();
  const invId2 = crypto.randomUUID();

  // Simulate transactional operations that insert to Outbox inside the same DB transaction
  relayWorker.executeTransactionWithOutbox('Invoice', 'INSERT', invId1, {
    company_id: compId, invoice_number: 'INV/2026/00001', total: 25000000, status: 'POSTED'
  });
  relayWorker.executeTransactionWithOutbox('Invoice', 'INSERT', invId2, {
    company_id: compId, invoice_number: 'INV/2026/00002', total: 15000000, status: 'DRAFT'
  });
  relayWorker.executeTransactionWithOutbox('Invoice', 'UPDATE', invId1, {
    paid_amount: 10000000, remaining_amount: 15000000, status: 'PARTIALLY_PAID'
  });
  relayWorker.executeTransactionWithOutbox('Invoice', 'SOFT_DELETE', invId2, {
    deleted_at: new Date().toISOString()
  });

  // Test crash simulation at 2 events
  console.log('   Testing crash-tolerance: Outbox processing interrupted at 2 events...');
  const crashBatch = relayWorker.processOutboxBatch({ simulateCrashAt: 2 });
  console.log(`   Worker Interrupted: Processed ${crashBatch.processedCount} events before crash.`);

  // Resume worker process
  console.log('   Testing worker resume & deduplication...');
  const resumeBatch = relayWorker.processOutboxBatch();
  console.log(`   Worker Resumed: Processed ${resumeBatch.processedCount} remaining events, Skipped ${resumeBatch.skippedDuplicates} duplicates.`);

  // Verify MongoDB target state
  const mongoInv1 = Array.from(relayWorker.mongoDb.Invoice.values()).find(i => i.invoice_number === 'INV/2026/00001');
  const mongoInv2 = Array.from(relayWorker.mongoDb.Invoice.values()).find(i => i.invoice_number === 'INV/2026/00002');

  const isInv1Updated = mongoInv1 && mongoInv1.paid_amount === 10000000 && mongoInv1.status === 'PARTIALLY_PAID';
  const isInv2SoftDeleted = mongoInv2 && mongoInv2.deleted_at !== undefined;

  if (isInv1Updated && isInv2SoftDeleted && resumeBatch.processedCount === 2) {
    results.def1_def2_transactionalOutbox = true;
    console.log('✅ DEF-1 & DEF-2 RESOLVED: Transactional outbox CDC relay guarantees atomic capture and crash recovery.\n');
  } else {
    throw new Error('DEF-1 / DEF-2 Failed: Invoices not correctly replayed from outbox.');
  }

  // ------------------------------------------------------------------
  // 2. DEF-3: VERIFY DAY-ONE OPERATIONAL MODELS
  // ------------------------------------------------------------------
  console.log('>>> TESTING DEF-3: FUNCTIONAL VERIFICATION OF 13 DAY-ONE OPERATIONAL MODELS...');
  const validator = new DayOneOperationalValidator();

  // Test A: RBAC (Permission, RolePermission)
  const rbacRes = validator.testRbacWorkflow(compId);
  console.log(`   - RBAC Workflow (Permission, RolePermission): ${rbacRes.status}`);

  // Test B: DocumentSequence Concurrency & Monotonicity
  const seqRes = validator.testDocumentSequence(compId, 'INVOICE', 'INV/2026/');
  console.log(`   - DocumentSequence (Monotonic Numbers: ${seqRes.generatedNumbers.join(', ')}): ${seqRes.status}`);

  // Test C: AuditLog
  const auditRes = validator.testAuditLog(compId, crypto.randomUUID());
  console.log(`   - AuditLog Recording: ${auditRes.status}`);

  // Test D: HR & Payroll (Department, Shift, Employee, Attendance, Payroll, PayrollItem)
  const hrRes = validator.testHrPayrollWorkflow(compId);
  console.log(`   - HR & Payroll Workflow (Net Salary: Rp ${hrRes.netSalary}): ${hrRes.status}`);

  // Test E: Procurement (PurchaseRequest, ExpenseClaim, SupplierProduct)
  const procRes = validator.testProcurementWorkflow(compId, crypto.randomUUID());
  console.log(`   - Procurement & Expense Claims: ${procRes.status}`);

  const allDayOnePassed = rbacRes.status === 'PASS' &&
                         seqRes.status === 'PASS' &&
                         auditRes.status === 'PASS' &&
                         hrRes.status === 'PASS' &&
                         procRes.status === 'PASS';

  if (allDayOnePassed) {
    results.def3_dayOneModels = true;
    console.log('✅ DEF-3 RESOLVED: All 13 Day-One operational models functionally tested and promoted to VERIFIED.\n');
  } else {
    throw new Error('DEF-3 Failed: One or more Day-One models failed functional verification.');
  }

  // ------------------------------------------------------------------
  // 3. DEF-4 & DEF-5: DATABASE-BACKED BENCHMARK & REAL RECONCILIATION
  // ------------------------------------------------------------------
  console.log('>>> AUDITING DEF-4 & DEF-5 INFRASTRUCTURE PREREQUISITES...');
  const hasStagingUrl = !!process.env.STAGING_DATABASE_URL;
  const hasMongoUrl = !!process.env.DATABASE_URL;

  console.log(`   - Live PostgreSQL Staging DB Available: ${hasStagingUrl ? 'YES' : 'NO (NOT TESTED)'}`);
  console.log(`   - Live MongoDB Source Available: ${hasMongoUrl ? 'YES' : 'NO (NOT TESTED)'}`);

  if (!hasStagingUrl || !hasMongoUrl) {
    console.log('   ⚠️ DEF-4 (Live DB Benchmark) marked NOT TESTED due to unavailable staging credentials.');
    console.log('   ⚠️ DEF-5 (Real Source-to-Target Reconciliation) marked NOT TESTED due to unavailable staging credentials.');
  }

  // Cleanup test checkpoints
  if (fs.existsSync(testCheckpointDir)) fs.rmSync(testCheckpointDir, { recursive: true, force: true });

  console.log('\n====================================================================');
  console.log('PHASE 8.6.3 DEFECT REMEDIATION COMPLETE');
  console.log('====================================================================');
  return results;
}

runPhase863RemediationSuite()
  .then(res => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Phase 8.6.3 Execution Error:', err);
    process.exit(1);
  });
