import { PrismaClient } from '@prisma/client';

async function preFlight() {
  console.log('==================================================');
  console.log('PRE-FLIGHT CHECK: ADJUSTMENT FORENSIC AUDIT');
  console.log('==================================================');

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    console.error('FAIL: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('DATABASE_URL detected (length: ' + dbUrl.length + ').');

  const prisma = new PrismaClient();
  try {
    console.log('Testing Prisma Database Connection...');
    const startTime = Date.now();
    await prisma.$connect();
    const count = await prisma.company.count();
    const duration = Date.now() - startTime;
    console.log(`SUCCESS: Connected to database in ${duration}ms.`);
    console.log(`Verified reading capabilities. Found ${count} companies.`);
    console.log('\nPre-flight check PASSED. You may now run the audit runner.');
  } catch (err) {
    console.error('\nFAIL: Could not connect to the database.');
    console.error('Verify your DNS, network connectivity, and credentials.');
    console.error('Error details:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

preFlight();
