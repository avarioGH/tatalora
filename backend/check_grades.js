const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const grades = await prisma.timberGrade.findMany({});
  console.log(grades);
}
check().finally(() => prisma.$disconnect());
