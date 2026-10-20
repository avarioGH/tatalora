const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { PrismaClient } = require('@prisma/client');

async function testTransaction() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  if (!uri.includes('?')) uri += '?';
  uri = uri.replace('?', 'testdb?');
  
  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();
  console.log('Connected.');
  
  // Create a collection explicitly if needed, but Prisma does it
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$runCommandRaw({ ping: 1 });
      return true;
    });
    console.log('TRANSACTION SUCCESSFUL');
  } catch (e) {
    console.log('TRANSACTION FAILED:', e.message);
  }

  await prisma.$disconnect();
  await replSet.stop();
}
testTransaction();
