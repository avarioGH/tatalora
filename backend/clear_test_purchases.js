const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Menghapus data testing (TimberPurchase yang memiliki partaiId)...");
  
  // Hapus semua TimberPurchase yang partaiId-nya tidak null
  const result = await prisma.timberPurchase.deleteMany({
    where: {
      partaiId: {
        not: null
      }
    }
  });

  console.log(`Berhasil menghapus ${result.count} data TimberPurchase (beserta isinya karena onDelete: Cascade).`);
}

main()
  .catch((e) => {
    console.error("Gagal menghapus data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
