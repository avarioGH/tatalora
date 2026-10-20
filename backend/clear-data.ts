import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data cleanup...');
  
  // Wipe finance data
  await prisma.financeTransactionItem.deleteMany({});
  await prisma.financeTransaction.deleteMany({});
  
  // Wipe journal entries
  await prisma.journalEntryItem.deleteMany({});
  await prisma.journalEntry.deleteMany({});

  // Wipe inventory transactions
  await prisma.inventoryTransactionItem.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.warehouseStock.deleteMany({});
  
  // Wipe products
  await prisma.product.deleteMany({});

  // Reset cash account balances
  await prisma.cashAccount.updateMany({
    data: { current_balance: 0 }
  });

  console.log('Dummy data cleared successfully! Cash account balance is now 0.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
