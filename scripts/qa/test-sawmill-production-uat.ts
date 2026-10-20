import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================');
  console.log('SAWMILL PRODUCTION CONNECTED UAT');
  console.log('==================================================');

  try {
    await prisma.$connect();
    console.log('[OK] Connected to database successfully.');
  } catch (error) {
    console.error('[ERROR] Could not connect to the database.');
    console.error(error.message);
    process.exit(1);
  }

  try {
    // 1. Check if Employee exists
    const employee = await prisma.employee.findFirst();
    if (!employee) {
      console.log('[-] No Employee found. Please create one for Operator assignment.');
    } else {
      console.log(`[OK] Found Employee: ${employee.id}`);
    }

    // 2. Check if WorkCenter exists
    const wc = await prisma.workCenter.findFirst();
    if (!wc) {
      console.log('[-] No WorkCenter found. Please create one for Machine assignment.');
    } else {
      console.log(`[OK] Found WorkCenter: ${wc.id} (${wc.code})`);
    }

    // 3. Check InputLog
    const inputLog = await prisma.inputLog.findFirst({ where: { status: 'AVAILABLE' }});
    if (!inputLog) {
      console.log('[-] No AVAILABLE InputLog found.');
    } else {
      console.log(`[OK] Found InputLog: ${inputLog.inputNumber} (${inputLog.totalVolume} M3)`);
    }

    // 4. Quick Insert Test for Sawmill Bundle (without full service to ensure schema works)
    console.log('\n--- Testing Schema Inserts ---');
    const tempBundle = await prisma.sawmillBundle.create({
      data: {
        bundleNumber: `TEST-BNDL-${Date.now()}`,
        status: 'ACTIVE'
      }
    });
    console.log(`[OK] Successfully created SawmillBundle: ${tempBundle.bundleNumber}`);

    await prisma.sawmillBundle.delete({ where: { id: tempBundle.id } });
    console.log(`[OK] Successfully cleaned up test SawmillBundle.`);

    console.log('\n==================================================');
    console.log('UAT ENVIRONMENT IS READY FOR SAWMILL API TESTING');
    console.log('==================================================');

  } catch (error) {
    console.error('\n[ERROR] UAT Execution Failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
