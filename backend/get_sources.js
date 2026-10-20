const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sources = await prisma.timberSource.findMany();
  console.log(sources);
}
main();
