import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.cashAccount.findMany();
  console.log(accounts);
}
main().finally(() => prisma.$disconnect());
