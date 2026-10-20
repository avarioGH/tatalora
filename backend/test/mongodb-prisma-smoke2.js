const { MongoMemoryReplSet, MongoMemoryServer } = require('mongodb-memory-server');
const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');

function withTimeout(promise, ms, name) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${name} took longer than ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function runDiagnostics() {
  await testType('STANDALONE', async () => {
    const server = await MongoMemoryServer.create();
    return { server, uri: server.getUri() };
  });

  await testType('REPLICA SET', async () => {
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    let uri = replSet.getUri();
    uri += '&directConnection=true';
    return { server: replSet, uri };
  });

  process.exit(0);
}

async function testType(typeName, createFn) {
  console.log(`\n==================================================`);
  console.log(`TESTING: ${typeName}`);
  let server, prisma;
  
  try {
    const res = await withTimeout(createFn(), 60000, 'MongoDB Startup');
    server = res.server;
    let uri = res.uri;
    if (!uri.includes('?')) uri += '?';
    uri = uri.replace('?', 'testdb?');
    
    console.log('[3.5] Raw MongoDB Ping');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await withTimeout(client.connect(), 5000, 'Raw MongoClient Connect');
    await client.db('testdb').command({ ping: 1 });
    await client.close();
    console.log('[3.6] Raw MongoDB Ping Successful');

    console.log('[4] Creating PrismaClient');
    prisma = new PrismaClient({ datasources: { db: { url: uri } } });
    
    console.log('[5] Prisma connecting (Skipping db push)');
    await withTimeout(prisma.$connect(), 5000, 'Prisma Connect');
    console.log('[6] Prisma connected');
    
    console.log('[7] Running ping via Prisma');
    await withTimeout(prisma.$runCommandRaw({ ping: 1 }), 5000, 'Prisma Query');
    console.log(`[8] Ping successful`);
    
  } catch (err) {
    console.error(`\n>>> FAILURE IN ${typeName} <<<`);
    console.error(err.message);
  } finally {
    console.log('[9] Disconnecting');
    if (prisma) await prisma.$disconnect().catch(() => {});
    if (server) await server.stop();
    console.log('[10] MongoDB stopped');
  }
}

runDiagnostics();
