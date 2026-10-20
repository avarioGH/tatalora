import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to TESTING partai...');

  // Get first company as default if none specified
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('No company found in database. Cannot create Partai.');
    process.exit(1);
  }

  // Find or create TESTING partai
  let testingPartai = await prisma.timberPartai.findFirst({
    where: { code: 'TESTING' }
  });

  if (!testingPartai) {
    testingPartai = await prisma.timberPartai.create({
      data: {
        code: 'TESTING',
        name: 'Partai Testing (Migrasi Data Lama)',
        notes: 'Seluruh data sebelum sistem partai diimplementasikan',
        status: 'COMPLETED',
        company_id: company.id
      }
    });
    console.log(`Created new Partai: TESTING (ID: ${testingPartai.id})`);
  } else {
    console.log(`Found existing Partai: TESTING (ID: ${testingPartai.id})`);
  }

  const partaiId = testingPartai.id;

  // Update Purchases
  const purchasesResult = await prisma.timberPurchase.updateMany({
    where: { partaiId: null },
    data: { partaiId: partaiId }
  });
  console.log(`Updated ${purchasesResult.count} TimberPurchases`);

  // Update Raw Logs
  const rawLogsResult = await prisma.rawLog.updateMany({
    where: { partaiId: null },
    data: { partaiId: partaiId }
  });
  console.log(`Updated ${rawLogsResult.count} RawLogs`);

  // Update Trimmed Logs
  const trimmedLogsResult = await prisma.trimmedLog.updateMany({
    where: { partaiId: null },
    data: { partaiId: partaiId }
  });
  console.log(`Updated ${trimmedLogsResult.count} TrimmedLogs`);

  // Update Input Logs
  const inputLogsResult = await prisma.inputLog.updateMany({
    where: { partaiId: null },
    data: { partaiId: partaiId }
  });
  console.log(`Updated ${inputLogsResult.count} InputLogs`);

  // Update Sawn Timber Outputs
  const outputsResult = await prisma.sawnTimberOutput.updateMany({
    where: { partaiId: null },
    data: { partaiId: partaiId }
  });
  console.log(`Updated ${outputsResult.count} SawnTimberOutputs`);

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
