import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    await prisma.$connect();
    console.log("SUCCESS");
  } catch (e) {
    console.log("FAILED");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
