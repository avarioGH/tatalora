content = """import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let failed = false;
function verifyCondition(id: string, name: string, condition: boolean, note: string) {
  if (condition) {
    console.log(\    | [PASS] | \ - \);
  } else {
    console.log(\    | [FAIL] | \ - \);
    failed = true;
  }
}

async function run() {
  console.log('Starting MongoMemoryReplSet...');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.DATABASE_URL = mongod.getUri();

  console.log('Bootstrapping NestJS App...');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const prisma = app.get(PrismaService);
  const inventoryService = app.get(InventoryService);

  // Setup data
  const company = await prisma.company.create({ data: { name: 'Test Co', currency: 'IDR' } });
  const companyId = company.id;

  const role = await prisma.role.create({ data: { company_id: companyId, name: 'Admin', is_system: true } });
  const user = await prisma.user.create({ data: { company_id: companyId, role_id: role.id, name: 'Admin', username: 'admin', email: 'admin@test.com', password: 'hash', status: true } });
  const userId = user.id;

  const wa = await prisma.warehouse.create({ data: { company_id: companyId, code: 'WHA', name: 'Warehouse A', status: true } });
  const warehouseA = wa.id;

  const wb = await prisma.warehouse.create({ data: { company_id: companyId, code: 'WHB', name: 'Warehouse B', status: true } });
  const warehouseB = wb.id;

  const cat = await prisma.category.create({ data: { company_id: companyId, name: 'Cat', status: true } });
  const pa = await prisma.product.create({ data: { company_id: companyId, item_code: 'PRODA', name: 'Product A', category_id: cat.id, is_stock: true, status: true, can_sell: true, can_purchase: true, base_price: 100 } });
  const productA = pa.id;

  // Cleanup helper
  const reset = async () => {
    await prisma.costLayerConsumption.deleteMany({});
    await prisma.inventoryCostLayer.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
  };

  try {
    // T1. NORMAL GOODS RECEIPT
    await reset();
    await prisma.\(async (tx) => {
      await inventoryService.receiveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100, referenceType: 'GRN', referenceId: 'grn-1', userId });
    });
    let s = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA, product_id: productA } });
    verifyCondition('T1', 'NORMAL GOODS RECEIPT', !!(s && s.current_stock === 10 && s.available_stock === 10), 'Stock is 10');

    // T2. NORMAL DELIVERY
    await reset();
    await prisma.\(async (tx) => {
      await inventoryService.receiveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100, referenceType: 'GRN', referenceId: 'grn-1', userId });
      await inventoryService.issueStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 3, referenceType: 'DELIVERY', referenceId: 'del-1', userId });
    });
    s = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA, product_id: productA } });
    verifyCondition('T2', 'NORMAL DELIVERY', !!(s && s.current_stock === 7 && s.available_stock === 7), 'Stock is 7');

    // T3. NEGATIVE STOCK PREVENTED
    await reset();
    await prisma.\(async (tx) => {
      await inventoryService.receiveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 5, unitCost: 100, referenceType: 'GRN', referenceId: 'grn-1', userId });
    });
    try {
      await prisma.\(async (tx) => {
        await inventoryService.issueStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 6, referenceType: 'DELIVERY', referenceId: 'del-1', userId });
      });
      verifyCondition('T3', 'NEGATIVE STOCK PREVENTED', false, 'Allowed negative stock!');
    } catch (e) {
      s = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA, product_id: productA } });
      verifyCondition('T3', 'NEGATIVE STOCK PREVENTED', !!(s && s.current_stock === 5), 'Transaction rolled back successfully');
    }

    // T4. RESERVATION
    await reset();
    await prisma.\(async (tx) => {
      await inventoryService.receiveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100, referenceType: 'GRN', referenceId: 'grn-1', userId });
      await inventoryService.reserveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 7 });
    });
    s = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA, product_id: productA } });
    verifyCondition('T4', 'RESERVATION', !!(s && s.current_stock === 10 && s.reserved_stock === 7 && s.available_stock === 3), 'Reservation updated correctly');

    // T5. TRANSFER
    await reset();
    await prisma.\(async (tx) => {
      await inventoryService.receiveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100, referenceType: 'GRN', referenceId: 'grn-1', userId });
      await inventoryService.transferStock(tx as any, { companyId, sourceWarehouseId: warehouseA, targetWarehouseId: warehouseB, productId: productA, quantity: 4, referenceType: 'TRANSFER', referenceId: 'tr-1', userId });
    });
    let s1 = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA, product_id: productA } });
    let s2 = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseB, product_id: productA } });
    verifyCondition('T5', 'TRANSFER', !!(s1 && s1.current_stock === 6 && s2 && s2.current_stock === 4), 'Stock transferred successfully');

    // T6. CONCURRENT RESERVATION
    await reset();
    await prisma.\(async (tx) => {
      await inventoryService.receiveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100, referenceType: 'GRN', referenceId: 'grn-1', userId });
    });
    const res1 = prisma.\(async (tx) => inventoryService.reserveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 7 }));
    const res2 = prisma.\(async (tx) => inventoryService.reserveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 7 }));
    const results = await Promise.allSettled([res1, res2]);
    verifyCondition('T6', 'CONCURRENT RESERVATION', results.filter(r => r.status === 'fulfilled').length === 1, 'Only one reservation succeeded');

  } catch (e) {
    console.error('Fatal Error:', e);
    failed = true;
  }

  await app.close();
  await mongod.stop();
  process.exit(failed ? 1 : 0);
}

run();
"""

with open('test/step20e.ts', 'w') as f:
    f.write(content)
