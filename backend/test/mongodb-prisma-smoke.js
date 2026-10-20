const { MongoMemoryReplSet, MongoMemoryServer } = require('mongodb-memory-server');
const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const os = require('os');
const { execSync } = require('child_process');

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
  console.log('--- DIAGNOSTICS ---');
  
  await testType('STANDALONE', async () => {
    const server = await MongoMemoryServer.create();
    const uri = server.getUri();
    return { server, uri };
  });

  await testType('REPLICA SET (directConnection=true)', async () => {
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
    console.log('[1] Starting MongoDB');
    const res = await withTimeout(createFn(), 60000, 'MongoDB Startup');
    server = res.server;
    let uri = res.uri;
    console.log('[2] MongoDB started');
    
    if (!uri.includes('?')) uri += '?';
    uri = uri.replace('?', 'testdb?');
    console.log(`[3] Test URI obtained: ${uri.split('?')[1]}`);
    
    console.log('[3.5] Raw MongoDB Ping');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await withTimeout(client.connect(), 5000, 'Raw MongoClient Connect');
    const pingRes = await client.db('testdb').command({ ping: 1 });
    await client.close();
    console.log('[3.6] Raw MongoDB Ping Successful');

    console.log('[4] Creating PrismaClient');
    prisma = new PrismaClient({ datasources: { db: { url: uri } } });
    
    console.log('[5] Prisma connecting');
    process.env.DATABASE_URL = uri;
    console.log('[5.5] Running prisma db push');
    execSync('npx prisma db push --accept-data-loss', { env: process.env, stdio: 'ignore' });
    
    await withTimeout(prisma.$connect(), 10000, 'Prisma Connect');
    console.log('[6] Prisma connected');
    
    console.log('[7] Running ping (trivial query)');
    const count = await withTimeout(prisma.company.count(), 10000, 'Prisma Query');
    console.log(`[8] Ping successful (Count: ${count})`);
    
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
