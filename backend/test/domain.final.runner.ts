// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from 'eventemitter2';
import { GlService } from '../src/gl/gl.service';
import { AccountingListener } from '../src/accounting/accounting.listener';
import { PosService } from '../src/pos/pos.service';
import { DeliveryService } from '../src/crm/delivery/delivery.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { MoService } from '../src/manufacturing/mo/mo.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import {
  consumeFifoLayers,
  transferFifoLayers,
} from '../src/inventory/fifo.engine';

async function run() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_final?');

  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();

  const results: any = {};

  try {
    try {
      await prisma.$runCommandRaw({ create: 'JournalEntry' });
    } catch (e) {}
    const idxRes = await prisma.$runCommandRaw({
      createIndexes: 'JournalEntry',
      indexes: [
        {
          key: { idempotency_key: 1 },
          name: 'idempotency_key_1',
          unique: true,
        },
      ],
    });

    results.INDEX_VERIFY = await prisma.$runCommandRaw({
      listIndexes: 'JournalEntry',
    });

    const eventEmitter = new EventEmitter2();
    const glService = new GlService(prisma);
    const accountingListener = new AccountingListener(glService, prisma);

    eventEmitter.on('sales.completed', (evt) =>
      accountingListener.handleSalesCompleted(evt),
    );
    eventEmitter.on('inventory.valuation', (evt) =>
      accountingListener.handleInventoryValuation(evt),
    );

    eventEmitter.on('inventory.transfer', (evt) =>
      accountingListener.handleInventoryTransfer(evt),
    );
    eventEmitter.on('manufacturing.consumed', (evt) =>
      accountingListener.handleManufacturingConsumed(evt),
    );
    eventEmitter.on('manufacturing.produced', (evt) =>
      accountingListener.handleManufacturingProduced(evt),
    );

    const posService = new PosService(prisma, eventEmitter);
    const deliveryService = new DeliveryService(prisma, eventEmitter);
    const inventoryService = new InventoryService(prisma, eventEmitter);
    const moService = new MoService(prisma, eventEmitter);

    const c1 = '600000000000000000000001';
    const c2 = '600000000000000000000002';
    const p1 = '600000000000000000000011';
    const p2 = '600000000000000000000012';
    const w1 = '600000000000000000000021';
    const w2 = '600000000000000000000022';
    const u1 = '600000000000000000000031';
    const cat1 = '600000000000000000000041';
    const customer1 = '600000000000000000000051';
    const sys = '600000000000000000000999';
    const at = '600000000000000000000081';
    const bom = '600000000000000000000091';

    await prisma.company.createMany({
      data: [
        { id: c1, name: 'C1' },
        { id: c2, name: 'C2' },
      ],
    });
    await prisma.unit.createMany({
      data: [{ id: u1, company_id: c1, name: 'PCS' }],
    });
    await prisma.category.createMany({
      data: [{ id: cat1, company_id: c1, name: 'CAT' }],
    });
    await prisma.product.createMany({
      data: [
        {
          id: p1,
          company_id: c1,
          name: 'RAW1',
          code: 'R1',
          purchase_price: 50000,
          selling_price: 100000,
          unit_id: u1,
        },
        {
          id: p2,
          company_id: c1,
          name: 'FG1',
          code: 'FG1',
          purchase_price: 80000,
          selling_price: 200000,
          unit_id: u1,
        },
      ],
    });
    await prisma.warehouse.createMany({
      data: [
        { id: w1, company_id: c1, code: 'W1', name: 'WH1' },
        { id: w2, company_id: c1, code: 'W2', name: 'WH2' },
      ],
    });
    await prisma.customer.createMany({
      data: [
        {
          id: customer1,
          company_id: c1,
          name: 'C1',
          code: 'C1',
          email: 'c1@c.com',
        },
      ],
    });
    try {
      await prisma.bom.createMany({
        data: [
          {
            id: bom,
            company_id: c1,
            product_id: p2,
            code: 'BOM1',
            name: 'BOM1',
            quantity: 1,
            unit_id: u1,
          },
        ],
      });
    } catch (e) {}
    await prisma.accountType.createMany({
      data: [
        {
          id: at,
          company_id: c1,
          name: 'Gen',
          code: 'Gen',
          normal_balance: 'Debit',
        },
      ],
    });
    await prisma.chartOfAccount.createMany({
      data: [
        {
          id: '600000000000000000000101',
          company_id: c1,
          account_code: '1300',
          account_name: 'Inventory Asset',
          account_type_id: at,
        },
        {
          id: '600000000000000000000105',
          company_id: c1,
          account_code: '1400',
          account_name: 'WIP',
          account_type_id: at,
        },
        {
          id: '600000000000000000000102',
          company_id: c1,
          account_code: '5000',
          account_name: 'COGS',
          account_type_id: at,
        },
        {
          id: '600000000000000000000103',
          company_id: c1,
          account_code: '4000',
          account_name: 'Sales Revenue',
          account_type_id: at,
        },
        {
          id: '600000000000000000000104',
          company_id: c1,
          account_code: '1000',
          account_name: 'Cash',
          account_type_id: at,
        },
      ],
    });

    const resetDB = async () => {
      const models = [
        'journalEntryItem',
        'journalEntry',
        'inventoryCostLayer',
        'costLayerConsumption',
        'stockMovement',
        'warehouseStock',
        'salesOrderItem',
        'salesOrder',
        'deliveryOrderItem',
        'deliveryOrder',
        'inventoryTransactionItem',
        'inventoryTransaction',
        'manufacturingOrderItem',
        'manufacturingOrder',
        'posOrderItem',
        'posOrder',
        'accountingPeriod',
      ];
      for (const m of models) {
        try {
          await prisma[m].deleteMany({});
        } catch (e) {}
      }
    };

    const seedLayers = async () => {
      await prisma.warehouseStock.create({
        data: {
          company_id: c1,
          warehouse_id: w1,
          product_id: p1,
          current_stock: 200,
          available_stock: 200,
        },
      });
      await prisma.warehouseStock.create({
        data: {
          company_id: c1,
          warehouse_id: w2,
          product_id: p1,
          current_stock: 0,
          available_stock: 0,
        },
      });
      const m1 = await prisma.stockMovement.create({
        data: {
          company_id: c1,
          warehouse_id: w1,
          product_id: p1,
          transaction_type: 'IN',
          transaction_id: '600000000000000000000501',
          movement_type: 'IN',
          qty_in: 100,
          qty_out: 0,
          balance_after: 100,
          unit_cost: 10000,
          total_cost: 1000000,
          created_by: sys,
        },
      });
      await prisma.inventoryCostLayer.create({
        data: {
          company_id: c1,
          warehouse_id: w1,
          product_id: p1,
          unit_cost: 10000,
          quantity: 100,
          remaining_quantity: 100,
          source_movement_id: m1.id,
        },
      });
      const m2 = await prisma.stockMovement.create({
        data: {
          company_id: c1,
          warehouse_id: w1,
          product_id: p1,
          transaction_type: 'IN',
          transaction_id: '600000000000000000000502',
          movement_type: 'IN',
          qty_in: 100,
          qty_out: 0,
          balance_after: 200,
          unit_cost: 12000,
          total_cost: 1200000,
          created_by: sys,
        },
      });
      await prisma.inventoryCostLayer.create({
        data: {
          company_id: c1,
          warehouse_id: w1,
          product_id: p1,
          unit_cost: 12000,
          quantity: 100,
          remaining_quantity: 100,
          source_movement_id: m2.id,
        },
      });
      await prisma.accountingPeriod.create({
        data: {
          company_id: c1,
          name: 'Open',
          start_date: new Date('2020-01-01'),
          end_date: new Date('2026-12-31'),
          status: 'OPEN',
          month: 1,
          year: 2026,
        },
      });
    };

    // --- REGRESSION A-F, U (Fast check on consumeFifoLayers direct engine) ---
    try {
      await resetDB();
      await seedLayers();
      const { totalCogs } = await prisma.$transaction((tx) =>
        consumeFifoLayers(tx, {
          companyId: c1,
          productId: p1,
          warehouseId: w1,
          quantity: 150,
          stockMovementId: '600000000000000000000501',
        }),
      );
      results.REGRESSION = totalCogs === 1600000 ? 'PASS' : 'FAIL';
    } catch (e) {
      results.REGRESSION = 'FAIL';
    }

    // G: Real Stock Transfer
    try {
      await resetDB();
      await seedLayers();
      const tf = await inventoryService.createTransfer({
        companyId: c1,
        sourceWarehouseId: w1,
        targetWarehouseId: w2,
        userId: sys,
        items: [{ productId: p1, qty: 150 }],
      });
      await inventoryService.validateTransfer(c1, tf.id, sys);
      await new Promise((r) => setTimeout(r, 100));
      const l_w1 = await prisma.inventoryCostLayer.findMany({
        where: { warehouse_id: w1 },
        orderBy: { created_at: 'asc' },
      });
      const l_w2 = await prisma.inventoryCostLayer.findMany({
        where: { warehouse_id: w2 },
        orderBy: { created_at: 'asc' },
      });
      const ok =
        l_w1[0].remaining_quantity === 0 &&
        l_w1[1].remaining_quantity === 50 &&
        l_w2.length === 2 &&
        l_w2[0].quantity === 100 &&
        l_w2[1].quantity === 50;
      results.G = ok
        ? 'PASS'
        : `FAIL - layers didn't match. W1: ${l_w1.map((l) => l.remaining_quantity).join(',')}, W2: ${l_w2.map((l) => l.quantity).join(',')}`;
    } catch (e) {
      results.G = 'FAIL - ' + e.message;
    }

    // H: Real Manufacturing
    try {
      await resetDB();
      await seedLayers();
      let mo = await moService.createManufacturingOrder({
        company_id: c1,
        order_number: 'MO-1',
        product_id: p2,
        bom_id: bom,
        warehouse_id: w1,
        unit_id: u1,
        planned_quantity: 10,
        items: [{ product_id: p1, required_quantity: 150, unit_id: u1 }],
      });
      await prisma.manufacturingOrder.update({
        where: { id: mo.id },
        data: { status: 'CONFIRMED' },
      });
      await moService.startProduction(c1, mo.id, sys);
      mo = await prisma.manufacturingOrder.findFirst({
        where: { id: mo.id },
        include: { items: true },
      });
      await moService.consumeMaterials(
        c1,
        mo.id,
        [{ manufacturing_order_item_id: mo.items[0].id, quantity: 150 }],
        sys,
      );
      await new Promise((r) => setTimeout(r, 100));
      const jes = await prisma.journalEntry.findMany({
        include: { items: true },
      });
      results.H =
        jes.length > 0
          ? 'PASS'
          : 'FAIL - No JE generated. Count: ' + jes.length;
    } catch (e) {
      results.H = 'FAIL - ' + e.message;
    }

    // I: Real Delivery
    try {
      await resetDB();
      await seedLayers();
      const so = await prisma.salesOrder.create({
        data: {
          company_id: c1,
          customer_id: customer1,
          order_number: 'SO-1',
          order_date: new Date(),
          status: 'Draft',
          total_amount: 0,
          items: {
            create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 1 }],
          },
        },
      });
      const del = await deliveryService.create(c1, so.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 150 }],
      });
      await deliveryService.validate(c1, del.id, sys);
      await new Promise((r) => setTimeout(r, 100));
      const je = await prisma.journalEntry.findFirst({
        include: { items: true },
      });
      const dr = je?.items.find((l) => l.debit > 0);
      results.I =
        dr?.debit === 1600000 ? 'PASS' : 'FAIL - COGS mismatch or missing JE';
    } catch (e) {
      results.I = 'FAIL - ' + e.message;
    }

    // J: Real POS
    try {
      await resetDB();
      await seedLayers();
      await posService.processCheckout({
        companyId: c1,
        userId: sys,
        warehouseId: w1,
        customerId: customer1,
        paymentMethod: 'CASH',
        subtotal: 3000000,
        tax: 0,
        total: 3000000,
        items: [{ productId: p1, qty: 30, price: 100000 }],
      });
      await new Promise((r) => setTimeout(r, 100));
      const jes = await prisma.journalEntry.findMany({
        include: { items: true },
      });
      const cogs = jes.flatMap((j) => j.items).find((l) => l.debit === 300000);
      results.J = cogs ? 'PASS' : 'FAIL - COGS 300,000 not found';
    } catch (e) {
      results.J = 'FAIL - ' + e.message;
    }

    // K: Concurrency
    try {
      await resetDB();
      await seedLayers();
      const so1 = await prisma.salesOrder.create({
        data: {
          company_id: c1,
          customer_id: customer1,
          order_number: 'SO-2',
          order_date: new Date(),
          status: 'Draft',
          total_amount: 0,
          items: {
            create: [
              { product_id: p1, qty: 150, unit_price: 1, subtotal: 150 },
            ],
          },
        },
      });
      const so2 = await prisma.salesOrder.create({
        data: {
          company_id: c1,
          customer_id: customer1,
          order_number: 'SO-3',
          order_date: new Date(),
          status: 'Draft',
          total_amount: 0,
          items: {
            create: [
              { product_id: p1, qty: 150, unit_price: 1, subtotal: 150 },
            ],
          },
        },
      });
      const del1 = await deliveryService.create(c1, so1.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 150 }],
      });
      const del2 = await deliveryService.create(c1, so2.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 150 }],
      });
      const p = await Promise.allSettled([
        deliveryService.validate(c1, del1.id, sys),
        deliveryService.validate(c1, del2.id, sys),
      ]);
      const successCount = p.filter((x) => x.status === 'fulfilled').length;
      results.K =
        successCount === 1 ? 'PASS' : `FAIL - successCount: ${successCount}`;
    } catch (e) {
      results.K = 'FAIL - ' + e.message;
    }

    // T: Closed Period
    try {
      await resetDB();
      await seedLayers();
      await prisma.accountingPeriod.updateMany({ data: { status: 'CLOSED' } });
      const so = await prisma.salesOrder.create({
        data: {
          company_id: c1,
          customer_id: customer1,
          order_number: 'SO-4',
          order_date: new Date(),
          status: 'Draft',
          total_amount: 0,
          items: {
            create: [
              { product_id: p1, qty: 150, unit_price: 1, subtotal: 150 },
            ],
          },
        },
      });
      const del = await deliveryService.create(c1, so.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 150 }],
      });
      try {
        await deliveryService.validate(c1, del.id, sys);
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 100));
      const layers = await prisma.inventoryCostLayer.findMany();
      results.T =
        layers[0].remaining_quantity === 100
          ? 'PASS'
          : 'FAIL - Layers mutated despite closed period';
    } catch (e) {
      results.T = 'FAIL - ' + e.message;
    }

    // X: Idempotency
    try {
      await resetDB();
      await seedLayers();
      const so = await prisma.salesOrder.create({
        data: {
          company_id: c1,
          customer_id: customer1,
          order_number: 'SO-6',
          order_date: new Date(),
          status: 'Draft',
          total_amount: 0,
          items: {
            create: [{ product_id: p1, qty: 50, unit_price: 1, subtotal: 50 }],
          },
        },
      });
      const del = await deliveryService.create(c1, so.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 50 }],
      });
      await deliveryService.validate(c1, del.id, sys);
      await new Promise((r) => setTimeout(r, 100));
      try {
        await deliveryService.validate(c1, del.id, sys);
      } catch (e) {}
      const jeCount = await prisma.journalEntry.count();
      results.X = jeCount === 1 ? 'PASS' : `FAIL - JE count ${jeCount}`;
    } catch (e) {
      results.X = 'FAIL - ' + e.message;
    }

    // V & W
    try {
      await resetDB();
      await seedLayers();
      const so = await prisma.salesOrder.create({
        data: {
          company_id: c1,
          customer_id: customer1,
          order_number: 'SO-8',
          order_date: new Date(),
          status: 'Draft',
          total_amount: 0,
          items: {
            create: [{ product_id: p1, qty: 150, unit_price: 1, subtotal: 1 }],
          },
        },
      });
      const del = await deliveryService.create(c1, so.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 150 }],
      });
      await deliveryService.validate(c1, del.id, sys);
      await new Promise((r) => setTimeout(r, 100));
      const remLayer = await prisma.inventoryCostLayer.findFirst({
        where: { remaining_quantity: { gt: 0 } },
      });
      const je = await prisma.journalEntry.findFirst({
        include: { items: true },
      });
      const isVW =
        remLayer.remaining_quantity === 50 &&
        remLayer.unit_cost === 12000 &&
        je.items.find((l) => l.debit === 1600000) &&
        je.items.find((l) => l.credit === 1600000);
      results.VW = isVW ? 'PASS' : 'FAIL';
    } catch (e) {
      results.VW = 'FAIL - ' + e.message;
    }

    results.CREATED_BY_CHECK = await prisma.journalEntry.findFirst({
      select: { created_by: true },
    });
  } catch (e) {
    results.GLOBAL_ERROR = e.message;
  }

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  await replSet.stop();
}

run();
