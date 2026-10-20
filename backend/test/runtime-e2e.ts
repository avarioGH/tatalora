import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { ObjectId } from 'bson';

async function bootstrap() {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.DATABASE_URL = mongod.getUri().replace('/?', '/erp_e2e?');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const prisma = app.get(PrismaService);
  await app.init();

  const c1 = new ObjectId().toHexString();
  await prisma.company.create({
    data: { id: c1, name: 'COMPANY_E2E', timezone: 'UTC' },
  });

  const roleFullId = new ObjectId().toHexString();
  await prisma.role.create({
    data: { id: roleFullId, company_id: c1, name: 'FULL_ADMIN' },
  });

  const p1 = new ObjectId().toHexString();
  await prisma.permission.create({
    data: { id: p1, name: '*', description: 'All' },
  });
  await prisma.rolePermission.create({
    data: { role_id: roleFullId, permission_id: p1 },
  });

  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: {
      id: new ObjectId().toHexString(),
      company_id: c1,
      username: 'admin',
      name: 'Admin',
      password: hash,
      role_id: roleFullId,
    },
  });

  await prisma.accountingPeriod.create({
    data: {
      id: new ObjectId().toHexString(),
      company_id: c1,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: 'OPEN',
      start_date: new Date('2000-01-01'),
      end_date: new Date('2100-01-01'),
    },
  });

  const empId = new ObjectId().toHexString();
  await (prisma as any).employee.create({
    data: {
      id: empId,
      company_id: c1,
      first_name: 'Budi',
      last_name: 'E2E',
      employee_code: 'EMP-001',
      status: 'ACTIVE',
    },
  });

  const catId = new ObjectId().toHexString();
  await prisma.financeCategory.create({
    data: {
      id: catId,
      company_id: c1,
      name: 'Travel Expense',
      type: 'EXPENSE',
    },
  });

  // --- SEED CUSTOMER 360 TEST DATA ---
  const custId = new ObjectId().toHexString();
  await prisma.customer.create({
    data: {
      id: custId,
      company_id: c1,
      name: 'E2E Mega Corp',
      code: 'CUST-E2E-001',
      email: 'mega@e2e.local',
      phone: '555-1234',
      address: '123 E2E Street',
    },
  });

  const leadId = new ObjectId().toHexString();
  await prisma.lead.create({
    data: {
      id: leadId,
      company_id: c1,
      name: 'E2E Lead Contact',
      email: 'lead@e2e.local',
      phone: '555-9999',
      expected_value: 5000,
      status: 'QUALIFIED',
      lead_code: 'L-E2E-001',
      source: 'MANUAL',
      assigned_user: 'Admin',
    },
  });

  const oppId = new ObjectId().toHexString();
  await prisma.opportunity.create({
    data: {
      id: oppId,
      company_id: c1,
      title: 'Mega Corp Software Deal',
      expected_value: 50000,
      probability: 75,
      stage: 'PROPOSAL',
      customer_id: custId,
      lead_id: leadId,
      assigned_user: 'Admin',
    },
  });

  const actId = new ObjectId().toHexString();
  await prisma.crmActivity.create({
    data: {
      id: actId,
      company_id: c1,
      type: 'CALL',
      title: 'Introductory Call',
      description: 'Discussed requirements',
      status: 'COMPLETED',
      customer_id: custId,
      opportunity_id: oppId,
      assigned_user: 'Admin',
      due_date: new Date(),
    },
  });

  const quoId = new ObjectId().toHexString();
  await prisma.quotation.create({
    data: {
      id: quoId,
      company_id: c1,
      customer_id: custId,
      quotation_number: 'QUO-E2E-001',
      quotation_date: new Date(),
      status: 'SENT',
      total_amount: 50000,
    },
  });

  const soId = new ObjectId().toHexString();
  await prisma.salesOrder.create({
    data: {
      id: soId,
      company_id: c1,
      customer_id: custId,
      order_number: 'SO-E2E-001',
      order_date: new Date(),
      status: 'CONFIRMED',
      total_amount: 50000,
    },
  });

  const doId = new ObjectId().toHexString();
  await prisma.deliveryOrder.create({
    data: {
      id: doId,
      company_id: c1,
      sales_order_id: soId,
      delivery_number: 'DO-E2E-001',
      delivery_date: new Date(),
      status: 'SHIPPED',
    },
  });

  const invId = new ObjectId().toHexString();
  await prisma.invoice.create({
    data: {
      id: invId,
      company_id: c1,
      customer_id: custId,
      sales_order_id: soId,
      invoice_number: 'INV-E2E-001',
      invoice_date: new Date(),
      due_date: new Date(),
      status: 'POSTED',
      subtotal: 50000,
      tax: 0,
      total: 50000,
      remaining_amount: 25000,
      type: 'AR',
    },
  });

  const payId = new ObjectId().toHexString();
  await prisma.payment.create({
    data: {
      id: payId,
      company_id: c1,
      invoice_id: invId,
      payment_number: 'PAY-E2E-001',
      payment_date: new Date(),
      amount: 25000,
      payment_method: 'BANK_TRANSFER',
    },
  });
  // -------------------------------------

  // --- NEW: Purchasing Seed Data for 20H.2 ---

  // Warehouse
  const whId = new ObjectId().toHexString();
  await prisma.warehouse.create({
    data: { id: whId, company_id: c1, code: 'WH-HQ', name: 'Main Depot' },
  });

  // Supplier
  const supId = new ObjectId().toHexString();
  await prisma.supplier.create({
    data: {
      id: supId,
      company_id: c1,
      code: 'SUP-01',
      name: 'Global Tech Suppliers',
      email: 'sales@globaltech.com',
      phone: '555-9000',
    },
  });

  // Unit
  const unitId = new ObjectId().toHexString();
  await prisma.unit.create({
    data: { id: unitId, company_id: c1, name: 'pcs' },
  });

  // Product
  const prodId = new ObjectId().toHexString();
  await prisma.product.create({
    data: {
      id: prodId,
      company_id: c1,
      code: 'CERT-01',
      name: 'Certification Product',
      unit_id: unitId,
      purchase_price: 10000,
      selling_price: 15000,
    },
  });

  // Supplier Product (For Comparison Matrix)
  await prisma.supplierProduct.create({
    data: {
      id: new ObjectId().toHexString(),
      company_id: c1,
      supplier_id: supId,
      product_id: prodId,
      unit_price: 9500,
      minimum_order_qty: 5,
      lead_time_days: 3,
      active: true,
    },
  });

  // Purchase Request
  const prId = new ObjectId().toHexString();
  await prisma.purchaseRequest.create({
    data: {
      id: prId,
      company_id: c1,
      request_number: 'PR-CERT-001',
      source: 'MANUAL',
      status: 'SUBMITTED',
      reason: 'Certification Testing',
      items: { create: [{ product_id: prodId, qty: 10 }] },
    },
  });

  // Create an explicit Purchase Order (PO-CERT-002) in CONFIRMED state for Partial Receiving tests
  const poId = new ObjectId().toHexString();
  await prisma.purchaseOrder.create({
    data: {
      id: poId,
      company_id: c1,
      supplier_id: supId,
      order_number: 'PO-CERT-002',
      order_date: new Date(),
      status: 'CONFIRMED',
      receipt_status: 'PENDING',
      bill_status: 'PENDING',
      payment_status: 'UNPAID',
      total_amount: 95000,
      warehouse_id: whId,
      items: {
        create: [
          {
            product_id: prodId,
            qty: 10,
            received_qty: 0,
            billed_qty: 0,
            unit_price: 9500,
            subtotal: 95000,
          },
        ],
      },
    },
  });

  // Add HR user
  const roleHrId = new ObjectId().toHexString();
  await prisma.role.create({
    data: { id: roleHrId, company_id: c1, name: 'HR Only' },
  });

  // Assign permissions to role
  await prisma.user.create({
    data: {
      id: new ObjectId().toHexString(),
      company_id: c1,
      username: 'hr_user',
      name: 'HR User',
      password: hash,
      role_id: roleHrId,
    },
  });

  await app.listen(3000, '0.0.0.0');
  console.log('E2E Server listening on port 3000');
}
bootstrap().catch(console.error);
