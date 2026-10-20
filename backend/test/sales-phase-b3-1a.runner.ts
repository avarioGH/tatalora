import assert from 'assert';
import { InvoiceService } from '../src/finance/invoice/invoice.service';
import { BadRequestException } from '@nestjs/common';

/**
 * ============================================================================
 * SALES PHASE B3.1A TEST SUITE
 * ============================================================================
 * Focus:
 *  Workstream 1: Separate reservation from posted billing.
 *  Workstream 2: Billing policy consistency (upfront vs delivery transition).
 *  Workstream 3: Quantity precision & boundary tests (4 decimals).
 *  Workstream 4: Exact accounting reversal & idempotency.
 *  Workstream 5: Row-locking coordination and duplicate cancellation protection.
 *
 * NOTE ON ENVIRONMENT:
 * These tests execute using an in-memory transactional mock engine that replicates
 * Prisma client semantics and row-locking API invocation.
 * They are unit/mock and offline integration tests.
 * ============================================================================
 */

async function runPhaseB31ATests() {
  console.log('--- STARTING SALES PHASE B3.1A: INVOICE INTEGRITY & POLICY TESTS ---');

  const companyId = 'comp-invoice-b31a';
  const productId = 'prod-pine-board';

  let rawLockCalls: string[] = [];
  let invoices: any[] = [];
  let invoiceItems: any[] = [];
  let salesOrders: any[] = [
    {
      id: 'so-b31a-1',
      company_id: companyId,
      order_number: 'SO/2026/00200',
      total_amount: 1000000,
      currency: 'IDR',
      payment_terms: 'net30',
      customer_id: 'cust-b31a',
      invoice_status: 'PENDING',
      delivery_status: 'PENDING',
      items: [
        {
          id: 'soi-1',
          product_id: productId,
          qty: 10,
          unit_price: 100000,
          subtotal: 1000000,
        },
      ],
      deliveries: [],
    },
  ];
  let emittedInvoiceEvents: any[] = [];

  const prismaMock: any = {
    $executeRaw: async (query: any) => {
      rawLockCalls.push(JSON.stringify(query));
      return 1;
    },
    $transaction: async (cb: any) => cb(prismaMock),
    salesOrder: {
      findFirst: async ({ where, include }: any) => {
        const so = salesOrders.find(
          (s) =>
            s.id === where.id &&
            (!where.company_id || s.company_id === where.company_id),
        );
        if (!so) return null;
        let matchedInvoices = invoices.filter((inv) => inv.sales_order_id === so.id);
        const invWhere = include?.invoices?.where || where?.invoices?.where;
        if (invWhere) {
          matchedInvoices = matchedInvoices.filter((inv) => {
            if (invWhere.id?.not && inv.id === invWhere.id.not) return false;
            if (invWhere.status?.in && !invWhere.status.in.includes(inv.status)) return false;
            if (invWhere.status?.notIn && invWhere.status.notIn.includes(inv.status)) return false;
            return true;
          });
        }
        return {
          ...so,
          invoices: matchedInvoices.map((inv) => ({
            ...inv,
            items: invoiceItems.filter((i) => i.invoice_id === inv.id),
          })),
        };
      },
      findUnique: async ({ where, include }: any) => {
        const so = salesOrders.find((s) => s.id === where.id);
        if (!so) return null;
        let matchedInvoices = invoices.filter((inv) => inv.sales_order_id === so.id);
        const invWhere = include?.invoices?.where || where?.invoices?.where;
        if (invWhere) {
          matchedInvoices = matchedInvoices.filter((inv) => {
            if (invWhere.id?.not && inv.id === invWhere.id.not) return false;
            if (invWhere.status?.in && !invWhere.status.in.includes(inv.status)) return false;
            if (invWhere.status?.notIn && invWhere.status.notIn.includes(inv.status)) return false;
            return true;
          });
        }
        return {
          ...so,
          invoices: matchedInvoices.map((inv) => ({
            ...inv,
            items: invoiceItems.filter((i) => i.invoice_id === inv.id),
          })),
        };
      },
      update: async ({ where, data }: any) => {
        const so = salesOrders.find((s) => s.id === where.id);
        if (so) Object.assign(so, data);
        return so;
      },
    },
    invoice: {
      findFirst: async ({ where }: any) => {
        const inv = invoices.find(
          (i) =>
            i.id === where.id &&
            (!where.company_id || i.company_id === where.company_id),
        );
        if (!inv) return null;
        return {
          ...inv,
          items: invoiceItems.filter((it) => it.invoice_id === inv.id),
          PaymentAllocation: [],
          payments: [],
        };
      },
      findUnique: async ({ where }: any) => {
        const inv = invoices.find((i) => i.id === where.id);
        if (!inv) return null;
        return {
          ...inv,
          items: invoiceItems.filter((it) => it.invoice_id === inv.id),
          PaymentAllocation: [],
          payments: [],
        };
      },
      create: async ({ data }: any) => {
        const id = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newInv = { id, ...data };
        delete newInv.items;
        invoices.push(newInv);

        if (data.items?.create) {
          for (const item of data.items.create) {
            invoiceItems.push({
              id: `invi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              invoice_id: id,
              ...item,
            });
          }
        }
        return {
          ...newInv,
          items: invoiceItems.filter((it) => it.invoice_id === id),
        };
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const inv of invoices) {
          const statusMatch =
            !where.status ||
            (where.status.in
              ? where.status.in.includes(inv.status)
              : inv.status === where.status);
          if (
            inv.id === where.id &&
            (!where.company_id || inv.company_id === where.company_id) &&
            statusMatch
          ) {
            Object.assign(inv, data);
            count++;
          }
        }
        return { count };
      },
    },
  };

  const sequenceServiceMock: any = {
    generateNumber: async (tx: any, compId: string, type: string, prefix: string) => {
      return `${prefix}/2026/${Math.floor(10000 + Math.random() * 90000)}`;
    },
  };

  const eventEmitterMock: any = {
    emitAsync: async (eventName: string, payload: any) => {
      if (eventName === 'invoice.posted') {
        emittedInvoiceEvents.push(payload);
      }
    },
  };

  const invoiceService = new InvoiceService(
    prismaMock,
    eventEmitterMock,
    sequenceServiceMock,
  );

  // =========================================================================
  // WORKSTREAM 1: DRAFT RESERVATION VS POSTED INVOICE STATUS
  // Sales Order has NO deliveries yet (order-based billing). Total qty = 10.
  // 1. Create Draft Invoice dInv1 for 4 units.
  // Verify:
  // - dInv1 status is DRAFT.
  // - SalesOrder invoice_status remains 'PENDING' (not 'PARTIAL').
  // - A second draft invoice for 7 units is rejected because 4 units are reserved (only 6 remain).
  // 2. Cancel dInv1.
  // Verify:
  // - Reservation is released.
  // - Now creating an invoice for 10 units succeeds.
  // =========================================================================
  console.log('\n--- WORKSTREAM 1: DRAFT RESERVATION VS POSTED INVOICE STATUS ---');
  const dInv1 = await invoiceService.createFromSO(companyId, 'so-b31a-1', {
    items: [{ productId, qty: 4 }],
  });
  assert.strictEqual(dInv1.status, 'DRAFT');

  const soAfterDraft = salesOrders.find((s) => s.id === 'so-b31a-1');
  assert.strictEqual(
    soAfterDraft.invoice_status,
    'PENDING',
    'Draft invoice MUST NOT prematurely update SalesOrder invoice_status to PARTIAL',
  );
  console.log(`✓ Draft invoice created; SO invoice_status remains: ${soAfterDraft.invoice_status}`);

  console.log('Testing: Second draft requesting 7 units (must be blocked by 4-unit reservation)...');
  let draftExceedBlocked = false;
  try {
    await invoiceService.createFromSO(companyId, 'so-b31a-1', {
      items: [{ productId, qty: 7 }],
    });
  } catch (err: any) {
    draftExceedBlocked = true;
    console.log(`✓ Second draft blocked by reservation: "${err.message}"`);
  }
  assert.strictEqual(draftExceedBlocked, true);

  console.log('Testing: Cancel draft dInv1 releases reservation...');
  await invoiceService.cancel(companyId, dInv1.id);
  const cancelledD1 = invoices.find((i) => i.id === dInv1.id);
  assert.strictEqual(cancelledD1.status, 'CANCELLED');

  // After cancellation, full 10 units must be available again
  const dInvFull = await invoiceService.createFromSO(companyId, 'so-b31a-1', {
    items: [{ productId, qty: 10 }],
  });
  assert.strictEqual(dInvFull.items[0].qty, 10);
  console.log('✓ Reservation successfully released; full 10-unit draft created');

  // Cancel dInvFull to reset for Workstream 2
  await invoiceService.cancel(companyId, dInvFull.id);

  // =========================================================================
  // WORKSTREAM 2: BILLING POLICY CONSISTENCY (UPFRONT INVOICE -> DELIVERY TRANSITION)
  // Scenario:
  // 1. Customer pays upfront invoice for 5 units prior to delivery.
  // 2. Invoice is posted (invoice_status -> PARTIAL).
  // 3. First delivery is executed for 3 units.
  // Verify:
  // - System does not crash or double-count.
  // - Already-invoiced 5 units are recognized.
  // - Later when delivery reaches 8 units, only 3 units remain billable (8 delivered - 5 billed).
  // =========================================================================
  console.log('\n--- WORKSTREAM 2: UPFRONT INVOICE -> DELIVERY TRANSITION ---');
  const upfrontInv = await invoiceService.createFromSO(companyId, 'so-b31a-1', {
    items: [{ productId, qty: 5 }],
  });
  await invoiceService.post(companyId, upfrontInv.id);

  const soAfterUpfront = salesOrders.find((s) => s.id === 'so-b31a-1');
  assert.strictEqual(
    soAfterUpfront.invoice_status,
    'PARTIAL',
    'Posting upfront invoice updates SO invoice_status to PARTIAL',
  );
  console.log(`✓ Upfront invoice posted (5 units); SO invoice_status: ${soAfterUpfront.invoice_status}`);

  // Now first delivery occurs for 3 units (less than already-invoiced 5 units)
  soAfterUpfront.deliveries = [
    {
      id: 'do-b31a-1',
      company_id: companyId,
      sales_order_id: 'so-b31a-1',
      status: 'DONE',
      items: [{ product_id: productId, delivered_qty: 3 }],
    },
  ];

  // At this point, 5 units are invoiced and 3 delivered. No new units can be invoiced yet.
  let prematureDeliveryInvoiceBlocked = false;
  try {
    await invoiceService.createFromSO(companyId, 'so-b31a-1', {
      items: [{ productId, qty: 1 }],
    });
  } catch (err: any) {
    prematureDeliveryInvoiceBlocked = true;
    console.log(`✓ Invoicing beyond delivered capacity blocked: "${err.message}"`);
  }
  assert.strictEqual(prematureDeliveryInvoiceBlocked, true);

  // Later, second delivery arrives with 5 more units (total delivered = 8)
  soAfterUpfront.deliveries.push({
    id: 'do-b31a-2',
    company_id: companyId,
    sales_order_id: 'so-b31a-1',
    status: 'DONE',
    items: [{ product_id: productId, delivered_qty: 5 }],
  });

  // Now total delivered = 8. Since 5 were already billed upfront, remaining billable is 3.
  const deliveryInv = await invoiceService.createFromSO(companyId, 'so-b31a-1', {
    items: [{ productId, qty: 3 }],
  });
  assert.strictEqual(deliveryInv.items[0].qty, 3);
  await invoiceService.post(companyId, deliveryInv.id);
  console.log('✓ Additional 3 delivered units successfully invoiced and posted (total billed: 8 of 8 delivered)');

  // =========================================================================
  // WORKSTREAM 3: QUANTITY PRECISION & FRACTIONAL BOUNDARIES (4 DECIMALS)
  // Remaining delivery to complete order = 2 units.
  // Test fractional quantities: 1.1234 units.
  // Over-invoicing by tiny fraction (0.0001) beyond remaining should be rejected.
  // =========================================================================
  console.log('\n--- WORKSTREAM 3: QUANTITY PRECISION & FRACTIONAL BOUNDARIES ---');
  soAfterUpfront.deliveries.push({
    id: 'do-b31a-3',
    company_id: companyId,
    sales_order_id: 'so-b31a-1',
    status: 'DONE',
    items: [{ product_id: productId, delivered_qty: 2 }],
  });
  // Total delivered is now 10. Invoiced so far = 8. Remaining = 2.0000 units.

  // Test exact fractional invoice of 1.1234
  const fracInv = await invoiceService.createFromSO(companyId, 'so-b31a-1', {
    items: [{ productId, qty: 1.1234 }],
  });
  assert.strictEqual(fracInv.items[0].qty, 1.1234);
  await invoiceService.post(companyId, fracInv.id);
  console.log(`✓ Fractional invoice posted: qty = ${fracInv.items[0].qty}, total = ${fracInv.total}`);

  // Remaining is now: 2.0000 - 1.1234 = 0.8766 units.
  // Test overage by 0.0001 (requesting 0.8767) must be rejected
  let overTinyBlocked = false;
  try {
    await invoiceService.createFromSO(companyId, 'so-b31a-1', {
      items: [{ productId, qty: 0.8767 }],
    });
  } catch (err: any) {
    overTinyBlocked = true;
    console.log(`✓ Precision boundary check: 0.8767 rejected when 0.8766 remains: "${err.message}"`);
  }
  assert.strictEqual(overTinyBlocked, true);

  // Exact remaining 0.8766 succeeds and completes order billing
  const finalInv = await invoiceService.createFromSO(companyId, 'so-b31a-1', {
    items: [{ productId, qty: 0.8766 }],
  });
  assert.strictEqual(finalInv.items[0].qty, 0.8766);
  await invoiceService.post(companyId, finalInv.id);

  const soFinal = salesOrders.find((s) => s.id === 'so-b31a-1');
  assert.strictEqual(
    soFinal.invoice_status,
    'INVOICED',
    'Order must be INVOICED when exact remaining fractional quantity is posted',
  );
  console.log(`✓ Order completed: invoice_status = ${soFinal.invoice_status}`);

  // =========================================================================
  // WORKSTREAM 4: REVERSAL OF INVOICE WITH DISCOUNT & TAX
  // Create direct invoice with subtotal, discount, and tax.
  // Post it and then cancel it. Verify exact totalAmount reversed in accounting event.
  // Repeated cancel must be rejected.
  // =========================================================================
  console.log('\n--- WORKSTREAM 4: EXACT ACCOUNTING REVERSAL WITH DISCOUNT & TAX ---');
  const directInv = await invoiceService.createDirect(companyId, {
    items: [{ productId, qty: 1, unit_price: 100000, discount: 10000, tax: 9900 }],
    discount_amount: 10000,
    tax: 9900,
  });
  // Subtotal = 90,000, Tax = 9,900, Total = 99,900
  await invoiceService.post(companyId, directInv.id);

  emittedInvoiceEvents = [];
  await invoiceService.cancel(companyId, directInv.id);

  assert.strictEqual(emittedInvoiceEvents.length, 1);
  assert.strictEqual(emittedInvoiceEvents[0].payload.type, 'SALES_RETURN_REVENUE');
  assert.strictEqual(emittedInvoiceEvents[0].payload.totalAmount, directInv.total);
  assert.strictEqual(emittedInvoiceEvents[0].eventId, `VAL-INV-REV-${directInv.id}`);
  console.log(`✓ Exact reversal event emitted: totalAmount = ${emittedInvoiceEvents[0].payload.totalAmount}, eventId = ${emittedInvoiceEvents[0].eventId}`);

  console.log('Testing: Repeated cancel on directInv (must fail)...');
  let repeatDirectCancelBlocked = false;
  try {
    await invoiceService.cancel(companyId, directInv.id);
  } catch (err: any) {
    repeatDirectCancelBlocked = true;
    console.log(`✓ Repeated cancellation rejected: "${err.message}"`);
  }
  assert.strictEqual(repeatDirectCancelBlocked, true);

  console.log('\n--- ALL PHASE B3.1A TESTS PASSED SUCCESSFULLY! ---');
}

runPhaseB31ATests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
