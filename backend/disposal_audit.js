
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const disposals = await prisma.inventoryDisposal.findMany({
    include: { items: true }
  });
  
  let totalQty = 0;
  for (const d of disposals) {
    for (const item of d.items) {
      totalQty += item.qty;
    }
  }
  
  console.log("Total disposal records:", disposals.length);
  console.log("Total quantity:", totalQty);
}

run().catch(console.error).finally(() => prisma.$disconnect());

