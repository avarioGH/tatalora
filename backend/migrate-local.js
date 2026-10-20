process.env.DATABASE_URL = "mongodb://localhost:27017/erp_db";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany({});
  
  // Find Gudang A
  const gudangA = warehouses.find(w => w.name.toLowerCase().includes('gudang a') || w.name.toLowerCase() === 'a');
  if (!gudangA) {
    console.log('Gudang A not found');
    return;
  }
  
  const whId = gudangA.id;
  const companyId = gudangA.company_id;
  
  console.log(`Migrating to Gudang A: ${whId} (Company: ${companyId})`);
  
  const soRes2 = await prisma.salesOrder.updateMany({
    where: { company_id: companyId },
    data: { warehouse_id: whId }
  });
  console.log(`Updated ${soRes2.count} SalesOrders to Gudang A`);

  const posRes = await prisma.posShift.updateMany({
    where: { company_id: companyId, warehouse_id: null },
    data: { warehouse_id: whId }
  });
  console.log(`Updated ${posRes.count} PosShifts to Gudang A`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
