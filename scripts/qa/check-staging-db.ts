const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("Starting Timber Sales QA Database Check...");
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl.includes("staging") && !dbUrl.includes("uat")) {
      console.warn("WARNING: DATABASE_URL does not explicitly contain 'staging' or 'uat'. Ensure you are not running against PRODUCTION.");
    }

    await prisma.$connect();
    console.log("✅ DB CONNECTION: PASS");
    
    // Harmless read
    const start = Date.now();
    await prisma.timberVariant.findFirst();
    const ms = Date.now() - start;
    
    console.log(`✅ READ TEST: PASS (${ms}ms)`);
    process.exit(0);
  } catch (error) {
    console.error("❌ DB CONNECTION: FAIL");
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
