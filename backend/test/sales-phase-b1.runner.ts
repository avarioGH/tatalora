import assert from 'assert';
import { SalesOrderService } from '../src/crm/quotation/sales-order.service';
import { QuotationService } from '../src/crm/quotation/quotation.service';
import { BadRequestException } from '@nestjs/common';

async function runTests() {
  console.log('--- STARTING SALES PHASE B1 INTEGRITY TESTS ---');

  const mockCompanyId = 'comp-test-123';
  const mockUserId = 'user-test-456';

  let createdOrders: any[] = [];
  let quotations: any[] = [];
  let upfrontPayments: any[] = [];

  const prismaMock: any = {
    $transaction: async (cb: any) => cb(prismaMock),
    product: {
      findUnique: async ({ where }: any) => {
        if (where.id === 'p1') {
          return { id: 'p1', name: 'Meranti Wood', company_id: mockCompanyId, selling_price: 250000 };
        }
        if (where.id === 'p-foreign') {
          return { id: 'p-foreign', name: 'Foreign Goods', company_id: 'comp-other', selling_price: 100000 };
        }
        return null;
      },
    },
    salesOrder: {
      create: async ({ data }: any) => {
        const record = { id: `so-${Date.now()}-${Math.random()}`, ...data };
        createdOrders.push(record);
        return record;
      },
      findFirst: async ({ where }: any) => {
        return createdOrders.find(
          (o) =>
            (!where.company_id || o.company_id === where.company_id) &&
            (!where.quotation_id || o.quotation_id === where.quotation_id),
        ) || null;
      },
      findUnique: async ({ where }: any) => {
        return createdOrders.find((o) => o.id === where.id) || null;
      },
      findMany: async ({ where }: any) => {
        return createdOrders.filter((o) => !where.company_id || o.company_id === where.company_id);
      },
    },
    quotation: {
      findFirst: async ({ where }: any) => {
        return quotations.find(
          (q) => (!where.company_id || q.company_id === where.company_id) && (!where.id || q.id === where.id),
        ) || null;
      },
      updateMany: async ({ where, data }: any) => {
        const target = quotations.find(
          (q) =>
            q.id === where.id &&
            q.company_id === where.company_id &&
            (!where.status?.not || q.status !== where.status.not),
        );
        if (target) {
          Object.assign(target, data);
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    financeTransaction: {
      create: async () => {
        throw new Error('FinanceTransaction must NEVER be created during Sales Order creation!');
      },
    },
  };

  const paymentServiceMock: any = {
    create: async (compId: string, data: any, userId?: string) => {
      upfrontPayments.push({ compId, data, userId });
      return { id: `pay-${Date.now()}` };
    },
  };

  const sequenceServiceMock: any = {
    generateNumber: async (tx: any, compId: string, type: string, prefix: string) => {
      return `${prefix}/2026/00001`;
    },
  };

  const salesOrderService = new SalesOrderService(prismaMock, paymentServiceMock, sequenceServiceMock);
  const quotationService = new QuotationService(prismaMock, sequenceServiceMock);

  // Test 1: Sales Order creation does NOT issue stock or post finance income
  console.log('Running Test 1: SO creation does NOT post premature finance entries or stock...');
  const soResult = await salesOrderService.create(
    mockCompanyId,
    {
      customer_id: 'cust-1',
      items: [{ product_id: 'p1', qty: 4, unit_price: 250000 }],
    },
    mockUserId,
  );
  assert.strictEqual(soResult.order_number, 'SO/2026/00001', 'SequenceService SO number generated');
  assert.strictEqual(soResult.subtotal, 1000000, 'Subtotal correctly calculated server-side');
  assert.strictEqual(soResult.total_amount, 1000000, 'Total amount correctly calculated server-side');
  assert.strictEqual(soResult.payment_status, 'UNPAID', 'Default payment status is UNPAID');
  assert.strictEqual(upfrontPayments.length, 0, 'No payment created when paidAmount is 0');
  console.log('✓ Test 1 passed!');

  // Test 2: Sales Order enforces company/tenant isolation
  console.log('Running Test 2: SO enforces tenant isolation on line items...');
  let tenantIsolated = false;
  try {
    await salesOrderService.create(
      mockCompanyId,
      {
        customer_id: 'cust-1',
        items: [{ product_id: 'p-foreign', qty: 1 }],
      },
      mockUserId,
    );
  } catch (err: any) {
    if (err instanceof BadRequestException) {
      tenantIsolated = true;
    }
  }
  assert.strictEqual(tenantIsolated, true, 'Rejected foreign company product');
  console.log('✓ Test 2 passed!');

  // Test 3: Upfront B2B payment delegates cleanly to PaymentService
  console.log('Running Test 3: Upfront B2B payment delegates to PaymentService...');
  const upfrontOrder = await salesOrderService.create(
    mockCompanyId,
    {
      customer_id: 'cust-1',
      paidAmount: 500000,
      payment_method: 'Transfer',
      items: [{ product_id: 'p1', qty: 2, unit_price: 250000 }],
    },
    mockUserId,
  );
  assert.strictEqual(upfrontPayments.length, 1, 'PaymentService called for upfront payment');
  assert.strictEqual(upfrontPayments[0].data.amount, 500000, 'Correct upfront amount passed');
  assert.strictEqual(upfrontPayments[0].data.salesOrderId, upfrontOrder.id, 'Allocated to Sales Order ID');
  console.log('✓ Test 3 passed!');

  // Test 4: Quotation conversion generates valid SO number using SequenceService & preserves all fields
  console.log('Running Test 4: Quotation conversion preserves line items, amounts, and source references...');
  const testQuotation: any = {
    id: 'quo-100',
    company_id: mockCompanyId,
    customer_id: 'cust-100',
    status: 'DRAFT',
    subtotal: 500000,
    discount_percent: 10,
    discount_amount: 50000,
    tax: 49500,
    total_amount: 499500,
    payment_terms: 'net30',
    billing_address: 'Alamat Tagihan 1',
    delivery_address: 'Alamat Kirim 1',
    email: 'client@tatalora.id',
    tag: 'VIP-CLIENT',
    client_ref: 'PO-REF-100',
    currency: 'IDR',
    notes: 'Quotation test notes',
    items: [
      {
        product_id: 'p1',
        qty: 2,
        unit_price: 250000,
        subtotal: 500000,
      },
    ],
  };
  quotations.push(testQuotation);

  const convertedSo = await quotationService.confirm(mockCompanyId, 'quo-100');
  assert.strictEqual(convertedSo.order_number, 'SO/2026/00001', 'Order number generated via SequenceService');
  assert.strictEqual(convertedSo.quotation_id, 'quo-100', 'Quotation ID preserved');
  assert.strictEqual(convertedSo.subtotal, 500000, 'Subtotal preserved');
  assert.strictEqual(convertedSo.discount_amount, 50000, 'Discount preserved');
  assert.strictEqual(convertedSo.tax, 49500, 'Tax preserved');
  assert.strictEqual(convertedSo.total_amount, 499500, 'Total amount preserved');
  assert.strictEqual(convertedSo.billing_address, 'Alamat Tagihan 1', 'Billing address preserved');
  assert.strictEqual(convertedSo.delivery_address, 'Alamat Kirim 1', 'Delivery address preserved');
  assert.strictEqual(convertedSo.client_ref, 'PO-REF-100', 'Client reference preserved');
  assert.strictEqual(testQuotation.status, 'CONFIRMED', 'Quotation marked CONFIRMED');
  console.log('✓ Test 4 passed!');

  // Test 5: Duplicate conversion is prevented
  console.log('Running Test 5: Duplicate quotation conversion is rejected...');
  let duplicateRejected = false;
  try {
    await quotationService.confirm(mockCompanyId, 'quo-100');
  } catch (err: any) {
    if (err instanceof BadRequestException) {
      duplicateRejected = true;
    }
  }
  assert.strictEqual(duplicateRejected, true, 'Duplicate conversion correctly rejected');
  console.log('✓ Test 5 passed!');

  // Test 6: Concurrent conversion is rejected
  console.log('Running Test 6: Concurrent race condition conversion is rejected...');
  const raceQuotation: any = {
    id: 'quo-race',
    company_id: mockCompanyId,
    customer_id: 'cust-100',
    status: 'SENT',
    subtotal: 250000,
    total_amount: 250000,
    items: [{ product_id: 'p1', qty: 1, unit_price: 250000, subtotal: 250000 }],
  };
  quotations.push(raceQuotation);
  // Simulate race condition where updateMany matches 0 rows because another worker confirmed it
  const originalUpdateMany = prismaMock.quotation.updateMany;
  prismaMock.quotation.updateMany = async () => ({ count: 0 });

  let raceConditionCaught = false;
  try {
    await quotationService.confirm(mockCompanyId, 'quo-race');
  } catch (err: any) {
    if (err instanceof BadRequestException && err.message.includes('concurrently modified')) {
      raceConditionCaught = true;
    }
  }
  assert.strictEqual(raceConditionCaught, true, 'Race condition prevented');
  prismaMock.quotation.updateMany = originalUpdateMany;
  console.log('✓ Test 6 passed!');

  console.log('--- ALL 6 TARGETED INTEGRITY TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
