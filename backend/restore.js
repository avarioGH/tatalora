const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    where: { status: false }
  });
  console.log('Soft deleted products:', products.map(p => p.name));
  
  // Let's restore them all so the user gets them back
  if (products.length > 0) {
    await prisma.product.updateMany({
      where: { status: false },
      data: { status: true }
    });
    console.log('Restored all soft-deleted products!');
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
