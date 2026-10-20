import { PrismaService } from './prisma/prisma.service';
import { AdjustmentAuditService } from './inventory/reconciliation/adjustment-audit.service';
import * as fs from 'fs';

async function bootstrap() {
  const companyId = process.argv[2];
  if (!companyId) {
    console.error('ERROR: Company ID argument is required.');
    console.log('Usage: npx ts-node src/run-adjustment-audit.ts <companyId>');
    process.exit(1);
  }

  console.log('==================================================');
  console.log('PHASE 45.8F - STRICT READ-ONLY ADJUSTMENT AUDIT');
  console.log('==================================================');
  console.log('Initializing Standalone Read-Only Audit Runtime...');

  // Directly instantiate Prisma without NestJS Application Context
  const prisma = new PrismaService();
  await prisma.$connect();

  // Directly instantiate the Audit Service
  const auditService = new AdjustmentAuditService(prisma);

  try {
    console.log(`Executing forensic audit for Company ID: ${companyId}`);
    console.log(
      'Fetching historical cancellations and movements (Safe Read-Only)...',
    );

    const startTime = Date.now();
    const report = await auditService.runForensicAudit(companyId);
    const duration = Date.now() - startTime;

    console.log(`\nAudit completed in ${duration}ms.`);
    console.log('\n--- SUMMARY ---');
    console.log(
      `Total Cancelled Adjustments: ${report.summary.totalCancelledAdjustments}`,
    );
    console.log(
      `NOT AFFECTED               : ${report.summary.notAffectedCount}`,
    );
    console.log(
      `POTENTIALLY AFFECTED       : ${report.summary.potentiallyAffectedCount}`,
    );
    console.log(
      `CONFIRMED AFFECTED         : ${report.summary.confirmedAffectedCount}`,
    );
    console.log(
      `INSUFFICIENT DATA          : ${report.summary.insufficientDataCount}`,
    );

    const outFileName = `adjustment_audit_report_${companyId}_${Date.now()}.json`;
    fs.writeFileSync(outFileName, JSON.stringify(report, null, 2));

    console.log(`\nDetailed report written securely to: ${outFileName}`);
    console.log('DO NOT automatically run repairs based on this file.');
    console.log('Review the JSON output manually.');
  } catch (err) {
    console.error('CRITICAL ERROR during execution:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrap();
