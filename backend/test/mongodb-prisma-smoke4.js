const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { PrismaClient } = require('@prisma/client');

async function testTransaction() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_test?');
  
  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();
  console.log('Connected.');
  
  try {
    await prisma.$transaction(async (tx) => {
      const res = await tx.company.findFirst();
      console.log('Query inside tx returned:', res);
    });
    console.log('TRANSACTION SUCCESSFUL');
  } catch (e) {
    console.log('TRANSACTION FAILED:', e.message);
  }

  await prisma.$disconnect();
  await replSet.stop();
}
testTransaction();
