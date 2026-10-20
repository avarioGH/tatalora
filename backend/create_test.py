import os

content = """import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

describe('STEP 20E - Inventory Mutation Centralization', () => {
  let app: any;
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  let mongod: MongoMemoryReplSet;

  let companyId: string;
  let warehouseA: string;
  let warehouseB: string;
  let productA: string;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongod.getUri();
    process.env.DATABASE_URL = uri;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    inventoryService = app.get(InventoryService);

    // Seed master data
    const company = await prisma.company.create({
      data: { name: 'Test Co', code: 'TC', currency: 'IDR' }
    });
    companyId = company.id;

    const role = await prisma.role.create({
      data: { company_id: companyId, name: 'Admin', is_system: true, permissions: [] }
    });

    const user = await prisma.user.create({
      data: {
        company_id: companyId,
        role_id: role.id,
        name: 'Admin',
        email: 'admin@test.com',
        password: 'hash',
        status: true
      }
    });
    userId = user.id;

    const wa = await prisma.warehouse.create({
      data: { company_id: companyId, code: 'WHA', name: 'Warehouse A', status: true }
    });
    warehouseA = wa.id;

    const wb = await prisma.warehouse.create({
      data: { company_id: companyId, code: 'WHB', name: 'Warehouse B', status: true }
    });
    warehouseB = wb.id;

    const cat = await prisma.category.create({
      data: { company_id: companyId, code: 'CAT', name: 'Cat', status: true, type: 'PRODUCT' }
    });

    const pa = await prisma.product.create({
      data: {
        company_id: companyId,
        code: 'PRODA',
        name: 'Product A',
        category_id: cat.id,
        type: 'STOCKED',
        status: true,
        can_sell: true,
        can_purchase: true,
        base_price: 100
      }
    });
    productA = pa.id;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  afterEach(async () => {
    // Reset stock and movements
    await prisma.costLayerConsumption.deleteMany({});
    await prisma.inventoryCostLayer.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
  });

  it('1. NORMAL GOODS RECEIPT', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId,
        warehouseId: warehouseA,
        productId: productA,
        quantity: 10,
        unitCost: 100,
        referenceType: 'GRN',
        referenceId: 'grn-1',
        description: 'Test Receipt',
        userId
      });
    });

    const stock = await prisma.warehouseStock.findFirst({
      where: { company_id: companyId, warehouse_id: warehouseA, product_id: productA }
    });

    expect(stock).toBeDefined();
    expect(stock?.current_stock).toBe(10);
    expect(stock?.available_stock).toBe(10);
    expect(stock?.reserved_stock).toBe(0);

    const movs = await prisma.stockMovement.findMany();
    expect(movs.length).toBe(1);
    expect(movs[0].movement_type).toBe('GRN_IN');
    
    const layers = await prisma.inventoryCostLayer.findMany();
    expect(layers.length).toBe(1);
    expect(layers[0].quantity).toBe(10);
  });

  it('2. NORMAL DELIVERY', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100,
        referenceType: 'GRN', referenceId: 'grn-1', userId
      });
      await inventoryService.issueStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 3,
        referenceType: 'DELIVERY', referenceId: 'del-1', userId
      });
    });

    const stock = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: warehouseA, product_id: productA }
    });
    expect(stock?.current_stock).toBe(7);
    expect(stock?.available_stock).toBe(7);

    const layers = await prisma.inventoryCostLayer.findMany();
    expect(layers[0].remaining_quantity).toBe(7);
  });

  it('3. NEGATIVE STOCK PREVENTED', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 5, unitCost: 100,
        referenceType: 'GRN', referenceId: 'grn-1', userId
      });
    });

    await expect(
      prisma.(async (tx) => {
        await inventoryService.issueStock(tx as any, {
          companyId, warehouseId: warehouseA, productId: productA, quantity: 6,
          referenceType: 'DELIVERY', referenceId: 'del-1', userId
        });
      })
    ).rejects.toThrow();

    const stock = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: warehouseA, product_id: productA }
    });
    expect(stock?.current_stock).toBe(5); // Rolled back
  });

  it('4. RESERVATION', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100,
        referenceType: 'GRN', referenceId: 'grn-1', userId
      });
      await inventoryService.reserveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 7
      });
    });

    const stock = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: warehouseA, product_id: productA }
    });
    expect(stock?.current_stock).toBe(10);
    expect(stock?.reserved_stock).toBe(7);
    expect(stock?.available_stock).toBe(3);
  });

  it('5. CONCURRENT RESERVATION', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100,
        referenceType: 'GRN', referenceId: 'grn-1', userId
      });
    });

    const res1 = prisma.(async (tx) => {
      await inventoryService.reserveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 7 });
    });
    const res2 = prisma.(async (tx) => {
      await inventoryService.reserveStock(tx as any, { companyId, warehouseId: warehouseA, productId: productA, quantity: 7 });
    });

    const results = await Promise.allSettled([res1, res2]);
    expect(results.filter(r => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter(r => r.status === 'rejected').length).toBe(1);

    const stock = await prisma.warehouseStock.findFirst({
      where: { warehouse_id: warehouseA, product_id: productA }
    });
    expect(stock?.current_stock).toBe(10);
    expect(stock?.reserved_stock).toBe(7);
    expect(stock?.available_stock).toBe(3);
  });
  
  it('6. TRANSFER', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 10, unitCost: 100,
        referenceType: 'GRN', referenceId: 'grn-1', userId
      });
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseB, productId: productA, quantity: 2, unitCost: 120,
        referenceType: 'GRN', referenceId: 'grn-2', userId
      });
      
      await inventoryService.transferStock(tx as any, {
        companyId, sourceWarehouseId: warehouseA, destinationWarehouseId: warehouseB, productId: productA, quantity: 4,
        referenceType: 'TRANSFER', referenceId: 'tr-1', userId
      });
    });

    const stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA, product_id: productA } });
    const stockB = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseB, product_id: productA } });
    
    expect(stockA?.current_stock).toBe(6);
    expect(stockB?.current_stock).toBe(6);
  });

  it('7. FIFO LAYER CONSUMPTION', async () => {
    await prisma.(async (tx) => {
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 5, unitCost: 100,
        referenceType: 'GRN', referenceId: 'grn-1', userId
      });
      await inventoryService.receiveStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 5, unitCost: 120,
        referenceType: 'GRN', referenceId: 'grn-2', userId
      });
      
      await inventoryService.issueStock(tx as any, {
        companyId, warehouseId: warehouseA, productId: productA, quantity: 7,
        referenceType: 'DELIVERY', referenceId: 'del-1', userId
      });
    });

    const movs = await prisma.stockMovement.findMany({ where: { movement_type: 'DELIVERY_OUT' } });
    expect(movs.length).toBe(1);
    expect(movs[0].total_cost).toBe(5 * 100 + 2 * 120);

    const layers = await prisma.inventoryCostLayer.findMany({ orderBy: { created_at: 'asc' } });
    expect(layers[0].remaining_quantity).toBe(0);
    expect(layers[1].remaining_quantity).toBe(3);
  });

});
"""

with open('test/step20e.ts', 'w') as f:
    f.write(content)
