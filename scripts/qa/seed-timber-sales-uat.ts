const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function seedUAT() {
  console.log("Seeding UAT Data...");
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl.includes("staging") && !dbUrl.includes("uat") && !dbUrl.includes("localhost")) {
      throw new Error("ABORT: Not running against a designated staging/uat database.");
    }

    await prisma.$connect();
    
    // Find dependencies
    const warehouse = await prisma.warehouse.findFirst();
    const variant = await prisma.timberVariant.findFirst();
    const customer = await prisma.customer.findFirst();

    if (!warehouse || !variant || !customer) {
      throw new Error("Missing prerequisite data: Warehouse, TimberVariant, or Customer.");
    }

    console.log(`Using Variant: ${variant.id}, Warehouse: ${warehouse.id}`);

    // Create Opening Balance Adjustment for exactly 100 PCS safely
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        adjustmentNumber: `UAT-ADJ-${Date.now()}`,
        date: new Date(),
        reason: 'UAT_SEEDING',
        status: 'POSTED',
        warehouseId: warehouse.id,
        items: {
          create: [{
            timberVariantId: variant.id,
            systemPcs: 0,
            actualPcs: 100,
            systemM3: 0.0,
            actualM3: 10.0
          }]
        }
      },
      include: { items: true }
    });

    // Directly create ledger movement (bypassing full NestJS service in this pure seed script, but maintaining structural ledger rules)
    const stock = await prisma.timberStock.upsert({
      where: { locationId_timberVariantId: { locationId: warehouse.id, timberVariantId: variant.id } },
      update: { currentPcs: { increment: 100 }, currentVolumeM3: { increment: 10.0 } },
      create: { locationId: warehouse.id, timberVariantId: variant.id, currentPcs: 100, currentVolumeM3: 10.0 }
    });

    await prisma.timberStockMovement.create({
      data: {
        timberStockId: stock.id,
        type: 'IN',
        referenceType: 'ADJUSTMENT',
        referenceId: adjustment.id,
        quantityPcs: 100,
        volumeM3: 10.0
      }
    });

    console.log(`✅ SEED COMPLETE. Stock adjusted for UAT.`);
  } catch (error) {
    console.error("❌ SEED FAILED: ", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedUAT();
