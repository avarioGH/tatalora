import { PrismaClient } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { InventoryLedgerService } from './src/inventory/inventory-ledger.service';
import { ImportService } from './src/inventory/import/import.service';
import { SawnTimberService } from './src/inventory/sawn-timber.service';
import { TimberCalculationService } from './src/inventory/timber-calculation.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function runTest() {
  console.log('Starting MongoDB Memory Server...');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = mongod.getUri().replace('/?', '/testdb?');
  process.env.DATABASE_URL = uri;
  
  console.log('Connecting Prisma to in-memory MongoDB...');
  const prisma = new PrismaClient({ log: ['warn', 'error'] });
  await prisma.$connect();
  
  console.log('Pushing schema to DB...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: uri }});

  // Services
  const ledgerService = new InventoryLedgerService(prisma as any);
  const sawnTimberService = new SawnTimberService(prisma as any, ledgerService);
  const calcService = new TimberCalculationService();
  const importService = new ImportService(prisma as any, ledgerService, sawnTimberService, calcService);

  try {
    // PREPARE: copy excel file to uploads folder
    const excelPath = 'C:/Users/Billion/Downloads/1. Oktober 2025.xlsx';
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    const targetFile = '1. Oktober 2025.xlsx';
    fs.copyFileSync(excelPath, path.join(uploadDir, targetFile));

    console.log('\n--- 1. IMPORT WORKFLOW ---');
    // Step 1: Create Session
    const session = await importService.createSession(targetFile, targetFile, 'ADMIN_USER');
    console.log('Created Import Session:', session.id);

    // Step 2: Preview
    const preview = await importService.previewImport(session.id, 'Output Sawn timber', 'SAWN_TIMBER_OUTPUT');
    console.log('Preview Complete. Valid:', preview.validRows, 'Invalid:', preview.invalidRows);

    // Step 3: Execute
    console.log('Executing actual import to database...');
    const execResult = await importService.executeImport(session.id, 'Output Sawn timber', 'SAWN_TIMBER_OUTPUT');
    console.log('Import Result:', execResult);

    console.log('\n--- 2. RE-IMPORT (IDEMPOTENCY) ---');
    const session2 = await importService.createSession(targetFile, targetFile, 'ADMIN_USER');
    const execResult2 = await importService.executeImport(session2.id, 'Output Sawn timber', 'SAWN_TIMBER_OUTPUT');
    console.log('Re-import Result:', execResult2);

    console.log('\n--- 3. DATABASE VERIFICATION ---');
    
    // Check outputs
    const outputs = await prisma.sawnTimberOutput.findMany();
    console.log('Total Output Bundles Created:', outputs.length);
    
    // Check line items
    const lineItems = await prisma.sawnTimberOutputItem.count();
    console.log('Total Line Items in DB:', lineItems);

    // Check movements
    const movements = await prisma.timberStockMovement.findMany();
    console.log('Total Ledger Movements Generated:', movements.length);
    let totalLedgerInQty = 0;
    let totalLedgerInM3 = 0;
    movements.forEach(m => {
      totalLedgerInQty += m.quantityPcs;
      totalLedgerInM3 += m.volumeM3;
    });
    console.log('Total IN Qty from Ledger:', totalLedgerInQty);
    console.log('Total IN M3 from Ledger:', totalLedgerInM3.toFixed(4));

    // Check Stock Cache
    const stocks = await prisma.timberStock.findMany({ include: { timberVariant: true } });
    console.log('Total Unique SKUs in Stock:', stocks.length);
    let totalStockQty = 0;
    let totalStockM3 = 0;
    stocks.forEach(s => {
      totalStockQty += s.currentPcs;
      totalStockM3 += s.currentVolumeM3;
    });
    console.log('Total Current Pcs in Stock Cache:', totalStockQty);
    console.log('Total Current M3 in Stock Cache:', totalStockM3.toFixed(4));

    console.log('\n--- 4. AUDIT LOG VERIFICATION ---');
    const audits = await prisma.auditLog.findMany();
    console.log('Total Audit Logs Generated:', audits.length);
    const importAudit = audits.find(a => a.entity === 'IMPORT_SESSION');
    const outputAudits = audits.filter(a => a.entity === 'SAWN_OUTPUT' && a.action === 'POST');
    console.log('Has Import Audit?', !!importAudit);
    console.log('Output POST Audits count:', outputAudits.length);

    console.log('\nVERDICT:');
    if (outputs.length === 54 && lineItems === 1208 && totalLedgerInQty > 0) {
      console.log('? ALL TESTS PASSED SUCCESSFULLY');
    } else {
      console.log('? SOME TESTS FAILED');
    }

  } catch (err) {
    console.error('Test Failed!', err);
  } finally {
    await prisma.$disconnect();
    await mongod.stop();
  }
}

runTest();





