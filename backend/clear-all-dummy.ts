import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting FULL dummy data cleanup...');
  
  // Disable foreign key checks if necessary, but Prisma deleteMany in correct order is safer.
  
  // 1. POS & HR
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.posShift.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.payrollItem.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Transactions & Finances
  await prisma.financeTransactionItem.deleteMany({});
  await prisma.financeTransaction.deleteMany({});
  await prisma.journalEntryItem.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.inventoryTransactionItem.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.pettyCash.deleteMany({});
  
  // 3. Inventory Stocks & Images
  await prisma.warehouseStock.deleteMany({});
  await prisma.productImage.deleteMany({});
  
  // 4. Master Products
  await prisma.product.deleteMany({});
  
  // 5. Other Master Data (Categories, Units, Brands, Suppliers, Customers)
  await prisma.category.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.customer.deleteMany({});
  
  // 6. Warehouses & Access
  await prisma.userWarehouseAccess.deleteMany({});
  await prisma.warehouse.deleteMany({});
  
  // 7. Finances Categories & Cash Accounts
  await prisma.cashAccount.deleteMany({});
  await prisma.financeCategory.deleteMany({});

  console.log('All dummy data (Transactions, Stocks, Products, Cash, POS, HR) cleared successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
