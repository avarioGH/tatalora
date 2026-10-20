const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { PrismaClient } = require('@prisma/client');

async function testIndexAccess() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_test?');
  
  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();
  
  try {
    await prisma.company.create({ data: { id: '600000000000000000000001', name: 'Test' }}); // Create collection implicitly
    const res = await prisma.$runCommandRaw({ listIndexes: 'Company' });
    console.log('Index access returned:', res.cursor.firstBatch);
    console.log('INDEX ACCESS SUCCESSFUL');
  } catch (e) {
    console.log('INDEX ACCESS FAILED:', e.message);
  }

  await prisma.$disconnect();
  await replSet.stop();
}
testIndexAccess();
