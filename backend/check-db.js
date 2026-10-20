const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getRecords() {
  const count = await prisma.sawnTimberOutput.count();
  const first = await prisma.sawnTimberOutput.findFirst();
  console.log(`Count: ${count}`);
  console.log(`First ID: ${first?.id}`);
  await prisma.$disconnect();
}
getRecords();
