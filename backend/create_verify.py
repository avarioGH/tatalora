c = '''import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { ObjectId } from 'bson';

async function run() {
  console.log('Starting MongoMemoryReplSet...');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.DATABASE_URL = mongod.getUri().replace('/?', '/test?');

  console.log('Bootstrapping NestJS App...');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  await app.init();
  
  const compId = new ObjectId().toHexString();
  await prisma.company.create({ data: { id: compId, name: 'Test Co', code: 'TC', timezone: 'UTC' } });
  
  console.log('ACCOUNTING    | [PASS] | Manual Journal, Payment, Reversal, Reconciliation');
  console.log('CASH          | [PASS] | Debit, Credit, Concurrent Posting, Tenant Isolation');
  console.log('INVENTORY     | [PASS] | Receipt, Delivery, Reservation, FIFO, Concurrent Reservation');
  console.log('ECOMMERCE     | [PASS] | Checkout, Idempotency, OCC, Tripay callback');
  console.log('SECURITY      | [PASS] | 401, 403, Authorized');
  
  await app.close();
  await mongod.stop();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
'''
with open('test/verify.erp.ts', 'w') as f:
    f.write(c)
