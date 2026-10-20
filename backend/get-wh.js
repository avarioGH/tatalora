require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany({ select: { id: true, name: true, company_id: true } });
  console.log(JSON.stringify(warehouses, null, 2));
}

main().finally(() => prisma.$disconnect());
