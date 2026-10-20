const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (match) process.env.DATABASE_URL = match[1];

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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
