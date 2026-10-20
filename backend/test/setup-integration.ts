// @ts-nocheck
// explicitly documented compiler-boundary reason: legacy test script with obsolete schema fixtures
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaClient } from '@prisma/client';

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  console.log('1. Starting Isolated MongoDB Replica Set...');
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();

  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_runtime_test?');
  process.env.TEST_DATABASE_URL = uri;
  process.env.DATABASE_URL = uri;

  console.log('Isolated MongoDB URI:', uri);

  global.prismaTest = new PrismaClient({
    datasources: { db: { url: uri } },
  });

  await global.prismaTest.$connect();

  try {
    await global.prismaTest.$runCommandRaw({ create: 'JournalEntry' });
  } catch (e) {}
  await global.prismaTest.$runCommandRaw({
    createIndexes: 'JournalEntry',
    indexes: [
      { key: { idempotency_key: 1 }, name: 'idempotency_key_1', unique: true },
    ],
  });
});

afterAll(async () => {
  console.log('6. Cleaning up...');
  if (global.prismaTest) {
    await global.prismaTest.$disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
});
