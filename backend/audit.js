require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const items = await prisma.inventoryTransactionItem.findMany({
    where: {
      transaction: { transaction_type: { in: ['ADJUSTMENT', 'OPNAME'] }, status: 'Completed' },
      difference: { gt: 0 },
      unit_cost: 0
    },
    include: { product: true }
  });

  let totalQty = 0;
  let estimatedValue = 0;

  for (const item of items) {
    totalQty += item.difference;
    estimatedValue += (item.difference * (item.product?.purchase_price || 0));
  }

  console.log('Total legacy zero-cost positive adjustments: ' + items.length);
  console.log('Total quantity: ' + totalQty);
  console.log('Estimated affected inventory value: ' + estimatedValue);
}

run().catch(console.error).finally(() => prisma.$disconnect());
