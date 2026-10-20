import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
  console.log("--- DUPLICATE AUDIT START ---");
  
  const soGroups = await prisma.salesOrder.groupBy({
    by: ['company_id', 'order_number'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });
  console.log("Duplicate SalesOrder order_numbers:", soGroups);

  const tallyGroups = await prisma.stockInTally.groupBy({
    by: ['company_id', 'tally_number'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });
  console.log("Duplicate StockInTally tally_numbers:", tallyGroups);

  const doGroups = await prisma.deliveryOrder.groupBy({
    by: ['company_id', 'delivery_number'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });
  console.log("Duplicate DeliveryOrder delivery_numbers:", doGroups);

  const invGroups = await prisma.inventoryTransaction.groupBy({
    by: ['company_id', 'transaction_no'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });
  console.log("Duplicate InventoryTransaction transaction_no:", invGroups);

  console.log("--- DUPLICATE AUDIT END ---");
  await prisma.$disconnect();
}

audit();
