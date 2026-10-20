const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const purchase = await prisma.timberPurchase.findFirst({
    where: { purchaseNumber: "PO-HIST-6707" }
  });
  console.log(purchase);
}
main();
