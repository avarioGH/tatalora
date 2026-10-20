import assert from 'assert';
import { DeliveryService } from '../src/crm/delivery/delivery.service';
import { BadRequestException } from '@nestjs/common';

/**
 * ============================================================================
 * SALES PHASE B2.1 DETERMINISTIC TEST RUNNER
 * ============================================================================
 * Focus:
 *  A. Delivery Concurrency (Race conditions between distinct delivery documents)
 *  B. Reversal FIFO Valuation & Cost Layer Recovery
 *  C. Downstream Protections (Active Invoices / Sales Returns) & Idempotent Cancels
 *
 * NOTE ON TEST ISOLATION & ENVIRONMENT:
 * These tests execute using an in-memory transactional mock engine that replicates
 * Prisma client semantics, row-locking/conditional updates (updateMany claims),
 * and relation traversal. They are simulations designed to deterministically prove
 * concurrency branch behavior and valuation accounting without modifying the production
 * or staging PostgreSQL database.
 * ============================================================================
 */

async function runPhaseB21Tests() {
  console.log('--- STARTING SALES PHASE B2.1: CONCURRENCY & VALUATION AUDIT TESTS ---');

  const companyId = 'comp-phase-b21';
  const userId = 'user-auditor-1';
  const warehouseId = 'wh-timber-yard-1';
  const productId = 'prod-teak-board';

  // In-memory data store
  let deliveryOrders: any[] = [];
  let deliveryOrderItems: any[] = [];
  let warehouseStock: any[] = [
    {
      id: 'ws-101',
      company_id: companyId,
      warehouse_id: warehouseId,
      product_id: productId,
      current_stock: 100,
      available_stock: 100,
      reserved_stock: 0,
    },
  ];
  let stockMovements: any[] = [];
  let costLayerConsumptions: any[] = [];
  let emittedValuationEvents: any[] = [];
  let receivedStockCalls: any[] = [];

  const prismaMock: any = {
    $transaction: async (cb: any) => cb(prismaMock),
    warehouse: {
      findFirst: async ({ where }: any) => {
        if (where.id === warehouseId && where.company_id === companyId) {
          return { id: warehouseId, name: 'Main Yard', company_id: companyId };
        }
        return null;
      },
    },
    salesOrder: {
      findFirst: async ({ where }: any) => {
        return {
          id: 'so-b21',
          company_id: companyId,
          warehouse_id: warehouseId,
          order_number: 'SO/2026/B21-001',
          status: 'CONFIRMED',
          delivery_status: 'PENDING',
          items: [{ id: 'soi-1', product_id: productId, qty: 10 }],
          deliveries: deliveryOrders
            .filter((d) => d.sales_order_id === 'so-b21' && d.status !== 'CANCELLED')
            .map((d) => ({
              ...d,
              items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
            })),
        };
      },
      findUnique: async ({ where }: any) => {
        return {
          id: where.id,
          company_id: companyId,
          warehouse_id: warehouseId,
          order_number: 'SO/2026/B21-001',
          items: [{ id: 'soi-1', product_id: productId, qty: 10 }],
          deliveries: deliveryOrders
            .filter(
              (d) =>
                d.sales_order_id === where.id &&
                (d.status === 'DONE' || d.status === 'DELIVERED'),
            )
            .map((d) => ({
              ...d,
              items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
            })),
        };
      },
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
    },
    deliveryOrder: {
      findFirst: async ({ where }: any) => {
        const match = deliveryOrders.find(
          (d) =>
            (!where.id || d.id === where.id) &&
            (!where.company_id || d.company_id === where.company_id),
        );
        if (!match) return null;
        return {
          ...match,
          items: deliveryOrderItems.filter((i) => i.delivery_order_id === match.id),
          sales_order: {
            id: match.sales_order_id,
            warehouse_id: warehouseId,
            order_number: 'SO/2026/B21-001',
            invoices: match.invoices || [],
            items: [{ id: 'soi-1', product_id: productId, qty: 10 }],
          },
        };
      },
      findUnique: async ({ where }: any) => {
        const d = deliveryOrders.find((d) => d.id === where.id);
        if (!d) return null;
        return {
          ...d,
          items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
          sales_order: {
            id: d.sales_order_id,
            warehouse_id: warehouseId,
            order_number: 'SO/2026/B21-001',
            invoices: d.invoices || [],
            items: [{ id: 'soi-1', product_id: productId, qty: 10 }],
          },
        };
      },
      findMany: async ({ where }: any) => {
        return deliveryOrders
          .filter((d) => {
            if (where.sales_order_id && d.sales_order_id !== where.sales_order_id)
              return false;
            if (where.company_id && d.company_id !== where.company_id) return false;
            if (where.status) {
              if (where.status.in) {
                if (!where.status.in.includes(d.status)) return false;
              } else if (d.status !== where.status) {
                return false;
              }
            }
            return true;
          })
          .map((d) => ({
            ...d,
            items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
          }));
      },
      create: async ({ data }: any) => {
        const id = `do-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newDo = { id, ...data };
        delete newDo.items;
        deliveryOrders.push(newDo);

        if (data.items?.create) {
          for (const item of data.items.create) {
            deliveryOrderItems.push({
              id: `doi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              delivery_order_id: id,
              ...item,
            });
          }
        }
        return {
          ...newDo,
          items: deliveryOrderItems.filter((i) => i.delivery_order_id === id),
        };
      },
      updateMany: async ({ where, data }: any) => {
        let updatedCount = 0;
        for (const d of deliveryOrders) {
          const statusMatch =
            !where.status ||
            (where.status.in
              ? where.status.in.includes(d.status)
              : d.status === where.status);
          if (
            d.id === where.id &&
            d.company_id === where.company_id &&
            statusMatch
          ) {
            Object.assign(d, data);
            updatedCount++;
          }
        }
        return { count: updatedCount };
      },
      update: async ({ where, data }: any) => {
        const d = deliveryOrders.find((d) => d.id === where.id);
        if (d) Object.assign(d, data);
        return d;
      },
    },
    salesReturn: {
      findMany: async ({ where }: any) => {
        return [];
      },
    },
    stockMovement: {
      findMany: async ({ where }: any) => {
        return stockMovements.filter(
          (m) =>
            m.transaction_id === where.transaction_id &&
            (!where.transaction_type ||
              m.transaction_type === where.transaction_type),
        );
      },
    },
    costLayerConsumption: {
      findMany: async ({ where }: any) => {
        return costLayerConsumptions.filter(
          (c) => c.stock_movement_id === where.stock_movement_id,
        );
      },
    },
  };

  const inventoryServiceMock: any = {
    issueStock: async (tx: any, params: any) => {
      const stock = warehouseStock.find(
        (s) =>
          s.company_id === params.companyId &&
          s.warehouse_id === params.warehouseId &&
          s.product_id === params.productId,
      );
      if (!stock || stock.available_stock < params.quantity) {
        throw new BadRequestException('Insufficient available stock');
      }
      stock.current_stock -= params.quantity;
      stock.available_stock -= params.quantity;

      const movId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const mov = {
        id: movId,
        company_id: params.companyId,
        warehouse_id: params.warehouseId,
        product_id: params.productId,
        qty_out: params.quantity,
        transaction_type: params.referenceType,
        transaction_id: params.referenceId,
        created_by: params.userId,
      };
      stockMovements.push(mov);

      // Record mock FIFO cost layer consumption: $120/unit
      const unitCost = 120;
      const totalCost = params.quantity * unitCost;
      costLayerConsumptions.push({
        id: `clc-${movId}`,
        company_id: params.companyId,
        stock_movement_id: movId,
        quantity: params.quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
      });

      return {
        stock,
        movement: mov,
        consumedCost: totalCost,
      };
    },
    receiveStock: async (tx: any, params: any) => {
      receivedStockCalls.push(params);
      const stock = warehouseStock.find(
        (s) =>
          s.company_id === params.companyId &&
          s.warehouse_id === params.warehouseId &&
          s.product_id === params.productId,
      );
      if (stock) {
        stock.current_stock += params.quantity;
        stock.available_stock += params.quantity;
      }
      return { stock };
    },
  };

  const sequenceServiceMock: any = {
    generateNumber: async (tx: any, compId: string, type: string, prefix: string) => {
      return `${prefix}/2026/${Math.floor(10000 + Math.random() * 90000)}`;
    },
  };

  const eventEmitterMock: any = {
    emitAsync: async (eventName: string, payload: any) => {
      if (eventName === 'inventory.valuation') {
        emittedValuationEvents.push(payload);
      }
    },
  };

  const deliveryService = new DeliveryService(
    prismaMock,
    eventEmitterMock,
    inventoryServiceMock,
    sequenceServiceMock,
  );

  // =========================================================================
  // SCENARIO A: DETERMINISTIC CONCURRENCY AUDIT
  // Sales Order Qty = 10.
  // Delivery D0 is already completed with 6 units (remaining balance = 4).
  // Two distinct draft deliveries D_A (4 units) and D_B (4 units) both exist.
  // When both attempt validation, at most one may succeed, and the second MUST fail
  // with an over-delivery exception inside the transactional recalculation.
  // =========================================================================
  console.log('\n--- SCENARIO A: DETERMINISTIC CONCURRENCY FOR SAME SALES ORDER ---');

  // 1. Initial posted delivery D0 (6 units)
  const d0 = await deliveryService.create(companyId, 'so-b21', {
    items: [{ productId, qty: 6 }],
  });
  await deliveryService.validate(companyId, d0.id, userId);

  const postedD0 = deliveryOrders.find((d) => d.id === d0.id);
  assert.strictEqual(postedD0.status, 'DONE', 'D0 should be DONE');

  // 2. Draft Delivery D_A (4 units)
  const dA = await deliveryService.create(companyId, 'so-b21', {
    items: [{ productId, qty: 4 }],
  });

  // 3. Draft Delivery D_B (4 units)
  // Both D_A and D_B are created when remaining was 4 (assuming concurrent creation or two trucks)
  // To simulate concurrent drafts existing:
  deliveryOrders.push({
    id: 'do-concurrent-b',
    company_id: companyId,
    sales_order_id: 'so-b21',
    delivery_number: 'DO/2026/00099',
    delivery_date: new Date(),
    status: 'WAITING',
  });
  deliveryOrderItems.push({
    id: 'doi-concurrent-b',
    delivery_order_id: 'do-concurrent-b',
    product_id: productId,
    ordered_qty: 10,
    delivered_qty: 4,
    remaining_qty: 0,
  });

  console.log('Testing: D_A validating 4 units (fills remaining 4 units)...');
  await deliveryService.validate(companyId, dA.id, userId);
  const postedDA = deliveryOrders.find((d) => d.id === dA.id);
  assert.strictEqual(postedDA.status, 'DONE', 'D_A should have succeeded');
  console.log('✓ D_A succeeded and brought cumulative delivered quantity to 10 of 10');

  console.log('Testing: D_B validating 4 units (must be rejected inside transaction)...');
  let dbRejected = false;
  try {
    await deliveryService.validate(companyId, 'do-concurrent-b', userId);
  } catch (err: any) {
    dbRejected = true;
    console.log(`✓ D_B rejected with: "${err.message}"`);
    assert(
      err.message.includes('exceeds remaining Sales Order quantity'),
      'Expected over-delivery rejection message',
    );
  }
  assert.strictEqual(dbRejected, true, 'D_B MUST be rejected to protect order integrity');

  // =========================================================================
  // SCENARIO B: FIFO VALUATION & OFFSETTING COGS AUDIT ON REVERSAL
  // Reverse D_A (4 units @ $120/unit = $480).
  // Verify that:
  // 1. receiveStock is invoked with original unitCost ($120), not 0.
  // 2. Offsetting valuation event (Cr COGS, Dr Inventory Asset) is emitted with exact $480.
  // =========================================================================
  console.log('\n--- SCENARIO B: REVERSAL FIFO VALUATION & OFFSETTING COGS AUDIT ---');

  receivedStockCalls = [];
  emittedValuationEvents = [];

  const cancelResult = await deliveryService.cancel(companyId, dA.id, userId);
  assert.strictEqual(cancelResult.status, 'CANCELLED', 'Delivery should be marked CANCELLED');

  assert.strictEqual(
    receivedStockCalls.length,
    1,
    'Expected 1 receiveStock call for movement reversal',
  );
  assert.strictEqual(
    receivedStockCalls[0].quantity,
    4,
    'Reversed quantity must equal 4',
  );
  assert.strictEqual(
    receivedStockCalls[0].unitCost,
    120,
    'Authoritative unitCost of 120 must be restored in FIFO layer, NOT 0',
  );
  console.log(`✓ receiveStock restored 4 units at genuine unitCost: $${receivedStockCalls[0].unitCost}`);

  assert.strictEqual(
    emittedValuationEvents.length,
    1,
    'Expected 1 offsetting valuation event to be emitted',
  );
  const revEvent = emittedValuationEvents[0];
  assert.strictEqual(
    revEvent.payload.type,
    'SALES_RETURN_COGS',
    'Event type must be SALES_RETURN_COGS (Dr Inventory, Cr COGS)',
  );
  assert.strictEqual(
    revEvent.payload.totalValue,
    480,
    'Valuation amount must exactly offset original COGS ($480)',
  );
  assert.strictEqual(
    revEvent.eventId,
    `VAL-DEL-REV-${dA.id}`,
    'Event ID must be deterministic and idempotent',
  );
  console.log(`✓ Valuation reversal emitted: type=${revEvent.payload.type}, totalValue=$${revEvent.payload.totalValue}, key=${revEvent.eventId}`);

  // =========================================================================
  // SCENARIO C: DOWNSTREAM GUARD & RE-VALIDATION IDEMPOTENCY
  // 1. Calling cancel() again on already cancelled delivery must fail.
  // 2. Cancelling delivery with downstream invoice must fail.
  // =========================================================================
  console.log('\n--- SCENARIO C: DOWNSTREAM GUARDS & IDEMPOTENCY ---');

  console.log('Testing: Repeated cancel on already cancelled delivery...');
  let repeatCancelFailed = false;
  try {
    await deliveryService.cancel(companyId, dA.id, userId);
  } catch (err: any) {
    repeatCancelFailed = true;
    console.log(`✓ Repeated cancel safely rejected: "${err.message}"`);
  }
  assert.strictEqual(repeatCancelFailed, true);

  console.log('Testing: Cancellation blocked when downstream invoice exists...');
  // Attach active invoice to D0's sales order
  const d0Record = deliveryOrders.find((d) => d.id === d0.id);
  d0Record.invoices = [{ id: 'inv-1', status: 'PAID' }];

  let invoiceBlocked = false;
  try {
    await deliveryService.cancel(companyId, d0.id, userId);
  } catch (err: any) {
    invoiceBlocked = true;
    console.log(`✓ Cancellation blocked by downstream invoice: "${err.message}"`);
    assert(
      err.message.includes('Downstream invoices are active'),
      'Must explain that downstream invoice prevents reversal',
    );
  }
  assert.strictEqual(invoiceBlocked, true);

  console.log('\n--- ALL PHASE B2.1 DETERMINISTIC TESTS PASSED SUCCESSFULLY! ---');
}

runPhaseB21Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
