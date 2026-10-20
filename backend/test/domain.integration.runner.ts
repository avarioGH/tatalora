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

async function run() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_test?');

  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();

  const results: any = {};

  try {
    try {
      await prisma.$runCommandRaw({ create: 'JournalEntry' });
    } catch (e) {}
    await prisma.$runCommandRaw({
      createIndexes: 'JournalEntry',
      indexes: [
        {
          key: { idempotency_key: 1 },
          name: 'idempotency_key_1',
          unique: true,
        },
      ],
    });

    const eventEmitter = new EventEmitter2();
    const glService = new GlService(prisma);
    const accountingListener = new AccountingListener(glService, prisma);

    eventEmitter.on('sales.completed', (evt) =>
      accountingListener.handleSalesCompleted(evt),
    );
    eventEmitter.on('delivery.validated', (evt) =>
      accountingListener.handleDeliveryValidated(evt),
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
        { id: c1, name: 'FIFO_RUNTIME_DOMAIN_COMPANY' },
        { id: c2, name: 'OTHER_COMPANY' },
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
          name: 'RAW-FIFO-001',
          code: 'R1',
          purchase_price: 50000,
          selling_price: 100000,
          unit_id: u1,
        },
        {
          id: p2,
          company_id: c1,
          name: 'FG-FIFO-001',
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
          name: 'Cust 1',
          code: 'C1',
          email: 'c1@test.com',
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
          name: 'General',
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
          account_code: '1400',
          account_name: 'Inventory',
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
        {
          id: '600000000000000000000105',
          company_id: c1,
          account_code: '1410',
          account_name: 'WIP',
          account_type_id: at,
        },
      ],
    });

    const resetDB = async () => {
      try {
        await prisma.journalEntryItem.deleteMany({});
      } catch (e) {}
      try {
        await prisma.journalEntry.deleteMany({});
      } catch (e) {}
      try {
        await prisma.inventoryCostLayer.deleteMany({});
      } catch (e) {}
      try {
        await prisma.costLayerConsumption.deleteMany({});
      } catch (e) {}
      try {
        await prisma.stockMovement.deleteMany({});
      } catch (e) {}
      try {
        await prisma.warehouseStock.deleteMany({});
      } catch (e) {}
      try {
        await prisma.salesOrderItem.deleteMany({});
      } catch (e) {}
      try {
        await prisma.salesOrder.deleteMany({});
      } catch (e) {}
      try {
        await prisma.deliveryOrderItem.deleteMany({});
      } catch (e) {}
      try {
        await prisma.deliveryOrder.deleteMany({});
      } catch (e) {}
      try {
        await prisma.inventoryTransactionItem.deleteMany({});
      } catch (e) {}
      try {
        await prisma.inventoryTransaction.deleteMany({});
      } catch (e) {}
      try {
        await prisma.manufacturingOrderItem.deleteMany({});
      } catch (e) {}
      try {
        await prisma.manufacturingOrder.deleteMany({});
      } catch (e) {}
      try {
        await prisma.posOrderItem.deleteMany({});
      } catch (e) {}
      try {
        await prisma.posOrder.deleteMany({});
      } catch (e) {}
      try {
        await prisma.accountingPeriod.deleteMany({});
      } catch (e) {}
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

    // SCENARIO G
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
      await new Promise((r) => setTimeout(r, 1000));
      const l_w1 = await prisma.inventoryCostLayer.findMany({
        where: { warehouse_id: w1 },
        orderBy: { created_at: 'asc' },
      });
      const l_w2 = await prisma.inventoryCostLayer.findMany({
        where: { warehouse_id: w2 },
        orderBy: { created_at: 'asc' },
      });
      const pass =
        l_w1[0].remaining_quantity === 0 &&
        l_w1[1].remaining_quantity === 50 &&
        l_w2.length === 2 &&
        l_w2[0].quantity === 100 &&
        l_w2[0].unit_cost === 10000 &&
        l_w2[1].quantity === 50 &&
        l_w2[1].unit_cost === 12000;
      results.G = pass
        ? 'PASS'
        : `FAIL - w1: ${JSON.stringify(l_w1.map((x) => x.remaining_quantity))}, w2: ${JSON.stringify(l_w2.map((x) => x.quantity))}`;
    } catch (e) {
      results.G = 'FAIL - ' + e.message;
    }

    // SCENARIO I & W
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
            create: [
              {
                product_id: p1,
                qty: 150,
                unit_price: 100000,
                subtotal: 15000000,
              },
            ],
          },
        },
      });
      const del = await deliveryService.create(c1, so.id, {
        date: new Date(),
        warehouseId: w1,
        items: [{ productId: p1, qty: 150 }],
      });
      await deliveryService.validate(c1, del.id, sys);
      await new Promise((r) => setTimeout(r, 1000)); // allow events

      const je = await prisma.journalEntry.findFirst({
        include: { items: true },
      });
      const dr = je?.items.find((l) => l.debit > 0);
      const cr = je?.items.find((l) => l.credit > 0);
      results.IW =
        dr?.debit === 1600000 &&
        cr?.credit === 1600000 &&
        je?.total_debit === 1600000
          ? 'PASS'
          : `FAIL - DR: ${dr?.debit} CR: ${cr?.credit}`;
    } catch (e) {
      results.IW = 'FAIL - ' + e.message;
    }

    // SCENARIO J
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
      await new Promise((r) => setTimeout(r, 1000));

      const je = await prisma.journalEntry.findMany({
        include: { items: true },
      });
      const cogsLine = je
        .flatMap((j) => j.items)
        .find((l) => l.debit === 300000);
      results.J = cogsLine
        ? 'PASS'
        : `FAIL - No COGS line of 300000 found. JE count: ${je.length}`;
    } catch (e) {
      results.J = 'FAIL - ' + e.message;
    }

    // SCENARIO H
    try {
      await resetDB();
      await seedLayers();
      await prisma.warehouseStock.create({
        data: {
          company_id: c1,
          warehouse_id: w1,
          product_id: p2,
          current_stock: 0,
          available_stock: 0,
        },
      });
      let mo = await moService.createManufacturingOrder({
        company_id: c1,
        order_number: 'MO-1',
        product_id: p2,
        bom_id: bom,
        warehouse_id: w1,
        unit_id: u1,
        planned_quantity: 10,
        items: [{ product_id: p1, required_quantity: 30, unit_id: u1 }],
      });
      await moService.startProduction(c1, mo.id, sys);
      mo = await prisma.manufacturingOrder.findFirst({
        where: { id: mo.id },
        include: { items: true },
      });
      await moService.consumeMaterials(
        c1,
        mo.id,
        [{ manufacturing_order_item_id: mo.items[0].id, quantity: 30 }],
        sys,
      );
      await new Promise((r) => setTimeout(r, 1000));
      const layers = await prisma.inventoryCostLayer.findFirst({
        orderBy: { created_at: 'asc' },
      });
      const je = await prisma.journalEntry.findFirst({
        include: { items: true },
      });
      const cr = je?.items.find((l) => l.credit > 0);
      results.H =
        layers.remaining_quantity === 70 && cr?.credit === 300000
          ? 'PASS'
          : `FAIL - layer: ${layers.remaining_quantity}, cr: ${cr?.credit}`;
    } catch (e) {
      results.H = 'FAIL - ' + e.message;
    }
  } catch (e) {
    results.GLOBAL_ERROR = e.message;
  }

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  await replSet.stop();
}

run();
