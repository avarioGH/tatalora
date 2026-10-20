const fs = require('fs');

const code = `
import { PrismaClient } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { InventoryService } from './src/inventory/inventory.service';
import { DeliveryService } from './src/crm/delivery/delivery.service';
import { PosService } from './src/pos/pos.service';
import { MoService } from './src/manufacturing/mo/mo.service';
import { GlService } from './src/gl/gl.service';
import { AccountingListener } from './src/accounting/accounting.listener';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { consumeFifoLayers, transferFifoLayers } from './src/inventory/fifo.engine';
import { Decimal } from '@prisma/client/runtime/library';

async function run() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.DATABASE_URL = replSet.getUri() + 'erp_final?replicaSet=testset';
  
  const prisma = new PrismaClient();
  await prisma.$connect();
  
  // Seed basic system
  const c1 = '600000000000000000000001';
  const c2 = '600000000000000000000002'; // Company B for O
  const sys = '000000000000000000000999';
  const p1 = '600000000000000000000011';
  const w1 = '600000000000000000000021';
  const w2 = '600000000000000000000022';
  
  await prisma.user.create({ data: { id: sys, email: 'sys@local', name: 'SYSTEM', password_hash: 'x', company_id: c1 } });
  await prisma.company.createMany({ data: [
    { id: c1, name: 'Company A' },
    { id: c2, name: 'Company B' }
  ]});
  const at = '600000000000000000000100';
  await prisma.accountType.create({ data: { id: at, company_id: c1, name: 'Asset', normal_balance: 'DEBIT' } });
  await prisma.accountType.create({ data: { id: '600000000000000000000100_B', company_id: c2, name: 'Asset', normal_balance: 'DEBIT' } });
  
  await prisma.chartOfAccount.createMany({ data: [
    { id: '600000000000000000000101', company_id: c1, account_code: '1300', account_name: 'Inventory Asset', account_type_id: at },
    { id: '600000000000000000000105', company_id: c1, account_code: '1400', account_name: 'WIP', account_type_id: at },
    { id: '600000000000000000000102', company_id: c1, account_code: '5000', account_name: 'COGS', account_type_id: at },
    { id: '600000000000000000000103', company_id: c1, account_code: '4000', account_name: 'Sales Revenue', account_type_id: at },
    { id: '600000000000000000000104', company_id: c1, account_code: '1000', account_name: 'Cash', account_type_id: at },
    
    // Seed Company B Accounts
    { id: '600000000000000000000201', company_id: c2, account_code: '1300', account_name: 'Inventory Asset', account_type_id: '600000000000000000000100_B' },
    { id: '600000000000000000000202', company_id: c2, account_code: '5000', account_name: 'COGS', account_type_id: '600000000000000000000100_B' }
  ]});
  
  await prisma.product.createMany({ data: [
    { id: p1, company_id: c1, name: 'Prod1', type: 'GOODS', purchase_price: 50000 },
    { id: p1.replace('1','2'), company_id: c2, name: 'Prod1_B', type: 'GOODS', purchase_price: 50000 }
  ]});
  
  await prisma.warehouse.createMany({ data: [
    { id: w1, company_id: c1, name: 'Main A' },
    { id: w2, company_id: c1, name: 'Sub A' },
    { id: w1.replace('1','2'), company_id: c2, name: 'Main B' }
  ]});
  
  await prisma.accountingPeriod.createMany({ data: [
    { id: '600000000000000000000901', company_id: c1, name: 'Open Period', start_date: new Date('2020-01-01'), end_date: new Date('2030-01-01'), status: 'OPEN' },
    { id: '600000000000000000000902', company_id: c2, name: 'Open Period B', start_date: new Date('2020-01-01'), end_date: new Date('2030-01-01'), status: 'OPEN' }
  ]});
  
  const eventEmitter = new EventEmitter2();
  const glService = new GlService(prisma);
  const accountingListener = new AccountingListener(glService, prisma);
  eventEmitter.on('sales.completed', (evt) => accountingListener.handleSalesCompleted(evt));
  eventEmitter.on('inventory.valuation', (evt) => accountingListener.handleInventoryValuation(evt));
  
  const inventoryService = new InventoryService(prisma, eventEmitter);
  const deliveryService = new DeliveryService(prisma, eventEmitter);
  const posService = new PosService(prisma, eventEmitter);
  const moService = new MoService(prisma, eventEmitter);
  
  const results = {};
  
  const resetDB = async (skipCompanyB = false) => {
    await prisma.journalEntryLine.deleteMany({});
    await prisma.journalEntry.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.inventoryCostLayer.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
    await prisma.deliveryOrder.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.manufacturingOrder.deleteMany({});
    await prisma.accountingPeriod.updateMany({ data: { status: 'OPEN' } });
  };
  
  const seedLayers = async (comp = c1, prod = p1, wh = w1) => {
    await prisma.warehouseStock.create({ data: { company_id: comp, warehouse_id: wh, product_id: prod, current_stock: 200, available_stock: 200 } });
    await prisma.inventoryCostLayer.create({ data: { company_id: comp, warehouse_id: wh, product_id: prod, quantity: 100, remaining_quantity: 100, unit_cost: 10000, total_cost: 1000000, layer_date: new Date('2024-01-01') }});
    await prisma.inventoryCostLayer.create({ data: { company_id: comp, warehouse_id: wh, product_id: prod, quantity: 100, remaining_quantity: 100, unit_cost: 12000, total_cost: 1200000, layer_date: new Date('2024-01-02') }});
  };

  const verifyPass = (scenario, desc, evidence) => { results[scenario] = { status: 'RUNTIME VERIFIED', runtime: desc, evidence }; };
  const verifyFail = (scenario, desc, failmsg) => { results[scenario] = { status: 'FAILED', runtime: desc, evidence: failmsg }; };

  // ====================
  // REGRESSION A-F + U
  // ====================
  
  try {
    await resetDB(); await seedLayers();
    const { totalCogs } = await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 100, stockMovementId: 'sm_A' }));
    if (totalCogs === 1000000) verifyPass('A', 'consumeFifoLayers(100)', 'totalCogs = 1000000');
    else verifyFail('A', 'consumeFifoLayers(100)', 'totalCogs = ' + totalCogs);
  } catch(e) { verifyFail('A', 'consumeFifoLayers', e.message); }

  try {
    await resetDB(); await seedLayers();
    const { totalCogs } = await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 150, stockMovementId: 'sm_B' }));
    if (totalCogs === 1600000) verifyPass('B', 'consumeFifoLayers(150)', 'totalCogs = 1600000');
    else verifyFail('B', 'consumeFifoLayers(150)', 'totalCogs = ' + totalCogs);
  } catch(e) { verifyFail('B', 'consumeFifoLayers', e.message); }

  try {
    await resetDB(); await seedLayers();
    await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 200, stockMovementId: 'sm_C' }));
    const count = await prisma.inventoryCostLayer.count({ where: { remaining_quantity: { gt: 0 } } });
    if (count === 0) verifyPass('C', 'consumeFifoLayers(200)', '0 remaining layers');
    else verifyFail('C', 'consumeFifoLayers(200)', count + ' remaining layers');
  } catch(e) { verifyFail('C', 'consumeFifoLayers', e.message); }

  try {
    await resetDB(); await seedLayers();
    let threw = false;
    try {
      await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 300, stockMovementId: 'sm_D' }));
    } catch(e) { threw = true; }
    const totalRem = (await prisma.inventoryCostLayer.findMany()).reduce((acc, l) => acc + Number(l.remaining_quantity), 0);
    if (threw && totalRem === 200) verifyPass('D', 'consumeFifoLayers(300)', 'Threw error, layers intact');
    else verifyFail('D', 'consumeFifoLayers(300)', \`threw: \${threw}, totalRem: \${totalRem}\`);
  } catch(e) { verifyFail('D', 'consumeFifoLayers', e.message); }

  try {
    await resetDB(); await seedLayers();
    await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 50, stockMovementId: 'sm_E' }));
    const layer = await prisma.inventoryCostLayer.findFirst({ orderBy: { layer_date: 'asc' } });
    if (layer.remaining_quantity === 50) verifyPass('E', 'consumeFifoLayers(50)', 'First layer rem: 50');
    else verifyFail('E', 'consumeFifoLayers(50)', 'First layer rem: ' + layer.remaining_quantity);
  } catch(e) { verifyFail('E', 'consumeFifoLayers', e.message); }

  try {
    await resetDB(); await seedLayers();
    await prisma.$transaction(tx => transferFifoLayers(tx, { companyId: c1, productId: p1, sourceWarehouseId: w1, destWarehouseId: w2, quantity: 150, sourceMovementId: 's1', destMovementId: 's2' }));
    const w2Layers = await prisma.inventoryCostLayer.findMany({ where: { warehouse_id: w2 }, orderBy: { layer_date: 'asc' }});
    if (w2Layers.length === 2 && w2Layers[0].quantity === 100 && w2Layers[1].quantity === 50) verifyPass('F', 'transferFifoLayers(150)', 'W2 layers: 100 and 50');
    else verifyFail('F', 'transferFifoLayers', 'W2 layers invalid');
  } catch(e) { verifyFail('F', 'transferFifoLayers', e.message); }
  
  try {
    await resetDB(); await seedLayers();
    const { totalCogs } = await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: 150, stockMovementId: 'sm_U' }));
    if (totalCogs === 1600000) verifyPass('U', 'Product.purchase_price independence', 'Product price=50k, COGS=1.6M');
    else verifyFail('U', 'Product.purchase_price', 'totalCogs = ' + totalCogs);
  } catch(e) { verifyFail('U', 'Product.purchase_price', e.message); }

  // G: Real Stock Transfer
  try {
    await resetDB(); await seedLayers();
    await inventoryService.createTransfer({ companyId: c1, sourceWarehouseId: w1, targetWarehouseId: w2, userId: sys, items: [{ productId: p1, qty: 150 }] });
    await new Promise(r => setTimeout(r, 100));
    const w2Layers = await prisma.inventoryCostLayer.findMany({ where: { warehouse_id: w2 }, orderBy: { layer_date: 'asc' }});
    const w1Layers = await prisma.inventoryCostLayer.findMany({ where: { warehouse_id: w1 }, orderBy: { layer_date: 'asc' }});
    
    if (w1Layers[0].remaining_quantity === 0 && w1Layers[1].remaining_quantity === 50 && w2Layers.length === 2 && w2Layers[0].quantity === 100 && w2Layers[1].quantity === 50) {
      verifyPass('G', 'InventoryService.createTransfer', 'Layers transferred properly without fallback');
    } else verifyFail('G', 'InventoryService.createTransfer', 'Invalid layer sizes');
  } catch(e) { verifyFail('G', 'InventoryService.createTransfer', e.message); }

  // H: Real Manufacturing
  try {
    await resetDB(); await seedLayers();
    await prisma.unit.create({ data: { id: 'u1', company_id: c1, name: 'Unit' } });
    const mo = await moService.createManufacturingOrder({ company_id: c1, order_number: 'MO-1', product_id: p1, warehouse_id: w1, unit_id: 'u1', planned_quantity: 10, items: [{ product_id: p1, required_quantity: 150, unit_id: 'u1' }] });
    await prisma.manufacturingOrder.update({ where: { id: mo.id }, data: { status: 'CONFIRMED' } });
    await moService.startProduction(c1, mo.id, sys);
    const mo2 = await prisma.manufacturingOrder.findFirst({ where: { id: mo.id }, include: { items: true } });
    await moService.consumeMaterials(c1, mo.id, [{ manufacturing_order_item_id: mo2.items[0].id, quantity: 150 }], sys);
    
    await new Promise(r => setTimeout(r, 100));
    const je = await prisma.journalEntry.findFirst({ where: { reference_type: 'MANUFACTURING_CONSUMPTION' }, include: { items: true }});
    const ws = await prisma.warehouseStock.findFirst({ where: { product_id: p1, warehouse_id: w1 }});
    
    if (je && je.items.length === 2 && ws.current_stock === 50) {
      
      // Insufficient case
      let threw = false;
      try { await moService.consumeMaterials(c1, mo.id, [{ manufacturing_order_item_id: mo2.items[0].id, quantity: 100 }], sys); } catch(e){ threw = true; }
      
      if (threw && (await prisma.warehouseStock.findFirst({ where: { product_id: p1, warehouse_id: w1 }})).current_stock === 50) {
         verifyPass('H', 'MoService.consumeMaterials', 'WIP JE created. Insufficient rollback verified');
      } else verifyFail('H', 'MoService.consumeMaterials', 'Insufficient rollback failed');
      
    } else verifyFail('H', 'MoService.consumeMaterials', 'WIP JE missing or stock not 50');
  } catch(e) { verifyFail('H', 'MoService.consumeMaterials', e.message); }

  // I: Real Delivery COGS
  try {
    await resetDB(); await seedLayers();
    const so = await prisma.salesOrder.create({ data: { company_id: c1, customer_id: sys, order_number: 'SO-1', order_date: new Date(), status: 'Draft', total_amount: 0, items: { create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 150 }] } } });
    const del = await deliveryService.create(c1, so.id, { date: new Date(), warehouseId: w1, items: [{ productId: p1, delivered_qty: 150 }] });
    await deliveryService.validate(c1, del.id);
    
    await new Promise(r => setTimeout(r, 100));
    const je = await prisma.journalEntry.findFirst({ where: { reference_type: 'COGS' }, include: { items: true } });
    if (je && je.items.find(l => l.debit === 1600000) && je.items.find(l => l.credit === 1600000)) {
      verifyPass('I', 'DeliveryService.validate', 'COGS JE 1,600,000 persisted');
    } else verifyFail('I', 'DeliveryService.validate', 'Missing or invalid JE');
  } catch(e) { verifyFail('I', 'DeliveryService.validate', e.message); }

  // J: Real POS
  try {
    await resetDB(); await seedLayers();
    await posService.processCheckout({ companyId: c1, userId: sys, warehouseId: w1, items: [{ productId: p1, qty: 30, price: 100000 }] });
    await new Promise(r => setTimeout(r, 100));
    const jes = await prisma.journalEntry.findMany({ include: { items: true }});
    const hasCOGS = jes.some(j => j.items.some(l => l.debit === 300000) && j.items.some(l => l.credit === 300000));
    if (hasCOGS) verifyPass('J', 'PosService.processCheckout', 'POS COGS JE 300,000 persisted');
    else verifyFail('J', 'PosService.processCheckout', 'POS COGS JE missing');
  } catch(e) { verifyFail('J', 'PosService.processCheckout', e.message); }

  // K: Concurrency
  try {
    await resetDB(); await seedLayers();
    const so1 = await prisma.salesOrder.create({ data: { company_id: c1, customer_id: sys, order_number: 'SO-C1', order_date: new Date(), status: 'Draft', total_amount: 0, items: { create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 150 }] } } });
    const so2 = await prisma.salesOrder.create({ data: { company_id: c1, customer_id: sys, order_number: 'SO-C2', order_date: new Date(), status: 'Draft', total_amount: 0, items: { create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 150 }] } } });
    const del1 = await deliveryService.create(c1, so1.id, { date: new Date(), warehouseId: w1, items: [{ productId: p1, delivered_qty: 150 }] });
    const del2 = await deliveryService.create(c1, so2.id, { date: new Date(), warehouseId: w1, items: [{ productId: p1, delivered_qty: 150 }] });
    
    const p = await Promise.allSettled([ deliveryService.validate(c1, del1.id), deliveryService.validate(c1, del2.id) ]);
    const successCount = p.filter(x => x.status === 'fulfilled').length;
    
    const ws = await prisma.warehouseStock.findFirst({ where: { product_id: p1, warehouse_id: w1 }});
    if (successCount === 1 && ws.current_stock === 50) verifyPass('K', 'Promise.all(validate, validate)', '1 success, 1 conflict, stock=50. Mechanism: Prisma updateMany OCC');
    else verifyFail('K', 'Concurrency', \`successCount: \${successCount}, stock: \${ws.current_stock}\`);
  } catch(e) { verifyFail('K', 'Concurrency', e.message); }

  // O: Tenant Isolation
  try {
    await resetDB(); await seedLayers(c1, p1, w1); await seedLayers(c2, p1.replace('1','2'), w1.replace('1','2'));
    await posService.processCheckout({ companyId: c1, userId: sys, warehouseId: w1, items: [{ productId: p1, qty: 50, price: 100000 }] });
    await new Promise(r => setTimeout(r, 100));
    
    const wsB = await prisma.warehouseStock.findFirst({ where: { company_id: c2 }});
    const cogsB = await prisma.journalEntry.count({ where: { company_id: c2 }});
    let xTenantRejection = false;
    try {
      await posService.processCheckout({ companyId: c2, userId: sys, warehouseId: w1, items: [{ productId: p1.replace('1','2'), qty: 50, price: 100000 }] });
    } catch(e) { xTenantRejection = true; } // Warehouse w1 belongs to c1, rejected or no stock found
    
    if (wsB.current_stock === 200 && cogsB === 0 && xTenantRejection) verifyPass('O', 'PosService.processCheckout(c1)', 'c2 unaffected, cross-tenant rejected');
    else verifyFail('O', 'PosService.processCheckout', 'c2 mutated or cross-tenant not rejected');
  } catch(e) { verifyFail('O', 'PosService', e.message); }

  // P: Warehouse Isolation
  try {
    await resetDB(); 
    await prisma.warehouseStock.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, current_stock: 100, available_stock: 100 } });
    await prisma.inventoryCostLayer.create({ data: { company_id: c1, warehouse_id: w1, product_id: p1, quantity: 100, remaining_quantity: 100, unit_cost: 10000, total_cost: 1000000, layer_date: new Date('2024-01-01') }});
    await prisma.warehouseStock.create({ data: { company_id: c1, warehouse_id: w2, product_id: p1, current_stock: 100, available_stock: 100 } });
    await prisma.inventoryCostLayer.create({ data: { company_id: c1, warehouse_id: w2, product_id: p1, quantity: 100, remaining_quantity: 100, unit_cost: 20000, total_cost: 2000000, layer_date: new Date('2024-01-01') }});
    
    await posService.processCheckout({ companyId: c1, userId: sys, warehouseId: w1, items: [{ productId: p1, qty: 50, price: 100000 }] });
    await new Promise(r => setTimeout(r, 100));
    
    const wsA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: w1 }});
    const wsB = await prisma.warehouseStock.findFirst({ where: { warehouse_id: w2 }});
    if (wsA.current_stock === 50 && wsB.current_stock === 100) verifyPass('P', 'PosService w1', 'w1=50, w2=100. Layers untouched in w2');
    else verifyFail('P', 'PosService', 'Warehouse isolation failed');
  } catch(e) { verifyFail('P', 'Warehouse Isolation', e.message); }

  // S: Invalid FIFO input
  try {
    await resetDB(); await seedLayers();
    let threw = false;
    try {
      await prisma.$transaction(tx => consumeFifoLayers(tx, { companyId: c1, productId: p1, warehouseId: w1, quantity: -50, stockMovementId: 's_inv' }));
    } catch (e) { threw = true; }
    
    const ws = await prisma.warehouseStock.findFirst({ where: { warehouse_id: w1 }});
    if (threw && ws.current_stock === 200) verifyPass('S', 'consumeFifoLayers(-50)', 'Rejected negative qty. DB pristine');
    else verifyFail('S', 'consumeFifoLayers', 'Failed to reject invalid input');
  } catch(e) { verifyFail('S', 'Invalid Input', e.message); }

  // T: Closed Period
  try {
    await resetDB(); await seedLayers();
    await prisma.accountingPeriod.updateMany({ data: { status: 'CLOSED' } });
    const so = await prisma.salesOrder.create({ data: { company_id: c1, customer_id: sys, order_number: 'SO-T', order_date: new Date(), status: 'Draft', total_amount: 0, items: { create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 150 }] } } });
    const del = await deliveryService.create(c1, so.id, { date: new Date(), warehouseId: w1, items: [{ productId: p1, delivered_qty: 150 }] });
    
    try { await deliveryService.validate(c1, del.id); } catch(e){}
    await new Promise(r => setTimeout(r, 100));
    
    const layers = await prisma.inventoryCostLayer.findMany({ orderBy: { layer_date: 'asc' }});
    if (layers[0].remaining_quantity === 100 && layers[1].remaining_quantity === 100) verifyPass('T', 'Delivery validate closed period', 'Rolled back layers');
    else verifyFail('T', 'Delivery validate closed period', 'Layers mutated');
  } catch(e) { verifyFail('T', 'Closed Period', e.message); }

  // V: FIFO INVENTORY VALUATION
  try {
    await resetDB(); await seedLayers();
    await posService.processCheckout({ companyId: c1, userId: sys, warehouseId: w1, items: [{ productId: p1, qty: 150, price: 100000 }] });
    await new Promise(r => setTimeout(r, 100));
    
    const layer = await prisma.inventoryCostLayer.findFirst({ where: { remaining_quantity: { gt: 0 } } });
    if (layer.remaining_quantity === 50 && layer.unit_cost === 12000 && layer.remaining_quantity * layer.unit_cost === 600000) {
       verifyPass('V', 'PosService.processCheckout', 'Remaining layer 50 @ 12k = 600k value');
    } else verifyFail('V', 'PosService', 'Invalid remaining valuation');
  } catch(e) { verifyFail('V', 'Inventory Valuation', e.message); }

  // W: FIFO TO GL BALANCE
  try {
    await resetDB(); await seedLayers();
    const so = await prisma.salesOrder.create({ data: { company_id: c1, customer_id: sys, order_number: 'SO-W', order_date: new Date(), status: 'Draft', total_amount: 0, items: { create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 150 }] } } });
    const del = await deliveryService.create(c1, so.id, { date: new Date(), warehouseId: w1, items: [{ productId: p1, delivered_qty: 150 }] });
    await deliveryService.validate(c1, del.id);
    await new Promise(r => setTimeout(r, 100));
    
    const je = await prisma.journalEntry.findFirst({ where: { reference_type: 'COGS' }, include: { items: true } });
    const debitItem = je.items.find(l => l.debit > 0);
    const creditItem = je.items.find(l => l.credit > 0);
    
    if (debitItem.debit === 1600000 && creditItem.credit === 1600000 && je.items.reduce((s,i)=>s+i.debit,0) === je.items.reduce((s,i)=>s+i.credit,0)) {
       verifyPass('W', 'DeliveryService.validate', 'GL balanced: FIFO COGS = Debit = Credit = 1.6M');
    } else verifyFail('W', 'DeliveryService.validate', 'GL unbalanced or mismatched');
  } catch(e) { verifyFail('W', 'GL Balance', e.message); }

  // X: Idempotency
  try {
    await resetDB(); await seedLayers();
    const so = await prisma.salesOrder.create({ data: { company_id: c1, customer_id: sys, order_number: 'SO-X', order_date: new Date(), status: 'Draft', total_amount: 0, items: { create: [{ product_id: p1, qty: 50, unit_price: 1, subtotal: 50 }] } } });
    const del = await deliveryService.create(c1, so.id, { date: new Date(), warehouseId: w1, items: [{ productId: p1, delivered_qty: 50 }] });
    
    await deliveryService.validate(c1, del.id);
    try { await deliveryService.validate(c1, del.id); } catch(e){} // Second call should throw BadRequest because status = DONE
    await new Promise(r => setTimeout(r, 100));
    
    const cogsJeCount = await prisma.journalEntry.count({ where: { reference_type: 'COGS' } });
    const ix = await prisma.$runCommandRaw({ listIndexes: "JournalEntry" });
    const hasIdx = ix.cursor.firstBatch.find(i => i.name.includes("idempotency_key"));
    
    if (cogsJeCount === 1 && hasIdx) verifyPass('X', 'DeliveryService.validate x2', '1 JE emitted. Unique Idempotency index verified.');
    else verifyFail('X', 'DeliveryService.validate x2', 'Multiple JEs or missing index');
  } catch(e) { verifyFail('X', 'Idempotency', e.message); }

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  await replSet.stop();
}

run().catch(e => { console.error(e); process.exit(1); });
`
fs.writeFileSync('test/final.certification.ts', code);
console.log('runner written');
