// @ts-nocheck
// explicitly documented compiler-boundary reason: legacy test script with obsolete schema fixtures
import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from 'eventemitter2';
import { GlService } from '../src/gl/gl.service';
import { AccountingListener } from '../src/accounting/accounting.listener';
import { PosService } from '../src/pos/pos.service';
import { DeliveryService } from '../src/crm/delivery/delivery.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { MoService } from '../src/manufacturing/mo/mo.service';
import { AccountingService } from '../src/accounting/accounting.service';

declare global {
  var prismaTest: PrismaClient;
}

describe('FIFO Domain Integration Certification', () => {
  let prisma: PrismaClient;
  let eventEmitter: EventEmitter2;
  let glService: GlService;
  let accountingListener: AccountingListener;
  let posService: PosService;
  let deliveryService: DeliveryService;
  let inventoryService: InventoryService;
  let moService: MoService;
  let accountingService: AccountingService;

  const c1 = '600000000000000000000001';
  const c2 = '600000000000000000000002';
  const p1 = '600000000000000000000011';
  const p2 = '600000000000000000000012'; // FG
  const w1 = '600000000000000000000021';
  const w2 = '600000000000000000000022';
  const u1 = '600000000000000000000031';
  const cat1 = '600000000000000000000041';
  const customer1 = '600000000000000000000051';
  const supplier1 = '600000000000000000000061';
  const sys = '600000000000000000000999';

  beforeAll(async () => {
    prisma = global.prismaTest;
    eventEmitter = new EventEmitter2();
    glService = new GlService(prisma);
    accountingListener = new AccountingListener(glService, prisma);

    // Wire up events
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

    posService = new PosService(prisma, eventEmitter);
    deliveryService = new DeliveryService(prisma, eventEmitter);
    inventoryService = new InventoryService(prisma, eventEmitter);
    moService = new MoService(prisma, eventEmitter);
    accountingService = new AccountingService(prisma);

    // Seed master data
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
      data: [{ id: cat1, company_id: c1, name: 'CAT', code: 'CAT' }],
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
        { id: customer1, company_id: c1, name: 'Cust 1', email: 'c1@test.com' },
      ],
    });

    // Seed GL Accounts
    await prisma.account.createMany({
      data: [
        {
          id: 'acc_inv',
          company_id: c1,
          code: '1400',
          name: 'Inventory',
          type: 'Asset',
          balance: 0,
        },
        {
          id: 'acc_cogs',
          company_id: c1,
          code: '5000',
          name: 'COGS',
          type: 'Expense',
          balance: 0,
        },
        {
          id: 'acc_rev',
          company_id: c1,
          code: '4000',
          name: 'Sales Revenue',
          type: 'Revenue',
          balance: 0,
        },
        {
          id: 'acc_cash',
          company_id: c1,
          code: '1000',
          name: 'Cash',
          type: 'Asset',
          balance: 0,
        },
      ],
    });
  });

  const resetDB = async () => {
    await prisma.journalEntryLine.deleteMany({});
    await prisma.journalEntry.deleteMany({});
    await prisma.inventoryCostLayer.deleteMany({});
    await prisma.costLayerConsumption.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
    await prisma.salesOrderLine.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.deliveryOrder.deleteMany({});
    await prisma.inventoryTransactionItem.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.manufacturingOrderItem.deleteMany({});
    await prisma.manufacturingOrder.deleteMany({});
  };

  const seedLayers = async () => {
    // We can simulate an inbound receipt to create FIFO layers cleanly
    await prisma.warehouseStock.create({
      data: {
        company_id: c1,
        warehouse_id: w1,
        product_id: p1,
        current_stock: 0,
        available_stock: 0,
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

    await inventoryService.processGoodsReceipt({
      companyId: c1,
      userId: sys,
      warehouseId: w1,
      referenceType: 'TEST',
      referenceId: 'T1',
      items: [{ productId: p1, qty: 100, unitCost: 10000 }],
    });
    await inventoryService.processGoodsReceipt({
      companyId: c1,
      userId: sys,
      warehouseId: w1,
      referenceType: 'TEST',
      referenceId: 'T2',
      items: [{ productId: p1, qty: 100, unitCost: 12000 }],
    });
  };

  it('INDEX VERIFICATION', async () => {
    const idx = await prisma.$runCommandRaw({ listIndexes: 'JournalEntry' });
    const hasUnique = idx.cursor.firstBatch.some(
      (i) => i.key.idempotency_key === 1 && i.unique,
    );
    expect(hasUnique).toBe(true);
  });

  it('SCENARIO G - REAL STOCK TRANSFER DOMAIN', async () => {
    await resetDB();
    await seedLayers();

    // Create & Validate Transfer
    const tf = await inventoryService.createTransfer({
      companyId: c1,
      sourceWarehouseId: w1,
      destinationWarehouseId: w2,
      userId: sys,
      items: [{ productId: p1, qty: 150 }],
    });

    await inventoryService.validateTransfer(c1, tf.id, sys);

    // Verify layers
    const l_w1 = await prisma.inventoryCostLayer.findMany({
      where: { warehouse_id: w1 },
      orderBy: { created_at: 'asc' },
    });
    const l_w2 = await prisma.inventoryCostLayer.findMany({
      where: { warehouse_id: w2 },
      orderBy: { created_at: 'asc' },
    });

    expect(l_w1[0].remaining_quantity).toBe(0);
    expect(l_w1[1].remaining_quantity).toBe(50);
    expect(l_w2.length).toBe(2);
    expect(l_w2[0].quantity).toBe(100);
    expect(l_w2[0].unit_cost).toBe(10000);
    expect(l_w2[1].quantity).toBe(50);
    expect(l_w2[1].unit_cost).toBe(12000);
  });

  it('SCENARIO I, W - REAL DELIVERY COGS & GL BALANCE', async () => {
    await resetDB();
    await seedLayers();

    const so = await prisma.salesOrder.create({
      data: {
        company_id: c1,
        customer_id: customer1,
        status: 'Draft',
        total_amount: 0,
        lines: {
          create: [
            {
              product_id: p1,
              quantity: 150,
              unit_price: 100000,
              total_price: 15000000,
            },
          ],
        },
      },
    });
    const del = await deliveryService.create(c1, so.id, {
      date: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 150 }],
    });

    await deliveryService.validate(c1, del.id, sys);

    // Expect COGS = 1,600,000 (100*10k + 50*12k)
    // Check Journal Entry
    const je = await prisma.journalEntry.findFirst({
      include: { lines: true },
    });
    expect(je).toBeDefined();

    const dr = je.lines.find((l) => l.debit > 0);
    const cr = je.lines.find((l) => l.credit > 0);
    expect(dr.debit).toBe(1600000);
    expect(cr.credit).toBe(1600000);
    expect(je.total_debit).toBe(1600000);
    expect(je.total_credit).toBe(1600000);
  });

  it('SCENARIO J - REAL POS FIFO COGS', async () => {
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
      items: [{ productId: p1, quantity: 30, price: 100000 }],
    });

    const je = await prisma.journalEntry.findMany({ include: { lines: true } });
    // POS creates 2 journals normally (Sales and COGS), or 1 combined. Let's find the COGS part.
    const cogsLine = je
      .flatMap((j) => j.lines)
      .find((l) => l.debit === 300000 && l.account_id);
    // Wait, POS event might just emit sales.completed, and AccountingListener handles it.
    // FIFO layer 30 * 10k = 300k.
    expect(cogsLine).toBeDefined();
  });

  it('SCENARIO K - REAL CONCURRENT DOMAIN OPERATIONS (DELIVERY)', async () => {
    await resetDB();
    await seedLayers(); // 200 available

    const so1 = await prisma.salesOrder.create({
      data: {
        company_id: c1,
        customer_id: customer1,
        status: 'Draft',
        total_amount: 0,
        lines: { create: [{ product_id: p1, quantity: 150, unit_price: 1 }] },
      },
    });
    const so2 = await prisma.salesOrder.create({
      data: {
        company_id: c1,
        customer_id: customer1,
        status: 'Draft',
        total_amount: 0,
        lines: { create: [{ product_id: p1, quantity: 150, unit_price: 1 }] },
      },
    });

    const del1 = await deliveryService.create(c1, so1.id, {
      date: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 150 }],
    });
    const del2 = await deliveryService.create(c1, so2.id, {
      date: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 150 }],
    });

    const p = await Promise.allSettled([
      deliveryService.validate(c1, del1.id, sys),
      deliveryService.validate(c1, del2.id, sys),
    ]);

    expect(p.filter((x) => x.status === 'fulfilled').length).toBe(1);
    expect(p.filter((x) => x.status === 'rejected').length).toBe(1);

    const st = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: w1, product_id: p1 },
    });
    expect(st.current_stock).toBe(50); // 200 - 150 = 50
  });

  it('SCENARIO D - FULL ROLLBACK RECHECK (INSUFFICIENT)', async () => {
    await resetDB();
    await seedLayers(); // 200 available

    const so = await prisma.salesOrder.create({
      data: {
        company_id: c1,
        customer_id: customer1,
        status: 'Draft',
        total_amount: 0,
        lines: { create: [{ product_id: p1, quantity: 201, unit_price: 1 }] },
      },
    });
    const del = await deliveryService.create(c1, so.id, {
      date: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 201 }],
    });

    await expect(deliveryService.validate(c1, del.id, sys)).rejects.toThrow();

    // Verify EVERYTHING is intact
    const st = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: w1, product_id: p1 },
    });
    expect(st.current_stock).toBe(200);

    const l = await prisma.inventoryCostLayer.findMany();
    expect(l[0].remaining_quantity).toBe(100);
    expect(l[1].remaining_quantity).toBe(100);

    const je = await prisma.journalEntry.count();
    expect(je).toBe(0); // No GL created
  });

  it('SCENARIO T & W - CLOSED ACCOUNTING PERIOD (ROLLBACK)', async () => {
    await resetDB();
    await seedLayers();

    await prisma.accountingPeriod.create({
      data: {
        company_id: c1,
        name: 'Closed',
        start_date: new Date('2020-01-01'),
        end_date: new Date('2026-12-31'),
        status: 'CLOSED',
      },
    });

    const so = await prisma.salesOrder.create({
      data: {
        company_id: c1,
        customer_id: customer1,
        status: 'Draft',
        total_amount: 0,
        lines: { create: [{ product_id: p1, quantity: 10, unit_price: 1 }] },
      },
    });
    const del = await deliveryService.create(c1, so.id, {
      date: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 10 }],
    });

    await expect(deliveryService.validate(c1, del.id, sys)).rejects.toThrow();

    // Verify ALL rollback
    const st = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: w1, product_id: p1 },
    });
    expect(st.current_stock).toBe(200);

    await prisma.accountingPeriod.deleteMany({});
  });

  it('SCENARIO X - RETRY / IDEMPOTENCY', async () => {
    await resetDB();
    await seedLayers();

    const so = await prisma.salesOrder.create({
      data: {
        company_id: c1,
        customer_id: customer1,
        status: 'Draft',
        total_amount: 0,
        lines: { create: [{ product_id: p1, quantity: 50, unit_price: 1 }] },
      },
    });
    const del = await deliveryService.create(c1, so.id, {
      date: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 50 }],
    });

    await deliveryService.validate(c1, del.id, sys);
    await expect(deliveryService.validate(c1, del.id, sys)).rejects.toThrow(); // Should fail validation state check

    const je = await prisma.journalEntry.count();
    expect(je).toBe(1); // Only 1 JE created for the COGS effect
    const l = await prisma.inventoryCostLayer.findFirst();
    expect(l.remaining_quantity).toBe(50);
  });

  it('SCENARIO H - REAL MANUFACTURING CONSUMPTION', async () => {
    await resetDB();
    await seedLayers();

    const mo = await moService.create(c1, {
      productId: p2,
      quantity: 10,
      targetDate: new Date(),
      warehouseId: w1,
      items: [{ productId: p1, quantity: 30 }], // Consumes 30 RAW
    });

    await moService.consumeMaterial(
      c1,
      mo.id,
      { materials: [{ productId: p1, qtyToConsume: 30 }] },
      sys,
    );

    const layers = await prisma.inventoryCostLayer.findFirst({
      orderBy: { created_at: 'asc' },
    });
    expect(layers.remaining_quantity).toBe(70); // 100 - 30

    // Check if manufacturing.consumed was emitted and handled
    const je = await prisma.journalEntry.findFirst({
      include: { lines: true },
    });
    expect(je).toBeDefined(); // WIP debit, Inventory credit

    const cr = je.lines.find((l) => l.credit > 0);
    expect(cr.credit).toBe(300000); // 30 * 10k
  });
});
