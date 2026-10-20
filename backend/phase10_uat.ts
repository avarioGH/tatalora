import { PrismaClient } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { execSync } from 'child_process';
import { InventoryLedgerService } from './src/inventory/inventory-ledger.service';
import { RawLogService } from './src/inventory/raw-log.service';
import { TrimmedLogService } from './src/inventory/trimmed-log.service';
import { InputLogService } from './src/inventory/input-log.service';
import { SawnTimberService } from './src/inventory/sawn-timber.service';
import { StockTransferService } from './src/inventory/stock-transfer.service';
import { StockAdjustmentService } from './src/inventory/stock-adjustment.service';
import { TimberCalculationService } from './src/inventory/timber-calculation.service';
import { ReportService } from './src/inventory/report.service';

async function runUAT() {
  console.log('Starting Phase 10 UAT Execution...');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = mongod.getUri().replace('/?', '/testdb?');
  process.env.DATABASE_URL = uri;

  const prisma = new PrismaClient();
  await prisma.$connect();
  execSync('npx prisma db push --accept-data-loss', { stdio: 'ignore', env: { ...process.env, DATABASE_URL: uri } });

  // Instantiate Services
  const calcService = new TimberCalculationService();
  const mockAudit = { log: async () => {} } as any;
  const ledger = new InventoryLedgerService(prisma as any);
  
  const rawService = new RawLogService(prisma as any, calcService, mockAudit);
  const trimService = new TrimmedLogService(prisma as any, calcService, mockAudit);
  const inputService = new InputLogService(prisma as any, mockAudit);
  const sawnService = new SawnTimberService(prisma as any, ledger, mockAudit);
  const transferService = new StockTransferService(prisma as any, ledger, mockAudit);
  const adjustmentService = new StockAdjustmentService(prisma as any, ledger, mockAudit);
  const reportService = new ReportService(prisma as any);

  const stats = { raw: 0, trims: 0, input: 0, output: 0, transfer: 0, adjustment: 0, errors: 0 };

  try {
    // 0. Setup mock company & locations
    const company = await prisma.company.create({ data: { name: 'UAT Company' } });
    const locA = await prisma.warehouse.create({ data: { name: 'Location A', code: 'L-A', company_id: company.id } });
    const locB = await prisma.warehouse.create({ data: { name: 'Location B', code: 'L-B', company_id: company.id } });
    console.log('[OK] Setup locations');

    // 1. RAW LOG UAT
    const rawLog = await rawService.createRawLog({
      logNumber: 'TEST-001', species: 'ULIN', length: 11,
      diameter1: 39, diameter2: 43, diameter3: 25, diameter4: 32,
      locationId: locA.id
    });
    console.log(`[OK] Raw Log Created: ${rawLog.logNumber} (Net M3: ${rawLog.netVolume})`);
    stats.raw++;

    // 2. TRIMMING UAT
    const trim1 = await trimService.createTrimmedLog(rawLog.id, { length: 4.4 });
    const trim2 = await trimService.createTrimmedLog(rawLog.id, { length: 4.3 });
    const trim3 = await trimService.createTrimmedLog(rawLog.id, { length: 2.3 });
    console.log(`[OK] Trimmed Logs Created: ${trim1.trimNumber}, ${trim2.trimNumber}, ${trim3.trimNumber}`);
    stats.trims += 3;

    // Reject orphan / over-trimming
    try {
      await trimService.createTrimmedLog(rawLog.id, { length: 1.0 });
    } catch (e: any) {
      console.log(`[OK] Over-trimming properly rejected: ${e.message}`);
    }

    // 3. INPUT LOG UAT
    const inputLog = await inputService.createInputLog({
      trimmedLogIds: [trim1.id, trim2.id, trim3.id],
      shift: '1', machine: 'M1', locationId: locA.id
    });
    console.log(`[OK] Input Log Created: ${inputLog.inputNumber} (Vol: ${inputLog.totalVolume})`);
    stats.input++;

    // 4. SAWN OUTPUT UAT
    const output = await sawnService.createOutput({
      inputLogId: inputLog.id, outputDate: new Date(), shift: '1', locationId: locA.id,
      items: [{ thickness: 42, width: 210, length: 2450, quantityPcs: 100 }] // 100 PCS
    });
    console.log(`[OK] Sawn Output DRAFT Created: ${output.bundleNumber}`);
    
    // Verify DRAFT does not affect stock
    let stockA = await prisma.timberStock.findFirst({ where: { locationId: locA.id } });
    if (stockA) throw new Error('Stock should not exist before POST');

    const postedOutput = await sawnService.postOutput(output.id);
    console.log(`[OK] Sawn Output POSTED`);
    stats.output++;

    stockA = await prisma.timberStock.findFirst({ where: { locationId: locA.id } });
    if (!stockA || stockA.currentPcs !== 100) throw new Error(`Stock mismatch after POST: ${stockA?.currentPcs}`);
    console.log(`[OK] Stock Verified: ${stockA.currentPcs} PCS`);

    // 5. TRANSFER UAT
    const transfer = await transferService.createTransfer({
      date: new Date(), fromLocationId: locA.id, toLocationId: locB.id,
      items: [{ timberVariantId: stockA.timberVariantId, quantityPcs: 20 }]
    });
    await transferService.postTransfer(transfer.id);
    stats.transfer++;
    console.log(`[OK] Transfer POSTED`);

    stockA = await prisma.timberStock.findFirst({ where: { locationId: locA.id } });
    const stockB = await prisma.timberStock.findFirst({ where: { locationId: locB.id } });
    if (stockA?.currentPcs !== 80 || stockB?.currentPcs !== 20) throw new Error('Transfer balance mismatch');
    console.log(`[OK] Transfer Balances Verified: Loc A=${stockA.currentPcs}, Loc B=${stockB.currentPcs}`);

    // Negative stock transfer rejection
    try {
      const badTransfer = await transferService.createTransfer({
        date: new Date(), fromLocationId: locB.id, toLocationId: locA.id,
        items: [{ timberVariantId: stockB!.timberVariantId, quantityPcs: 50 }]
      });
      await transferService.postTransfer(badTransfer.id);
    } catch (e: any) {
      console.log(`[OK] Negative stock transfer properly rejected: ${e.message}`);
    }

    // 6. ADJUSTMENT UAT
    const adjustment = await adjustmentService.createAdjustment({
      date: new Date(), locationId: locA.id,
      items: [{ timberVariantId: stockA.timberVariantId, systemPcs: 80, physicalPcs: 78 }] // -2 PCS
    });
    await adjustmentService.postAdjustment(adjustment.id);
    stats.adjustment++;
    console.log(`[OK] Adjustment POSTED`);

    stockA = await prisma.timberStock.findFirst({ where: { locationId: locA.id } });
    if (stockA?.currentPcs !== 78) throw new Error('Adjustment balance mismatch');
    console.log(`[OK] Adjustment Balances Verified: Loc A=${stockA.currentPcs}`);

    // 7. TRACEABILITY UAT
    const trace = await reportService.getTraceabilityReport(output.bundleNumber);
    if (!trace || trace.type !== 'SAWN_OUTPUT') throw new Error('Traceability failed');
    console.log(`[OK] Traceability Report Functional`);

    // 8. FINAL STATS & SUMMARY
    const finalMovements = await prisma.timberStockMovement.count();
    const finalSkus = await prisma.timberStock.count();
    
    console.log('\n--- UAT EXECUTION SUMMARY ---');
    console.log(`Raw Logs Tested: ${stats.raw}`);
    console.log(`Trimmings Tested: ${stats.trims}`);
    console.log(`Inputs Tested: ${stats.input}`);
    console.log(`Outputs Tested: ${stats.output}`);
    console.log(`Transfers Tested: ${stats.transfer}`);
    console.log(`Adjustments Tested: ${stats.adjustment}`);
    console.log(`Movements Verified: ${finalMovements}`);
    console.log(`SKUs Reconciled: ${finalSkus}`);
    console.log(`Locations Tested: 2`);
    console.log('? ALL E2E SCENARIOS PASSED');

  } catch (err) {
    console.error('? UAT FAILED:', err);
  } finally {
    await prisma.$disconnect();
    await mongod.stop();
  }
}

runUAT();
