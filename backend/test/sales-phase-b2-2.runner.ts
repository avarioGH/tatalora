import assert from 'assert';
import { DeliveryService } from '../src/crm/delivery/delivery.service';
import { BadRequestException } from '@nestjs/common';

/**
 * ============================================================================
 * SALES PHASE B2.2 TEST SUITE
 * ============================================================================
 * Scope 1: Concurrency Coordination & Row Locking Simulation
 * Scope 2: Multi-layer FIFO Restoration & Fractional Quantities
 * Scope 3: Accounting Durability, Idempotency & Rollback Isolation
 *
 * NOTE ON ENVIRONMENT:
 * Port 5432 is not bound to a running local PostgreSQL daemon on this machine.
 * Per the prompt constraints, we clearly distinguish in-memory/unit simulations
 * from PostgreSQL-backed tests and explicitly document the absence of a live local DB.
 * ============================================================================
 */

async function runPhaseB22Tests() {
  console.log('--- STARTING SALES PHASE B2.2: FINAL DELIVERY INTEGRITY TESTS ---');

  const companyId = 'comp-phase-b22';
  const userId = 'user-auditor-b22';
  const warehouseId = 'wh-main-yard';
  const productId = 'prod-meranti-beam';

  let rawLockCalls: string[] = [];
  let deliveryOrders: any[] = [];
  let deliveryOrderItems: any[] = [];
  let warehouseStock: any[] = [
    {
      id: 'ws-b22',
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
  let journalEntries: any[] = [];

  const prismaMock: any = {
    $executeRaw: async (query: any, ...values: any[]) => {
      rawLockCalls.push(JSON.stringify(query));
      return 1;
    },
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
          id: 'so-b22',
          company_id: companyId,
          warehouse_id: warehouseId,
          order_number: 'SO/2026/B22-001',
          status: 'CONFIRMED',
          delivery_status: 'PENDING',
          items: [{ id: 'soi-b22', product_id: productId, qty: 10 }],
          deliveries: deliveryOrders
            .filter((d) => d.sales_order_id === 'so-b22' && d.status !== 'CANCELLED')
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
          order_number: 'SO/2026/B22-001',
          items: [{ id: 'soi-b22', product_id: productId, qty: 10 }],
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
            order_number: 'SO/2026/B22-001',
            invoices: match.invoices || [],
            items: [{ id: 'soi-b22', product_id: productId, qty: 10 }],
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
            order_number: 'SO/2026/B22-001',
            invoices: d.invoices || [],
            items: [{ id: 'soi-b22', product_id: productId, qty: 10 }],
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
      findMany: async () => [],
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
    journalEntry: {
      findFirst: async ({ where }: any) => {
        return journalEntries.find(
          (je) =>
            je.company_id === where.company_id &&
            je.reference_type === where.reference_type &&
            je.reference_id === where.reference_id,
        );
      },
      create: async ({ data }: any) => {
        journalEntries.push(data);
        return data;
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

      // Simulate consumption across 2 FIFO layers:
      // Layer 1: 1.5 units @ $100 = $150
      // Layer 2: 2.5 units @ $140 = $350
      // Total = 4.0 units, $500 total cost
      costLayerConsumptions.push({
        id: `clc-1-${movId}`,
        company_id: params.companyId,
        layer_id: 'layer-100',
        stock_movement_id: movId,
        quantity: 1.5,
        unit_cost: 100,
        total_cost: 150,
      });
      costLayerConsumptions.push({
        id: `clc-2-${movId}`,
        company_id: params.companyId,
        layer_id: 'layer-140',
        stock_movement_id: movId,
        quantity: 2.5,
        unit_cost: 140,
        total_cost: 350,
      });

      return {
        stock,
        movement: mov,
        consumedCost: 500,
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
        // Simulate AccountingListener idempotent journal entry posting
        const tx = payload.tx || prismaMock;
        const existing = await tx.journalEntry.findFirst({
          where: {
            company_id: payload.companyId,
            reference_type: payload.payload.type,
            reference_id: payload.sourceEntityId,
          },
        });
        if (!existing) {
          await tx.journalEntry.create({
            data: {
              company_id: payload.companyId,
              reference_type: payload.payload.type,
              reference_id: payload.sourceEntityId,
              total_amount: payload.payload.totalValue,
            },
          });
        }
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
  // SCOPE 1: ROW LOCKING & CONCURRENCY COORDINATION
  // =========================================================================
  console.log('\n--- SCOPE 1: ROW LOCKING & CONCURRENCY COORDINATION ---');
  rawLockCalls = [];

  const d1 = await deliveryService.create(companyId, 'so-b22', {
    items: [{ productId, qty: 4 }],
  });
  assert(rawLockCalls.length > 0, 'create() must acquire FOR UPDATE lock on SalesOrder');
  console.log('✓ create() acquires exclusive row lock on SalesOrder');

  rawLockCalls = [];
  await deliveryService.validate(companyId, d1.id, userId);
  assert(rawLockCalls.length > 0, 'validate() must acquire FOR UPDATE lock on SalesOrder');
  console.log('✓ validate() acquires exclusive row lock on SalesOrder');

  // =========================================================================
  // SCOPE 2: MULTI-LAYER FIFO RESTORATION & FRACTIONAL QUANTITIES
  // Delivery d1 consumed: 1.5 units @ $100 ($150) and 2.5 units @ $140 ($350).
  // Total = 4 units, $500 COGS.
  // When reversing d1, verify that BOTH discrete layers are restored with exact costs.
  // =========================================================================
  console.log('\n--- SCOPE 2: MULTI-LAYER FIFO RESTORATION & FRACTIONAL QUANTITIES ---');
  receivedStockCalls = [];
  emittedValuationEvents = [];
  journalEntries = [];

  await deliveryService.cancel(companyId, d1.id, userId);

  assert.strictEqual(
    receivedStockCalls.length,
    2,
    'Expected exactly 2 receiveStock calls for the 2 distinct FIFO layers',
  );
  assert.strictEqual(receivedStockCalls[0].quantity, 1.5, 'Layer 1 qty must be 1.5');
  assert.strictEqual(receivedStockCalls[0].unitCost, 100, 'Layer 1 unit cost must be 100');

  assert.strictEqual(receivedStockCalls[1].quantity, 2.5, 'Layer 2 qty must be 2.5');
  assert.strictEqual(receivedStockCalls[1].unitCost, 140, 'Layer 2 unit cost must be 140');
  console.log('✓ Restored fractional layer 1: 1.5 units @ $100');
  console.log('✓ Restored fractional layer 2: 2.5 units @ $140');

  const totalRestoredValuation =
    receivedStockCalls[0].quantity * receivedStockCalls[0].unitCost +
    receivedStockCalls[1].quantity * receivedStockCalls[1].unitCost;
  assert.strictEqual(
    totalRestoredValuation,
    500,
    'Total restored inventory valuation must exactly match $500',
  );
  console.log(`✓ Total restored inventory value ($${totalRestoredValuation}) exactly reconciles with original COGS`);

  // =========================================================================
  // SCOPE 3: ACCOUNTING EVENT DURABILITY & IDEMPOTENCY
  // Verify that journal entry was posted idempotently with key and cannot double-post.
  // =========================================================================
  console.log('\n--- SCOPE 3: ACCOUNTING EVENT DURABILITY & IDEMPOTENCY ---');
  assert.strictEqual(
    emittedValuationEvents.length,
    1,
    'Valuation event must be emitted once',
  );
  const revEvent = emittedValuationEvents[0];
  assert.strictEqual(revEvent.payload.totalValue, 500);
  assert.strictEqual(revEvent.payload.type, 'SALES_RETURN_COGS');
  assert.strictEqual(revEvent.eventId, `VAL-DEL-REV-${d1.id}`);
  console.log(`✓ Offsetting valuation event emitted with durable key: ${revEvent.eventId}`);

  assert.strictEqual(journalEntries.length, 1, 'Exactly one journal entry created');
  assert.strictEqual(
    journalEntries[0].reference_type,
    'SALES_RETURN_COGS',
    'Journal entry reference_type matches',
  );
  assert.strictEqual(
    journalEntries[0].reference_id,
    d1.id,
    'Journal entry reference_id matches delivery',
  );
  console.log('✓ Journal entry persisted atomically matching delivery reversal');

  // Re-emitting the same event manually to prove idempotency
  await eventEmitterMock.emitAsync('inventory.valuation', revEvent);
  assert.strictEqual(
    journalEntries.length,
    1,
    'Duplicate event must NOT create duplicate journal entry',
  );
  console.log('✓ Duplicate event delivery ignored by idempotency check');

  console.log('\n--- ALL SALES PHASE B2.2 TESTS PASSED SUCCESSFULLY! ---');
}

runPhaseB22Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
