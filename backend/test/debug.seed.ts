// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function run() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri += '&directConnection=true';
  uri = uri.replace('/?', '/erp_test?');

  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  await prisma.$connect();

  try {
    const c1 = '600000000000000000000001';
    await prisma.company.createMany({
      data: [{ id: c1, name: 'FIFO_RUNTIME_DOMAIN_COMPANY' }],
    });
    console.log('Company OK');
    await prisma.unit.createMany({
      data: [{ id: '600000000000000000000031', company_id: c1, name: 'PCS' }],
    });
    console.log('Unit OK');
    await prisma.category.createMany({
      data: [{ id: '600000000000000000000041', company_id: c1, name: 'CAT' }],
    });
    console.log('Category OK');
    await prisma.warehouse.createMany({
      data: [
        {
          id: '600000000000000000000021',
          company_id: c1,
          code: 'W1',
          name: 'WH1',
        },
      ],
    });
    console.log('Warehouse OK');
    await prisma.customer.createMany({
      data: [
        {
          id: '600000000000000000000051',
          company_id: c1,
          name: 'Cust 1',
          code: 'C1',
          email: 'c1@test.com',
        },
      ],
    });
    console.log('Customer OK');
    await prisma.account.createMany({
      data: [
        {
          id: 'acc_inv',
          company_id: c1,
          code: '1400',
          name: 'Inventory',
          type: 'Asset',
          balance: 0,
        },
      ],
    });
    console.log('Account OK');
    await prisma.product.createMany({
      data: [
        {
          id: '600000000000000000000011',
          company_id: c1,
          name: 'RAW-FIFO-001',
          code: 'R1',
          purchase_price: 50000,
          selling_price: 100000,
          unit_id: '600000000000000000000031',
        },
      ],
    });
    console.log('Product OK');
  } catch (e) {
    console.error(e);
  }
  await prisma.$disconnect();
  await replSet.stop();
}
run();
