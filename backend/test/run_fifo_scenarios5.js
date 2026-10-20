const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { PrismaClient } = require('@prisma/client');
const { createFifoLayer, consumeFifoLayers, transferFifoLayers } = require('../dist/src/inventory/fifo.engine');

async function runAll() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_test?');
  
  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();
  
  const results = {};

  try {
    try { await prisma.$runCommandRaw({ create: 'JournalEntry' }); } catch(e){}
    await prisma.$runCommandRaw({
      createIndexes: 'JournalEntry',
      indexes: [{ key: { idempotency_key: 1 }, name: 'idempotency_key_1', unique: true }]
    });
    const idx = await prisma.$runCommandRaw({ listIndexes: 'JournalEntry' });
    const hasUnique = idx.cursor.firstBatch.some(i => i.key.idempotency_key === 1 && i.unique);
    results.INDEX_VERIFICATION = hasUnique ? 'PASS' : 'FAIL';

    const c1 = '600000000000000000000001'; const c2 = '600000000000000000000002';
    const p1 = '600000000000000000000011'; const p2 = '600000000000000000000012';
    const w1 = '600000000000000000000021'; const w2 = '600000000000000000000022';
    const u1 = '600000000000000000000031';
    const cat1 = '600000000000000000000041';
    
    await prisma.company.createMany({ data: [{ id: c1, name: 'FIFO_RUNTIME_TEST_COMPANY' }, { id: c2, name: 'OTHER_COMPANY' }] });
    await prisma.unit.createMany({ data: [{ id: u1, company_id: c1, code: 'PCS', name: 'PCS' }] });
    await prisma.category.createMany({ data: [{ id: cat1, company_id: c1, code: 'CAT', name: 'CAT' }] });
    await prisma.product.createMany({ data: [{ id: p1, company_id: c1, name: 'Prod1', purchase_price: 50000, unit_id: u1, category_id: cat1, code: 'P1' }] });
    await prisma.warehouse.createMany({ data: [{ id: w1, company_id: c1, code: 'W1', name: 'WH1' }, { id: w2, company_id: c1, code: 'W2', name: 'WH2' }] });
    await prisma.warehouseStock.createMany({ data: [
      { company_id: c1, warehouse_id: w1, product_id: p1, current_stock: 0, available_stock: 0 },
      { company_id: c1, warehouse_id: w2, product_id: p1, current_stock: 0, available_stock: 0 }
    ]});

    async function reset() {
      await prisma.inventoryCostLayer.deleteMany({});
      await prisma.costLayerConsumption.deleteMany({});
      await prisma.stockMovement.deleteMany({});
      await prisma.warehouseStock.updateMany({ data: { current_stock: 0, available_stock: 0 }});
    }

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'A1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'A2', movement_type: 'OUT', qty_in: 0, qty_out: 30, balance_after: 70, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      const { totalCogs } = await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 30, stockMovementId: m2.id });
      results.A_SIMPLE_FIFO = (totalCogs === 300000) ? 'PASS' : 'FAIL';
    });

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'B1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'B2', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 200, unit_cost: 12000, total_cost: 1200000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 12000, stockMovementId: m2.id });
      const m3 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'B3', movement_type: 'OUT', qty_in: 0, qty_out: 150, balance_after: 50, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      const { totalCogs } = await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 150, stockMovementId: m3.id });
      const layers = await tx.inventoryCostLayer.findMany({ orderBy: { created_at: 'asc' }});
      if (totalCogs === 1600000 && layers[0].remaining_quantity === 0 && layers[1].remaining_quantity === 50) results.B_MULTI_LAYER = 'PASS';
      else results.B_MULTI_LAYER = 'FAIL';
    });

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'C1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'C2', movement_type: 'OUT', qty_in: 0, qty_out: 100, balance_after: 0, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      const { totalCogs } = await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, stockMovementId: m2.id });
      const layers = await tx.inventoryCostLayer.findMany();
      results.C_EXACT_DEPLETION = (totalCogs === 1000000 && layers[0].remaining_quantity === 0) ? 'PASS' : 'FAIL';
    });

    await reset();
    try {
      await prisma.$transaction(async tx => {
        const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'D1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
        await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
        const mOut = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'D2', movement_type: 'OUT', qty_in: 0, qty_out: 101, balance_after: -1, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
        await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 101, stockMovementId: mOut.id });
      });
      results.D_INSUFFICIENT = 'FAIL';
    } catch(e) {
      const layers = await prisma.inventoryCostLayer.findMany();
      results.D_INSUFFICIENT = (layers.length === 0) ? 'PASS' : 'FAIL_ROLLBACK_FAILED';
    }

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'E1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'E2', movement_type: 'OUT', qty_in: 0, qty_out: 40, balance_after: 60, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 40, stockMovementId: m2.id });
      const layers = await tx.inventoryCostLayer.findMany();
      results.E_PARTIAL_CONSUMPTION = (layers.length === 1 && layers[0].remaining_quantity === 60) ? 'PASS' : 'FAIL';
    });

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'F1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'F2', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 200, unit_cost: 12000, total_cost: 1200000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 12000, stockMovementId: m2.id });
      const mOut = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'TRANSFER', transaction_id: 'F3', movement_type: 'TRANSFER_OUT', qty_in: 0, qty_out: 150, balance_after: 50, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      const mIn = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w2, product_id: p1, transaction_type: 'TRANSFER', transaction_id: 'F3', movement_type: 'TRANSFER_IN', qty_in: 150, qty_out: 0, balance_after: 150, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      const { totalCogs } = await transferFifoLayers(tx, { companyId: c1, productId: p1, sourceWarehouseId: w1, destWarehouseId: w2, quantity: 150, sourceMovementId: mOut.id, destMovementId: mIn.id });
      const destLayers = await tx.inventoryCostLayer.findMany({ where: { warehouse_id: w2 }, orderBy: { created_at: 'asc' }});
      if (totalCogs === 1600000 && destLayers.length === 2 && destLayers[0].unit_cost === 10000 && destLayers[1].unit_cost === 12000 && destLayers[1].original_quantity === 50) results.F_TRANSFER = 'PASS';
      else results.F_TRANSFER = 'FAIL';
    });

    await reset();
    const mCon1 = await prisma.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'K1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
    await prisma.inventoryCostLayer.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, unit_cost: 10000, quantity: 100, remaining_quantity: 100, original_quantity: 100, source_movement_id: mCon1.id }});

    const tx1 = prisma.$transaction(async tx => {
      const mOut = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'K2', movement_type: 'OUT', qty_in: 0, qty_out: 80, balance_after: 20, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      return await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 80, stockMovementId: mOut.id });
    });
    const tx2 = prisma.$transaction(async tx => {
      const mOut = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'K3', movement_type: 'OUT', qty_in: 0, qty_out: 80, balance_after: 20, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      return await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 80, stockMovementId: mOut.id });
    });
    
    const pRes = await Promise.allSettled([tx1, tx2]);
    const passedCount = pRes.filter(r => r.status === 'fulfilled').length;
    const failedCount = pRes.filter(r => r.status === 'rejected').length;
    const finalLayer = await prisma.inventoryCostLayer.findFirst();
    if (passedCount === 1 && failedCount === 1 && finalLayer.remaining_quantity === 20) results.K_CONCURRENT = 'PASS';
    else results.K_CONCURRENT = `FAIL (${passedCount} passed)`;

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: 'U1', movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: 'SYS' }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'OUT', transaction_id: 'U2', movement_type: 'OUT', qty_in: 0, qty_out: 30, balance_after: 70, unit_cost: 0, total_cost: 0, created_by: 'SYS' }});
      const { totalCogs } = await consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 30, stockMovementId: m2.id });
      results.U_PRODUCT_PRICE_INDEPENDENCE = (totalCogs === 300000) ? 'PASS' : 'FAIL';
    });

  } catch (e) {
    results.GLOBAL_ERROR = e.message;
  }

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  await replSet.stop();
}

runAll();
