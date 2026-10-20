import { PrismaClient } from '@prisma/client';
import { InventoryService } from './src/inventory/inventory.service';
import { PosService } from './src/pos/pos.service';
import { DeliveryService } from './src/crm/delivery/delivery.service';

const prisma = new PrismaClient();
const inventoryService = new InventoryService(prisma);
const posService = new PosService(prisma, inventoryService);
const deliveryService = new DeliveryService(prisma, inventoryService);

async function runUat() {
  console.log("=== STARTING PHASE 4 UAT ===");
  try {
    const company = await prisma.company.findFirst();
    const user = await prisma.user.findFirst({ where: { company_id: company.id } });
    const warehouseA = await prisma.warehouse.findFirst({ where: { company_id: company.id } });
    const category = await prisma.category.findFirst({ where: { company_id: company.id } });
    
    // Create Product
    const product = await prisma.product.create({
      data: {
        code: "UAT-IKAN-" + Date.now(),
        barcode: "123456789",
        name: "Ikan UAT 500gr",
        purchase_price: 20000,
        selling_price: 25000,
        company_id: company.id,
        category_id: category?.id,
      }
    });

    console.log("Created Product: " + product.name + ", Master Price: " + product.selling_price);

    // STEP 1: Ikan Masuk (Stock In) +100
    await inventoryService.receiveStock(
      prisma,
      warehouseA.id,
      product.id,
      100,
      'IN',
      'UAT-IN-' + Date.now(),
      user.id
    );

    let stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA.id, product_id: product.id } });
    console.log("[INFLOW] WarehouseStock: " + stockA.current_stock + " (Expected: 100)");
    
    let movements = await prisma.stockMovement.findMany({ where: { product_id: product.id }, orderBy: { created_at: 'desc' } });
    console.log("[INFLOW] Last Movement: " + movements[0].transaction_type + " qty_in: " + movements[0].qty_in);

    // STEP 2: POS Transaction (-10)
    const posPayload = {
      customerId: null,
      warehouseId: warehouseA.id,
      items: [{ productId: product.id, quantity: 10, unitPrice: product.selling_price }],
      subtotal: 250000,
      discount: 0,
      tax: 0,
      total: 250000,
      paymentMethod: 'CASH',
      amountPaid: 300000,
      change: 50000,
      companyId: company.id,
      userId: user.id
    };
    
    await posService.processCheckout(posPayload);
    
    stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA.id, product_id: product.id } });
    console.log("[POS] WarehouseStock: " + stockA.current_stock + " (Expected: 90)");
    
    movements = await prisma.stockMovement.findMany({ where: { product_id: product.id }, orderBy: { created_at: 'desc' } });
    console.log("[POS] Last Movement: " + movements[0].transaction_type + " qty_out: " + movements[0].qty_out);

    // STEP 3: POS NEGATIVE STOCK
    try {
      await posService.processCheckout({
        ...posPayload,
        items: [{ productId: product.id, quantity: 200, unitPrice: product.selling_price }],
      });
      console.log("[POS NEGATIVE] FAILED: Allowed checkout with insufficient stock!");
    } catch (e: any) {
      console.log("[POS NEGATIVE] SUCCESS: Rejected checkout with insufficient stock. Error: " + e.message);
    }

    // STEP 4: SALES ORDER DRAFT
    const customer = await prisma.customer.findFirst({ where: { company_id: company.id } });
    const so = await prisma.salesOrder.create({
      data: {
        order_number: 'UAT-SO-' + Date.now(),
        customer_id: customer.id,
        warehouse_id: warehouseA.id,
        company_id: company.id,
        status: 'DRAFT',
        channel: 'B2B',
        subtotal: 440000,
        total: 440000,
        items: {
          create: [{
            product_id: product.id,
            quantity: 20,
            unit_price: 22000,
            subtotal: 440000
          }]
        }
      },
      include: { items: true }
    });

    stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA.id, product_id: product.id } });
    console.log("[SALES DRAFT] WarehouseStock: " + stockA.current_stock + " (Expected: 90) - SO Price: " + so.items[0].unit_price);

    // Verify Master Price Protection
    const productCheck = await prisma.product.findUnique({ where: { id: product.id } });
    console.log("[SALES MASTER PRICE] Product Price: " + productCheck?.selling_price + " (Expected: 25000)");

    // STEP 5: DELIVERY
    const delivery = await prisma.deliveryOrder.create({
      data: {
        delivery_number: 'UAT-DO-' + Date.now(),
        sales_order_id: so.id,
        status: 'DRAFT',
        company_id: company.id,
        items: {
          create: [{
            sales_order_item_id: so.items[0].id,
            product_id: product.id,
            quantity: 20
          }]
        }
      },
      include: { items: true }
    });

    await deliveryService.completeDelivery(delivery.id, user.id);
    
    stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA.id, product_id: product.id } });
    console.log("[DELIVERY] WarehouseStock: " + stockA.current_stock + " (Expected: 70)");

    // DELIVERY DOUBLE SUBMIT
    try {
      await deliveryService.completeDelivery(delivery.id, user.id);
      console.log("[DELIVERY DOUBLE] FAILED: Allowed double delivery completion!");
    } catch (e: any) {
      console.log("[DELIVERY DOUBLE] SUCCESS: Rejected double delivery completion. Error: " + e.message);
    }
    
    stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA.id, product_id: product.id } });
    console.log("[DELIVERY DOUBLE] WarehouseStock: " + stockA.current_stock + " (Expected: 70)");

    // STEP 6: ADJUSTMENT
    await inventoryService.adjustStock(
      prisma,
      warehouseA.id,
      product.id,
      -2,
      'UAT-ADJ-' + Date.now(),
      user.id
    );

    stockA = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA.id, product_id: product.id } });
    console.log("[ADJUSTMENT] WarehouseStock: " + stockA.current_stock + " (Expected: 68)");

    console.log("=== UAT COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("UAT FAILED:", error);
  } finally {
    await prisma.();
  }
}

runUat();
