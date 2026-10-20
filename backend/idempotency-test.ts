import { PrismaClient } from '@prisma/client';
import { InventoryService } from './src/inventory/inventory.service';
import { PosService } from './src/pos/pos.service';
import { DeliveryService } from './src/crm/delivery/delivery.service';

const prisma = new PrismaClient();
const inventoryService = new InventoryService(prisma);
const posService = new PosService(prisma, inventoryService);
const deliveryService = new DeliveryService(prisma, inventoryService as any);

async function runTests() {
  console.log("=== STARTING PHASE 5 IDEMPOTENCY & INTEGRITY TESTS ===");
  try {
    const company = await prisma.company.findFirst();
    const user = await prisma.user.findFirst({ where: { company_id: company?.id } });
    const warehouseA = await prisma.warehouse.findFirst({ where: { company_id: company?.id } });
    
    // Create Product
    const product = await prisma.product.create({
      data: {
        code: "UAT-IKAN-IDEM-" + Date.now(),
        barcode: "123456789",
        name: "Ikan Idempotency",
        purchase_price: 20000,
        selling_price: 25000,
        company_id: company?.id as string,
      }
    });

    console.log("Created Product: " + product.name);

    // 1. RECEIVING IDEMPOTENCY
    console.log("--- 1. RECEIVING ---");
    // Receive 100 first
    await inventoryService.receiveStock(prisma, warehouseA?.id as string, product.id, 100, 'IN', 'UAT-IN-' + Date.now(), user?.id as string);
    let stock = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA?.id, product_id: product.id } });
    console.log("Initial Stock: " + stock?.current_stock);

    // Try concurrent POS
    console.log("--- 2. POS CONCURRENCY ---");
    const posPayload = {
      customerId: null,
      warehouseId: warehouseA?.id as string,
      items: [{ productId: product.id, quantity: 10, unitPrice: product.selling_price }],
      subtotal: 250000,
      discount: 0,
      tax: 0,
      total: 250000,
      paymentMethod: 'CASH',
      amountPaid: 300000,
      change: 50000,
      companyId: company?.id as string,
      userId: user?.id as string
    };

    // Execute concurrently
    try {
        await Promise.all([
          posService.processCheckout(posPayload),
          posService.processCheckout(posPayload)
        ]);
        console.log("POS Concurrent: BOTH SUCCEEDED (Not Idempotent without unique key)");
    } catch (e: any) {
        console.log("POS Concurrent: One or more failed. Error: " + e.message);
    }
    
    stock = await prisma.warehouseStock.findFirst({ where: { warehouse_id: warehouseA?.id, product_id: product.id } });
    console.log("Post-POS Stock (Expected 90 if idempotent, 80 if concurrent both succeeded): " + stock?.current_stock);

    // Get order count
    const orders = await prisma.salesOrder.findMany({ where: { channel: 'POS', items: { some: { product_id: product.id } } } });
    console.log("POS Orders Created: " + orders.length);

    console.log("=== TESTS COMPLETED ===");
  } catch (error) {
    console.error("TEST FAILED:", error);
  } finally {
    await prisma.();
  }
}

runTests();
