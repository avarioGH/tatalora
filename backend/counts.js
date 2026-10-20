const { PrismaClient } = require('@prisma/client');
const prod = new PrismaClient({ datasources: { db: { url: 'mongodb+srv://boostupidofficial_db_user:Fg32mARZWVdXb0aa@erp-boostup.qbaqxyw.mongodb.net/erp_db?retryWrites=true&w=majority&appName=erp-boostup' } } });
const uat = new PrismaClient({ datasources: { db: { url: 'mongodb+srv://boostupidofficial_db_user:Fg32mARZWVdXb0aa@erp-boostup.qbaqxyw.mongodb.net/uat_erp?retryWrites=true&w=majority&appName=erp-boostup' } } });

async function count() {
  const models = ['timberPurchase', 'timberPurchaseItem', 'timberPurchaseLogItem', 'rawLog', 'timberStock', 'timberStockMovement'];
  console.log("PRODUCTION COUNTS:");
  for (const m of models) {
    const c = await prod[m].count();
    console.log(`${m}: ${c}`);
  }
  console.log("\nUAT COUNTS:");
  for (const m of models) {
    const c = await uat[m].count();
    console.log(`${m}: ${c}`);
  }
}
count().catch(console.error).finally(() => { prod.$disconnect(); uat.$disconnect(); });
