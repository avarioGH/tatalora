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
    const c1 = '600000000000000000000001'; 
    const p1 = '600000000000000000000011';
    const w1 = '600000000000000000000021'; const w2 = '600000000000000000000022';
    const tF1 = '600000000000000000000151'; const tF2 = '600000000000000000000152'; const tF3 = '600000000000000000000153';
    const sys = '600000000000000000000999';

    async function reset() {
      await prisma.inventoryCostLayer.deleteMany({});
      await prisma.costLayerConsumption.deleteMany({});
      await prisma.stockMovement.deleteMany({});
    }

    await reset();
    await prisma.$transaction(async tx => {
      const m1 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: tF1, movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 100, unit_cost: 10000, total_cost: 1000000, created_by: sys }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 10000, stockMovementId: m1.id });
      const m2 = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'IN', transaction_id: tF2, movement_type: 'IN', qty_in: 100, qty_out: 0, balance_after: 200, unit_cost: 12000, total_cost: 1200000, created_by: sys }});
      await createFifoLayer(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, unitCost: 12000, stockMovementId: m2.id });
      const mOut = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, transaction_type: 'TRANSFER', transaction_id: tF3, movement_type: 'TRANSFER_OUT', qty_in: 0, qty_out: 150, balance_after: 50, unit_cost: 0, total_cost: 0, created_by: sys }});
      const mIn = await tx.stockMovement.create({ data: { company_id: c1, warehouse_id: w2, product_id: p1, transaction_type: 'TRANSFER', transaction_id: tF3, movement_type: 'TRANSFER_IN', qty_in: 150, qty_out: 0, balance_after: 150, unit_cost: 0, total_cost: 0, created_by: sys }});
      
      const res = await transferFifoLayers(tx, { companyId: c1, productId: p1, sourceWarehouseId: w1, destWarehouseId: w2, quantity: 150, sourceMovementId: mOut.id, destMovementId: mIn.id });
      results.TRANSFER_RES = res;
      const destLayers = await tx.inventoryCostLayer.findMany({ where: { warehouse_id: w2 }, orderBy: { created_at: 'asc' }});
      results.DEST_LAYERS = destLayers.length;
    });

  } catch (e) {
    results.GLOBAL_ERROR = e.message;
  }
  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  await replSet.stop();
}
runAll();
