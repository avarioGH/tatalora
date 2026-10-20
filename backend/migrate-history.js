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
  
  // Update SalesOrders
  const soRes = await prisma.salesOrder.updateMany({
    where: { company_id: companyId, warehouse_id: null },
    data: { warehouse_id: whId }
  });
  console.log(`Updated ${soRes.count} SalesOrders`);
  
  // Update SalesOrders
  const soRes2 = await prisma.salesOrder.updateMany({
    where: { company_id: companyId, warehouse_id: { exists: false } },
    data: { warehouse_id: whId }
  });
  console.log(`Updated ${soRes2.count} SalesOrders (exists: false)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
