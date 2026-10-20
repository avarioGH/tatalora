// @ts-nocheck
// explicitly documented compiler-boundary reason: legacy test script with obsolete schema fixtures
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';
const request = require('supertest');
import { DocumentService } from '../src/document/document.service';

const pass = (id: string, msg: string) =>
  console.log(`  ${id.padEnd(4)} ? [RUNTIME VERIFIED] ? ${msg}`);
const fail = (id: string, msg: string) => {
  console.error(`  ${id.padEnd(4)} ? [FAILED] ? ${msg}`);
  process.exit(1);
};

async function run() {
  console.log('=== STEP 20B P0 SECURITY RUNTIME CERTIFICATION ===\n');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri('testdb');
  process.env.DATABASE_URL = uri;
  process.env.JWT_SECRET = 'test_secret';
  pass('A', 'MongoMemoryReplSet started');
  const prisma = new PrismaClient();
  await prisma.$connect();
  pass('B', 'Prisma basic connectivity verified');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();
  pass('C', 'NestJS app.init() verified');

  const collections = [
    'Company',
    'Role',
    'Permission',
    'RolePermission',
    'User',
    'Category',
    'Warehouse',
    'DocumentMaster',
    'DocumentVersion',
    'DocumentShareLink',
    'AuditLog',
  ];
  for (const c of collections) {
    try {
      await prisma.$runCommandRaw({ create: c });
    } catch (e) {}
  }

  const compA = await prisma.company.create({ data: { name: 'Company A' } });
  const compB = await prisma.company.create({ data: { name: 'Company B' } });
  const permInvUpdate = await prisma.permission.create({
    data: { name: 'inventory.category.update', description: '' },
  });
  const permInvDelete = await prisma.permission.create({
    data: { name: 'inventory.category.delete', description: '' },
  });
  const roleA = await prisma.role.create({
    data: { company_id: compA.id, name: 'Admin A' },
  });
  await prisma.rolePermission.create({
    data: { role_id: roleA.id, permission_id: permInvUpdate.id },
  });
  await prisma.rolePermission.create({
    data: { role_id: roleA.id, permission_id: permInvDelete.id },
  });
  const roleB = await prisma.role.create({
    data: { company_id: compB.id, name: 'Admin B' },
  });
  await prisma.rolePermission.create({
    data: { role_id: roleB.id, permission_id: permInvUpdate.id },
  });
  await prisma.rolePermission.create({
    data: { role_id: roleB.id, permission_id: permInvDelete.id },
  });
  const roleNoPerm = await prisma.role.create({
    data: { company_id: compB.id, name: 'NoPerm' },
  });

  const userA = await prisma.user.create({
    data: {
      company_id: compA.id,
      role_id: roleA.id,
      username: 'userA',
      email: 'a@a.com',
      password: '123',
      name: 'A',
    },
  });
  const userB = await prisma.user.create({
    data: {
      company_id: compB.id,
      role_id: roleB.id,
      username: 'userB',
      email: 'b@b.com',
      password: '123',
      name: 'B',
    },
  });
  const userNoPerm = await prisma.user.create({
    data: {
      company_id: compB.id,
      role_id: roleNoPerm.id,
      username: 'noperm',
      email: 'n@n.com',
      password: '123',
      name: 'N',
    },
  });

  const tokenA = jwt.sign(
    {
      sub: userA.id,
      username: userA.username,
      role: userA.role_id,
      company_id: userA.company_id,
    },
    process.env.JWT_SECRET,
  );
  const tokenB = jwt.sign(
    {
      sub: userB.id,
      username: userB.username,
      role: userB.role_id,
      company_id: userB.company_id,
    },
    process.env.JWT_SECRET,
  );
  const tokenNoPermStr = jwt.sign(
    {
      sub: userNoPerm.id,
      username: userNoPerm.username,
      role: userNoPerm.role_id,
      company_id: userNoPerm.company_id,
    },
    process.env.JWT_SECRET,
  );

  const catA = await prisma.category.create({
    data: { company_id: compA.id, name: 'Cat A' },
  });
  const docA = await prisma.documentMaster.create({
    data: {
      company_id: compA.id,
      document_no: 'DOC-A',
      title: 'A',
      category: 'A',
      status: 'ACTIVE',
      uploaded_by: userA.id,
    },
  });

  console.log('\n--- PHASE A: RBAC & AUTHENTICATION MATRIX ---');
  let res = await request(app.getHttpServer())
    .put(`/inventory/categories/${catA.id}`)
    .send({ name: 'Update' });
  if (res.status === 401)
    pass('D', 'Unauthenticated request correctly returns 401');
  else fail('D', `Expected 401, got ${res.status}`);

  res = await request(app.getHttpServer())
    .put(`/inventory/categories/${catA.id}`)
    .set('Authorization', `Bearer INVALID`)
    .send({ name: 'Update' });
  if (res.status === 401)
    pass('E', 'Invalid JWT request correctly returns 401');
  else fail('E', `Expected 401, got ${res.status}`);

  res = await request(app.getHttpServer())
    .put(`/inventory/categories/${catA.id}`)
    .set('Authorization', `Bearer ${tokenNoPermStr}`)
    .send({ name: 'Update' });
  if (res.status === 403)
    pass('F', 'Valid JWT but unauthorized role returns 403');
  else fail('F', `Expected 403, got ${res.status}`);

  res = await request(app.getHttpServer())
    .put(`/inventory/categories/${catA.id}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'Updated Cat A' });
  if (res.status === 200 || res.status === 201)
    pass('G', 'Authorized request succeeds');
  else
    fail('G', `Expected 20X, got ${res.status}: ${JSON.stringify(res.body)}`);

  console.log('\n--- PHASE B: INVENTORY TENANT IDOR ---');
  res = await request(app.getHttpServer())
    .put(`/inventory/categories/${catA.id}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ name: 'Hacked' });
  if (res.status === 404)
    pass('H', 'Cross-tenant update returns 404 NotFound to obscure existence');
  else fail('H', `Expected 404, got ${res.status}`);

  res = await request(app.getHttpServer())
    .delete(`/inventory/categories/${catA.id}`)
    .set('Authorization', `Bearer ${tokenB}`);
  if (res.status === 404) pass('I', 'Cross-tenant delete returns 404 NotFound');
  else fail('I', `Expected 404, got ${res.status}`);

  const checkCatA = await prisma.category.findUnique({
    where: { id: catA.id },
  });
  if (checkCatA && checkCatA.name === 'Updated Cat A')
    pass('J', 'Category A remains safely unchanged after cross-tenant attack');
  else fail('J', 'Category A was modified or deleted!');

  console.log('\n--- PHASE C: DOCUMENT SHARE-LINK IDOR & AUDIT LOG ---');
  const docService = app.get(DocumentService);
  let success = false;
  try {
    await docService.generateShareLink(compA.id, docA.id, userA.id, 7);
    success = true;
  } catch (e) {
    console.error(e);
  }
  if (success) pass('K', 'Same-tenant share link generation succeeds');
  else fail('K', 'Same-tenant share link failed');

  const auditA_user = await prisma.auditLog.findFirst({
    where: { action: 'SHARE_LINK_GENERATED', user_id: userA.id },
  });
  if (auditA_user && auditA_user.company_id === compA.id)
    pass('L', 'AuditLog created successfully with correct company_id context');
  else fail('L', 'AuditLog missing or wrong company_id');

  let rejected = false;
  try {
    await docService.generateShareLink(compB.id, docA.id, userB.id, 7);
  } catch (e) {
    if (e.status === 404 || e.message === 'Document not found') rejected = true;
  }
  if (rejected)
    pass('M', 'Cross-tenant share link generation returns 404 NotFound');
  else fail('M', 'Expected rejection');

  const auditB = await prisma.auditLog.findFirst({
    where: { action: 'SHARE_LINK_GENERATED', user_id: userB.id },
  });
  if (!auditB)
    pass(
      'N',
      'No false-positive successful AuditLog created for rejected request',
    );
  else fail('N', 'AuditLog was created for rejected cross-tenant request!');

  await app.close();
  await replSet.stop();
  console.log('\n------------------------------------------------------');
  console.log('  ? FINAL VERDICT: FULL GO');
  console.log('------------------------------------------------------\n');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
