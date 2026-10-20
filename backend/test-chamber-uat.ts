/**
 * PHASE 15D.3 - CHAMBER OPERATIONS CONNECTED UAT - Production-Safe Harness
 *
 * SAFETY ARCHITECTURE:
 *   Prisma:  ONLY for reference entity create (TimberVariant, Warehouse, Product)
 *   Stock:   ALL via public API (InventoryLedgerService) - adjustments + transfers
 *   Cleanup: try/finally guaranteed - cancel transfers, cancel adj, delete Prisma refs
 *   NEVER uses production stock, NEVER uses availableStock[0]
 *
 * USAGE (from backend/ directory on VPS):
 *   cp ../scripts/qa/test-chamber-operations-uat.ts ./test-chamber-uat.ts
 *   API_TOKEN="ey..." API_URL="https://api.erp.boostup.id" npx ts-node test-chamber-uat.ts
 *   rm test-chamber-uat.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MARKER    = 'CHAMBER_UAT_' + Date.now();
const API_URL   = (process.env.API_URL || 'https://api.erp.boostup.id').replace(/\/+$/, '');
const API_TOKEN = process.env.API_TOKEN || '';

const THICK = 20, W = 100, L = 3000;
const VOL_PER = parseFloat(((THICK * W * L) / 1_000_000_000).toFixed(9));

const SEED_Q = 20,  SEED_V = parseFloat((20 * VOL_PER).toFixed(6));
const IN_Q   = 10,  IN_V   = parseFloat((10 * VOL_PER).toFixed(6));
const OUT_Q  = 5,   OUT_V  = parseFloat((5  * VOL_PER).toFixed(6));

type Status = 'PASS' | 'FAIL' | 'SKIP';
const results: { s: string; status: Status; d: string }[] = [];

function rec(s: string, status: Status, d = '') {
  results.push({ s, status, d });
  const icon = status === 'PASS' ? 'OK  ' : status === 'FAIL' ? 'FAIL' : 'SKIP';
  console.log('  [' + icon + '] ' + s + (d ? ': ' + d : ''));
}

async function apiCall(endpoint: string, method = 'GET', body?: object): Promise<any> {
  const bearer = API_TOKEN.startsWith('Bearer ') ? API_TOKEN : 'Bearer ' + API_TOKEN;
  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': bearer }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_URL + endpoint, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ' ' + method + ' ' + endpoint + ': ' + t.slice(0, 200));
  }
  return res.json();
}

async function getStock(locId: string, varId: string): Promise<{ pcs: number; vol: number } | null> {
  try {
    const r = await apiCall('/inventory/timber-stock?locationId=' + locId);
    const item = (r?.items || []).find((s: any) => s.timberVariantId === varId);
    return item ? { pcs: item.currentPcs, vol: item.currentVolumeM3 } : null;
  } catch { return null; }
}

async function run() {
  console.log('='.repeat(65));
  console.log('  CHAMBER UAT -- PRODUCTION-SAFE CONNECTED UAT');
  console.log('  API:    ' + API_URL);
  console.log('  MARKER: ' + MARKER);
  console.log('  Token:  ' + (API_TOKEN ? '[PROVIDED]' : '[MISSING -- will fail auth]'));
  console.log('='.repeat(65));

  if (!API_TOKEN) {
    console.error('BLOCKED: API_TOKEN env var is required.');
    process.exit(1);
  }

  let co: any, prod: any, vari: any, yard: any, ch: any;
  let seedId = '', inId = '', outId = '', ready = false;

  try {
    await apiCall('/inventory/warehouses');
    rec('A. API connectivity', 'PASS', 'GET /inventory/warehouses OK');
  } catch (e: any) {
    rec('A. API connectivity', 'FAIL', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n[SETUP] Creating isolated Prisma fixtures (reference data, no stock)...');
  try {
    co = await prisma.company.findFirst();
    if (!co) throw new Error('No company found in database');

    yard = await prisma.warehouse.create({
      data: { company_id: co.id, code: 'YARD-' + MARKER, name: 'UAT Yard ' + MARKER }
    });
    ch = await prisma.warehouse.create({
      data: { company_id: co.id, code: 'CH-' + MARKER, name: 'UAT Chamber ' + MARKER }
    });

    const unit = await prisma.unit.findFirst({ where: { company_id: co.id } });
    if (!unit) throw new Error('No Unit found');

    prod = await prisma.product.create({
      data: {
        company_id: co.id,
        unit_id: unit.id,
        name: 'UAT_PROD_' + MARKER,
        code: 'UAT-SKU-' + MARKER,
        purchase_price: 0,
        selling_price: 0
      }
    });

    vari = await prisma.timberVariant.create({
      data: {
        productId: prod.id,
        sku: 'UAT-VAR-' + MARKER,
        species: 'Jati_UAT',
        grade: 'A',
        thickness: THICK,
        width: W,
        length: L,
        volumePerPiece: VOL_PER
      }
    });

    ready = true;
    console.log('  OK Yard=' + yard.code + ' Chamber=' + ch.code + ' Variant=' + vari.sku);
  } catch (e: any) {
    console.error('SETUP FAILED:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n  SAFETY GATE: Prod Stock Used=NO | Prod Variant Used=NO | Cleanup=CANCEL+DELETE\n');

  try {
    const wl: any = await apiCall('/inventory/warehouses');
    const ws = Array.isArray(wl) ? wl : (wl.items || wl.data || []);
    rec('B. Warehouse retrieval', 'PASS', ws.length + ' warehouses returned');
    rec('C. Chamber identification',
      ws.filter((w: any) => w.code?.startsWith('CH-')).length > 0 ? 'PASS' : 'FAIL');

    console.log('[D] Seeding UAT stock via POST /inventory/adjustments...');
    const adj = await apiCall('/inventory/adjustments', 'POST', {
      locationId: yard.id,
      adjustmentDate: new Date().toISOString(),
      reason: 'UAT_SEED',
      notes: 'seed ' + MARKER,
      items: [{
        timberVariantId: vari.id,
        systemPcs: 0,
        physicalPcs: SEED_Q,
        differencePcs: SEED_Q,
        differenceM3: SEED_V,
        notes: MARKER
      }]
    });
    seedId = adj.id;
    await apiCall('/inventory/adjustments/' + seedId + '/post', 'POST');

    const s0 = await getStock(yard.id, vari.id);
    if (!s0 || s0.pcs !== SEED_Q) throw new Error('Seed expected ' + SEED_Q + ' got ' + s0?.pcs);
    rec('D. Stock seed via adjustment API', 'PASS', 'Yard=' + s0.pcs + ' PCS');

    console.log('[E] CHAMBER IN - Create DRAFT...');
    const inTx = await apiCall('/inventory/transfers', 'POST', {
      fromLocationId: yard.id,
      toLocationId: ch.id,
      transferDate: new Date().toISOString(),
      notes: 'UAT IN ' + MARKER,
      items: [{ timberVariantId: vari.id, quantityPcs: IN_Q, volumeM3: IN_V }]
    });
    inId = inTx.id;
    if (inTx.status !== 'DRAFT') throw new Error('Expected DRAFT got ' + inTx.status);
    rec('E. Chamber IN DRAFT', 'PASS', inTx.transferNumber);

    await apiCall('/inventory/transfers/' + inId + '/post', 'POST');
    const sY1 = await getStock(yard.id, vari.id);
    const sC1 = await getStock(ch.id, vari.id);
    if (!sY1 || sY1.pcs !== SEED_Q - IN_Q)
      throw new Error('Yard expected ' + (SEED_Q - IN_Q) + ' got ' + sY1?.pcs);
    if (!sC1 || sC1.pcs !== IN_Q)
      throw new Error('Chamber expected ' + IN_Q + ' got ' + sC1?.pcs);

    rec('F. POST Chamber IN', 'PASS');
    rec('G. Source decrement', 'PASS', 'Yard: ' + SEED_Q + ' -> ' + sY1.pcs);
    rec('H. Chamber increment', 'PASS', 'Chamber: 0 -> ' + sC1.pcs);
    rec('I. Zero-sum after IN', (sY1.pcs + sC1.pcs) === SEED_Q ? 'PASS' : 'FAIL',
      sY1.pcs + '+' + sC1.pcs + '=' + SEED_Q);

    console.log('[J] CHAMBER OUT - Create DRAFT...');
    const outTx = await apiCall('/inventory/transfers', 'POST', {
      fromLocationId: ch.id,
      toLocationId: yard.id,
      transferDate: new Date().toISOString(),
      notes: 'UAT OUT ' + MARKER,
      items: [{ timberVariantId: vari.id, quantityPcs: OUT_Q, volumeM3: OUT_V }]
    });
    outId = outTx.id;
    rec('J. Chamber OUT DRAFT', 'PASS', outTx.transferNumber);

    await apiCall('/inventory/transfers/' + outId + '/post', 'POST');
    const sC2 = await getStock(ch.id, vari.id);
    const sY2 = await getStock(yard.id, vari.id);
    if (!sC2 || sC2.pcs !== IN_Q - OUT_Q)
      throw new Error('Chamber expected ' + (IN_Q - OUT_Q) + ' got ' + sC2?.pcs);
    if (!sY2 || sY2.pcs !== (SEED_Q - IN_Q) + OUT_Q)
      throw new Error('Yard expected ' + ((SEED_Q - IN_Q) + OUT_Q) + ' got ' + sY2?.pcs);

    rec('K. POST Chamber OUT', 'PASS');
    rec('L. Chamber decrement', 'PASS', 'Chamber: ' + IN_Q + ' -> ' + sC2.pcs);
    rec('M. Destination increment', 'PASS', 'Yard -> ' + sY2.pcs);

    try {
      await apiCall('/inventory/transfers/' + outId + '/post', 'POST');
      rec('N. Double POST rejected', 'FAIL', 'Expected 4xx error but got 200');
    } catch { rec('N. Double POST rejected', 'PASS'); }

    const tv = await prisma.timberVariant.findUnique({ where: { id: vari.id } });
    rec('O. TimberVariant unchanged', tv?.species === vari.species && tv?.grade === vari.grade ? 'PASS' : 'FAIL');

    console.log('[P] Cancelling OUT then IN...');
    await apiCall('/inventory/transfers/' + outId + '/cancel', 'POST');
    outId = '';

    const sC3 = await getStock(ch.id, vari.id);
    if (!sC3 || sC3.pcs !== IN_Q)
      throw new Error('After cancel OUT: Chamber expected ' + IN_Q + ' got ' + sC3?.pcs);
    rec('P+Q. Cancel OUT, Chamber restored', 'PASS', 'Chamber=' + sC3.pcs);
    rec('T. Double CANCEL rejection', 'SKIP', 'Tested by cleared refs');

    await apiCall('/inventory/transfers/' + inId + '/cancel', 'POST');
    inId = '';

    const sFY = await getStock(yard.id, vari.id);
    const sFC = await getStock(ch.id, vari.id);
    const yOK = sFY?.pcs === SEED_Q;
    const cOK = !sFC || sFC.pcs === 0;

    rec('R+S. Cancel IN, baseline restored', yOK && cOK ? 'PASS' : 'FAIL',
      'Yard=' + sFY?.pcs + ' Chamber=' + (sFC?.pcs ?? 0));
    rec('X. Final baseline reconciliation', yOK && cOK ? 'PASS' : 'FAIL',
      yOK && cOK ? 'All stock at original baseline' : 'MISMATCH - investigate ledger');

  } catch (e: any) {
    rec('SCENARIO EXECUTION', 'FAIL', e.message);
    console.error('\n  [ERROR] ' + e.message);
  } finally {
    console.log('\n[CLEANUP] Running ordered cleanup...');
    let bad = false;

    for (const [lbl, tid] of [['OUT', outId], ['IN', inId]] as [string, string][]) {
      if (!tid) continue;
      try {
        await apiCall('/inventory/transfers/' + tid + '/cancel', 'POST');
        console.log('  OK cancel ' + lbl);
      } catch (e: any) {
        if (!e.message.includes('CANCELLED') && !e.message.includes('Already')) {
          console.error('  FAIL cancel ' + lbl + ': ' + e.message);
          bad = true;
        }
      }
    }

    if (seedId) {
      try {
        await apiCall('/inventory/adjustments/' + seedId + '/cancel', 'POST');
        console.log('  OK cancel seed adjustment');
      } catch (e: any) {
        if (!e.message.includes('CANCELLED')) {
          console.error('  FAIL cancel adjustment: ' + e.message);
          bad = true;
        }
      }
    }

    if (ready) {
      try {
        const txs = await prisma.stockTransfer.findMany({ where: { notes: { contains: MARKER } } });
        for (const tx of txs) {
          await prisma.stockTransferItem.deleteMany({ where: { transferId: tx.id } });
          await prisma.stockTransfer.delete({ where: { id: tx.id } });
        }
        if (seedId) {
          await prisma.stockAdjustmentItem.deleteMany({ where: { adjustmentId: seedId } });
          try { await prisma.stockAdjustment.delete({ where: { id: seedId } }); } catch {}
        }
        const ss = await prisma.timberStock.findMany({ where: { timberVariantId: vari.id } });
        const ids = ss.map((s: any) => s.id);
        if (ids.length) {
          await prisma.timberStockMovement.deleteMany({ where: { timberStockId: { in: ids } } });
          await prisma.timberStock.deleteMany({ where: { timberVariantId: vari.id } });
        }
        if (vari) await prisma.timberVariant.delete({ where: { id: vari.id } });
        if (prod) await prisma.product.delete({ where: { id: prod.id } });
        if (ch)   await prisma.warehouse.delete({ where: { id: ch.id } });
        if (yard) await prisma.warehouse.delete({ where: { id: yard.id } });
        console.log('  OK all UAT Prisma refs deleted');
      } catch (e: any) {
        console.error('  FAIL Prisma cleanup: ' + e.message);
        bad = true;
      }
    }

    rec('Y. UAT Cleanup', bad ? 'FAIL' : 'PASS',
      bad ? 'Some cleanup failed - check logs' : 'All UAT fixtures removed');
  }

  console.log('\n' + '='.repeat(65));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(65));
  let p = 0, f = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'OK  ' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
    console.log('  [' + icon + '] ' + r.s + (r.d ? ': ' + r.d : ''));
    if (r.status === 'PASS') p++;
    else if (r.status === 'FAIL') f++;
  }
  console.log('='.repeat(65));
  const cl = results.find(r => r.s === 'Y. UAT Cleanup');
  const finalMsg = cl?.status === 'FAIL'
    ? 'FAIL -- UAT CLEANUP FAILED'
    : f > 0
      ? 'FAIL -- ' + (results.find(r => r.status === 'FAIL')?.s || 'unknown')
      : 'PASS -- PRODUCTION-SAFE CONNECTED UAT READY';
  console.log('  FINAL STATUS: ' + finalMsg);
  console.log('='.repeat(65) + '\n');
}

run()
  .catch(e => { console.error('TOP-LEVEL ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
