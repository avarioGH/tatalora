import assert from 'assert';
import { DeliveryService } from '../src/crm/delivery/delivery.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

async function runDeliveryTests() {
  console.log('--- STARTING SALES PHASE B2: DELIVERY ORDER INTEGRITY TESTS ---');

  const mockCompanyId = 'comp-deliv-123';
  const mockUserId = 'user-deliv-999';
  const mockWarehouseId = 'wh-deliv-1';

  let deliveryOrders: any[] = [];
  let deliveryOrderItems: any[] = [];
  let warehouseStock: any[] = [
    {
      id: 'ws-1',
      company_id: mockCompanyId,
      warehouse_id: mockWarehouseId,
      product_id: 'p-timber-1',
      current_stock: 100,
      available_stock: 100,
      reserved_stock: 0,
    },
  ];
  let stockMovements: any[] = [];
  let emittedValuationEvents: any[] = [];

  const prismaMock: any = {
    $transaction: async (cb: any) => cb(prismaMock),
    warehouse: {
      findFirst: async ({ where }: any) => {
        if (where.id === mockWarehouseId && where.company_id === mockCompanyId) {
          return { id: mockWarehouseId, name: 'Main Timber Yard', company_id: mockCompanyId };
        }
        return null;
      },
    },
    salesOrder: {
      findFirst: async ({ where }: any) => {
        if (where.id === 'so-1' && where.company_id === mockCompanyId) {
          return {
            id: 'so-1',
            company_id: mockCompanyId,
            warehouse_id: mockWarehouseId,
            order_number: 'SO/2026/00001',
            status: 'CONFIRMED',
            delivery_status: 'PENDING',
            items: [
              { id: 'so-item-1', product_id: 'p-timber-1', qty: 10 },
            ],
            deliveries: deliveryOrders
              .filter((d) => d.sales_order_id === 'so-1' && d.status !== 'CANCELLED')
              .map((d) => ({
                ...d,
                items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
              })),
          };
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return {
          id: where.id,
          company_id: mockCompanyId,
          warehouse_id: mockWarehouseId,
          order_number: 'SO/2026/00001',
          items: [{ id: 'so-item-1', product_id: 'p-timber-1', qty: 10 }],
          deliveries: deliveryOrders
            .filter((d) => d.sales_order_id === where.id && (d.status === 'DONE' || d.status === 'DELIVERED'))
            .map((d) => ({
              ...d,
              items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
            })),
        };
      },
      update: async ({ where, data }: any) => {
        return { id: where.id, ...data };
      },
    },
    deliveryOrder: {
      findFirst: async ({ where }: any) => {
        let match = deliveryOrders.find(
          (d) =>
            (!where.id || d.id === where.id) &&
            (!where.company_id || d.company_id === where.company_id) &&
            (!where.idempotency_key || d.idempotency_key === where.idempotency_key),
        );
        if (!match) return null;
        return {
          ...match,
          items: deliveryOrderItems.filter((i) => i.delivery_order_id === match.id),
          sales_order: {
            id: match.sales_order_id,
            warehouse_id: mockWarehouseId,
            order_number: 'SO/2026/00001',
            invoices: [],
            items: [{ id: 'so-item-1', product_id: 'p-timber-1', qty: 10 }],
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
            warehouse_id: mockWarehouseId,
            order_number: 'SO/2026/00001',
            invoices: [],
            items: [{ id: 'so-item-1', product_id: 'p-timber-1', qty: 10 }],
          },
        };
      },
      findMany: async ({ where }: any) => {
        return deliveryOrders
          .filter(
            (d) =>
              (!where.sales_order_id || d.sales_order_id === where.sales_order_id) &&
              (!where.status || d.status === where.status),
          )
          .map((d) => ({
            ...d,
            items: deliveryOrderItems.filter((i) => i.delivery_order_id === d.id),
          }));
      },
      create: async ({ data }: any) => {
        const id = `do-${Date.now()}-${Math.random()}`;
        const newDo = { id, ...data };
        delete newDo.items;
        deliveryOrders.push(newDo);

        if (data.items?.create) {
          for (const item of data.items.create) {
            deliveryOrderItems.push({
              id: `doi-${Date.now()}-${Math.random()}`,
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
            (where.status.in ? where.status.in.includes(d.status) : d.status === where.status);
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
        return stockMovements.filter((m) => m.transaction_id === where.transaction_id);
      },
    },
    costLayerConsumption: {
      findMany: async ({ where }: any) => {
        return [
          {
            id: 'clc-1',
            company_id: mockCompanyId,
            stock_movement_id: where.stock_movement_id,
            quantity: 4,
            unit_cost: 75000,
            total_cost: 300000,
          },
        ];
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

      const mov = {
        id: `mov-${Date.now()}`,
        company_id: params.companyId,
        warehouse_id: params.warehouseId,
        product_id: params.productId,
        qty_out: params.quantity,
        transaction_type: params.referenceType,
        transaction_id: params.referenceId,
        created_by: params.userId,
      };
      stockMovements.push(mov);

      return {
        stock,
        movement: mov,
        consumedCost: params.quantity * 75000,
      };
    },
    receiveStock: async (tx: any, params: any) => {
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

  const eventEmitterMock: any = {
    emitAsync: async (eventName: string, payload: any) => {
      if (eventName === 'inventory.valuation') {
        emittedValuationEvents.push(payload);
      }
    },
  };

  const sequenceServiceMock: any = {
    generateNumber: async (tx: any, compId: string, type: string, prefix: string) => {
      return `${prefix}/2026/00001`;
    },
  };

  const deliveryService = new DeliveryService(
    prismaMock,
    eventEmitterMock,
    inventoryServiceMock,
    sequenceServiceMock,
  );

  // --- TEST 1: Reject zero or negative quantities ---
  console.log('Running Test 1: Reject invalid delivery quantities (zero or negative)...');
  let rejectedZero = false;
  try {
    await deliveryService.create(mockCompanyId, 'so-1', {
      items: [{ productId: 'p-timber-1', qty: 0 }],
    });
  } catch (err: any) {
    if (err instanceof BadRequestException && err.message.includes('greater than zero')) {
      rejectedZero = true;
    }
  }
  assert.strictEqual(rejectedZero, true, 'Zero quantity delivery was rejected');
  console.log('✓ Test 1 passed!');

  // --- TEST 2: Reject over-delivery beyond SO remaining qty ---
  console.log('Running Test 2: Reject over-delivery beyond order quantity...');
  let rejectedOverDelivery = false;
  try {
    await deliveryService.create(mockCompanyId, 'so-1', {
      items: [{ productId: 'p-timber-1', qty: 15 }], // SO only ordered 10
    });
  } catch (err: any) {
    if (err instanceof BadRequestException && err.message.includes('Cannot deliver')) {
      rejectedOverDelivery = true;
    }
  }
  assert.strictEqual(rejectedOverDelivery, true, 'Over-delivery was rejected');
  console.log('✓ Test 2 passed!');

  // --- TEST 3: Partial delivery creation ---
  console.log('Running Test 3: Partial delivery creation (4 of 10)...');
  const d1 = await deliveryService.create(mockCompanyId, 'so-1', {
    items: [{ productId: 'p-timber-1', qty: 4 }],
    driverName: 'Driver Budi',
    vehiclePlate: 'B 1234 TAT',
  });
  assert.strictEqual(d1.status, 'WAITING', 'Delivery created in WAITING status');
  assert.strictEqual(d1.items[0].delivered_qty, 4, 'Delivered qty recorded as 4');
  assert.strictEqual(d1.items[0].remaining_qty, 6, 'Remaining qty calculated as 6');
  console.log('✓ Test 3 passed!');

  // --- TEST 4: Validate delivery issues stock with authenticated userId and correct warehouse ---
  console.log('Running Test 4: Validate partial delivery issues stock with real actor userId and warehouse...');
  const validatedD1 = await deliveryService.validate(
    mockCompanyId,
    d1.id,
    mockUserId,
    mockWarehouseId,
  );
  assert.strictEqual(validatedD1.id, d1.id);
  assert.strictEqual(warehouseStock[0].current_stock, 96, 'Stock decremented exactly by 4 (from 100 to 96)');
  assert.strictEqual(stockMovements.length, 1, 'Exactly one stock movement created');
  assert.strictEqual(stockMovements[0].created_by, mockUserId, 'Stock movement records authenticated actor userId');
  assert.strictEqual(stockMovements[0].warehouse_id, mockWarehouseId, 'Stock movement records correct warehouse');
  assert.strictEqual(emittedValuationEvents.length, 1, 'COGS inventory valuation event emitted');
  console.log('✓ Test 4 passed!');

  // --- TEST 5: Concurrent / duplicate validation protection ---
  console.log('Running Test 5: Duplicate validate attempt is safely rejected...');
  let doubleValidateRejected = false;
  try {
    await deliveryService.validate(mockCompanyId, d1.id, mockUserId, mockWarehouseId);
  } catch (err: any) {
    if (err instanceof BadRequestException && err.message.includes('already validated/posted')) {
      doubleValidateRejected = true;
    }
  }
  assert.strictEqual(doubleValidateRejected, true, 'Double-posting delivery was prevented');
  console.log('✓ Test 5 passed!');

  // --- TEST 6: Second partial delivery cannot exceed remaining ---
  console.log('Running Test 6: Second delivery rejects exceeding remaining 6...');
  let exceedRemainingRejected = false;
  try {
    await deliveryService.create(mockCompanyId, 'so-1', {
      items: [{ productId: 'p-timber-1', qty: 7 }], // only 6 remaining
    });
  } catch (err: any) {
    if (err instanceof BadRequestException && err.message.includes('Cannot deliver')) {
      exceedRemainingRejected = true;
    }
  }
  assert.strictEqual(exceedRemainingRejected, true, 'Exceeding remaining 6 was rejected');
  console.log('✓ Test 6 passed!');

  // --- TEST 7: Invalid or cross-tenant warehouse rejected on validation ---
  console.log('Running Test 7: Reject invalid / cross-tenant warehouse on validate...');
  const d2 = await deliveryService.create(mockCompanyId, 'so-1', {
    items: [{ productId: 'p-timber-1', qty: 6 }],
  });
  let crossTenantWhRejected = false;
  try {
    await deliveryService.validate(
      mockCompanyId,
      d2.id,
      mockUserId,
      'wh-alien-999', // Non-existent or foreign company warehouse
    );
  } catch (err: any) {
    if (err instanceof BadRequestException && err.message.includes('invalid or does not belong')) {
      crossTenantWhRejected = true;
    }
  }
  assert.strictEqual(crossTenantWhRejected, true, 'Cross-tenant warehouse was rejected');
  console.log('✓ Test 7 passed!');

  // --- TEST 8: Cancellation of unposted delivery ---
  console.log('Running Test 8: Cancellation of unposted delivery...');
  const cancelUnpostedRes = await deliveryService.cancel(mockCompanyId, d2.id, mockUserId);
  assert.strictEqual(cancelUnpostedRes.status, 'CANCELLED', 'Unposted delivery cancelled cleanly');
  assert.strictEqual(warehouseStock[0].current_stock, 96, 'Stock unchanged by unposted cancellation');
  console.log('✓ Test 8 passed!');

  // --- TEST 9: Auditable Reversal of posted delivery ---
  console.log('Running Test 9: Auditable Reversal of posted delivery d1...');
  const reversePostedRes = await deliveryService.cancel(mockCompanyId, d1.id, mockUserId);
  assert.strictEqual(reversePostedRes.status, 'CANCELLED', 'Posted delivery reversed to CANCELLED');
  assert.strictEqual(warehouseStock[0].current_stock, 100, 'Stock restored from 96 back to 100 via DELIVERY_REVERSAL');
  console.log('✓ Test 9 passed!');

  console.log('--- ALL 9 DELIVERY INTEGRITY TESTS PASSED SUCCESSFULLY! ---');
}

runDeliveryTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
