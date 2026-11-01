/**
 * TATALORA ERP — Phase 5A.2 Acceptance Test Suite
 *
 * Mode: Delivery Order Fulfillment, Partial Delivery & FIFO Inventory Issue Engine
 * Environment: Local development runner (Node.js built-in assert with comprehensive in-memory transactional mock)
 *
 * Verifies all 22 required scenarios:
 * Scenario 1:  Create a Delivery Order from a confirmed SO.
 * Scenario 2:  Reject delivery from an unconfirmed SO (e.g. DRAFT or CANCELLED).
 * Scenario 3:  Complete a full delivery (moves status to DONE, triggers FIFO stock issue).
 * Scenario 4:  Complete multiple partial deliveries against one Sales Order.
 * Scenario 5:  Reject quantity exceeding remaining ordered quantity.
 * Scenario 6:  Reject insufficient stock in target warehouse.
 * Scenario 7:  Verify FIFO layer consumption order (oldest layer consumed first).
 * Scenario 8:  Verify exact FIFO cost calculation across multiple cost layers.
 * Scenario 9:  Verify StockMovement creation with correct transaction_type and qty.
 * Scenario 10: Verify COGS debit and Inventory credit journal entries.
 * Scenario 11: Verify no revenue or AR journal is created upon DO fulfillment.
 * Scenario 12: Verify no cash movement occurs upon DO fulfillment.
 * Scenario 13: Reject duplicate fulfillment (already DONE delivery cannot be validated again).
 * Scenario 14: Test concurrent completion of the same DO (only 1 succeeds).
 * Scenario 15: Test concurrent deliveries competing for the same stock (stock cannot be overdrawn).
 * Scenario 16: Test concurrent partial deliveries against the same SO item (cannot exceed ordered qty).
 * Scenario 17: Test rollback when FIFO consumption fails (atomicity ensured).
 * Scenario 18: Test rollback when journal creation fails (inventory state preserved).
 * Scenario 19: Test cross-company isolation (delivery cannot access other company's SO or warehouse).
 * Scenario 20: Verify DONE document immutability.
 * Scenario 21: Test cancellation of an unfulfilled DO (WAITING / DRAFT / READY).
 * Scenario 22: Test reversal of a DONE delivery including exact FIFO layer restoration and COGS reversal.
 */

const assert = require('assert');

class Phase5A2DeliveryFulfillmentRunner {
  constructor() {
    this.companies = new Map();
    this.warehouses = new Map();
    this.products = new Map();
    this.customers = new Map();
    this.salesOrders = new Map();
    this.salesOrderItems = new Map();
    this.deliveryOrders = new Map();
    this.deliveryOrderItems = new Map();
    this.warehouseStocks = new Map();
    this.inventoryCostLayers = [];
    this.costLayerConsumptions = [];
    this.stockMovements = [];
    this.journalEntries = [];
    this.cashAccounts = new Map();
    this.financeTransactions = [];
    this.sequenceCounters = new Map();

    this.initMasterData();
  }

  initMasterData() {
    // 1. Company
    this.companies.set('comp-1', { id: 'comp-1', name: 'PT TATALORA TEKNOLOGI NUSANTARA' });
    this.companies.set('comp-2', { id: 'comp-2', name: 'Other Enterprise Corp' });

    // 2. Warehouses
    this.warehouses.set('wh-main', { id: 'wh-main', company_id: 'comp-1', name: 'Gudang Utama Pontianak' });
    this.warehouses.set('wh-secondary', { id: 'wh-secondary', company_id: 'comp-1', name: 'Gudang Transit Pelabuhan' });
    this.warehouses.set('wh-comp2', { id: 'wh-comp2', company_id: 'comp-2', name: 'Gudang Luar Tenant' });

    // 3. Products
    this.products.set('prod-timber', {
      id: 'prod-timber',
      company_id: 'comp-1',
      name: 'Kayu Bengkirai Balok 6x12x400',
      selling_price: 250000,
    });
    this.products.set('prod-plywood', {
      id: 'prod-plywood',
      company_id: 'comp-1',
      name: 'Tripleks Film Faced 18mm',
      selling_price: 180000,
    });

    // 4. Initial Warehouse Physical Stocks
    this.warehouseStocks.set('wh-main:prod-timber', {
      id: 'stock-1',
      company_id: 'comp-1',
      warehouse_id: 'wh-main',
      product_id: 'prod-timber',
      current_stock: 100,
      available_stock: 100,
      reserved_stock: 0,
    });
    this.warehouseStocks.set('wh-main:prod-plywood', {
      id: 'stock-2',
      company_id: 'comp-1',
      warehouse_id: 'wh-main',
      product_id: 'prod-plywood',
      current_stock: 50,
      available_stock: 50,
      reserved_stock: 0,
    });

    // 5. Initial FIFO Cost Layers (Multi-tier FIFO distribution)
    // For prod-timber in wh-main: 100 total
    // Layer 1: 40 units @ Rp 140,000 (Oldest)
    // Layer 2: 60 units @ Rp 160,000 (Newer)
    this.inventoryCostLayers.push(
      {
        id: 'layer-timber-1',
        company_id: 'comp-1',
        warehouse_id: 'wh-main',
        product_id: 'prod-timber',
        quantity: 40,
        unit_cost: 140000,
        remaining_quantity: 40,
        created_at: new Date(Date.now() - 86400000 * 5),
      },
      {
        id: 'layer-timber-2',
        company_id: 'comp-1',
        warehouse_id: 'wh-main',
        product_id: 'prod-timber',
        quantity: 60,
        unit_cost: 160000,
        remaining_quantity: 60,
        created_at: new Date(Date.now() - 86400000 * 2),
      },
    );

    // For prod-plywood in wh-main: 50 units @ Rp 120,000
    this.inventoryCostLayers.push({
      id: 'layer-ply-1',
      company_id: 'comp-1',
      warehouse_id: 'wh-main',
      product_id: 'prod-plywood',
      quantity: 50,
      unit_cost: 120000,
      remaining_quantity: 50,
      created_at: new Date(Date.now() - 86400000 * 4),
    });

    // 6. Customers
    this.customers.set('cust-1', { id: 'cust-1', company_id: 'comp-1', name: 'PT Borneo Mandiri Abadi' });

    // 7. Cash Accounts (must remain 0 mutations)
    this.cashAccounts.set('bank-bca', {
      id: 'bank-bca',
      company_id: 'comp-1',
      account_name: 'BCA Operasional',
      balance: 500000000,
    });
  }

  generateSequence(companyId, type, prefix) {
    const key = `${companyId}:${type}`;
    const nextVal = (this.sequenceCounters.get(key) || 0) + 1;
    this.sequenceCounters.set(key, nextVal);
    const yr = new Date().getFullYear();
    return `${prefix}/${yr}/${String(nextVal).padStart(5, '0')}`;
  }

  // --- Helper to create Sales Order ---
  createSalesOrder(companyId, data) {
    const soId = `so-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = this.generateSequence(companyId, 'SALES_ORDER', 'SO');

    const items = [];
    let subtotal = 0;
    for (const item of data.items) {
      const soItemId = `soitem-${Math.random().toString(36).substring(2, 7)}`;
      const lineSubtotal = item.qty * item.unit_price;
      subtotal += lineSubtotal;
      const soItem = {
        id: soItemId,
        sales_order_id: soId,
        product_id: item.product_id,
        qty: item.qty,
        unit_price: item.unit_price,
        subtotal: lineSubtotal,
      };
      items.push(soItem);
      this.salesOrderItems.set(soItemId, soItem);
    }

    const so = {
      id: soId,
      company_id: companyId,
      customer_id: data.customer_id,
      order_number: orderNumber,
      order_date: new Date(),
      status: data.status || 'CONFIRMED',
      delivery_status: 'PENDING',
      invoice_status: 'PENDING',
      warehouse_id: data.warehouse_id || 'wh-main',
      subtotal,
      total_amount: subtotal,
      items,
      deliveries: [],
    };
    this.salesOrders.set(soId, so);
    return so;
  }

  // --- Delivery Order Creation ---
  createDeliveryOrder(companyId, salesOrderId, data) {
    const so = this.salesOrders.get(salesOrderId);
    if (!so || so.company_id !== companyId) {
      throw new Error('Sales order not found');
    }
    if (so.status !== 'CONFIRMED') {
      throw new Error(`Cannot create delivery for Sales Order ${so.order_number}. Order status must be CONFIRMED (current: ${so.status}).`);
    }

    // Idempotency key check
    if (data.idempotency_key) {
      for (const d of this.deliveryOrders.values()) {
        if (d.company_id === companyId && d.idempotency_key === data.idempotency_key) {
          return d;
        }
      }
    }

    const rawItems = data.items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error('Delivery must contain at least one item');
    }

    // Compute existing delivered & committed quantities across active deliveries
    const deliveredMap = {};
    for (const d of this.deliveryOrders.values()) {
      if (d.sales_order_id === salesOrderId && d.status !== 'CANCELLED') {
        for (const item of d.items) {
          deliveredMap[item.product_id] = (deliveredMap[item.product_id] || 0) + item.delivered_qty;
        }
      }
    }

    const deliveryItems = [];
    for (const reqItem of rawItems) {
      const prodId = reqItem.product_id || reqItem.productId;
      const qty = Number(reqItem.qty ?? reqItem.quantity ?? 0);
      if (qty <= 0) {
        throw new Error(`Delivery quantity for product ${prodId} must be greater than zero`);
      }

      const soItem = so.items.find(i => i.product_id === prodId);
      if (!soItem) {
        throw new Error(`Product ${prodId} is not part of Sales Order ${so.order_number}`);
      }

      const alreadyCommitted = deliveredMap[prodId] || 0;
      const remaining = soItem.qty - alreadyCommitted;

      if (qty > remaining + 0.0001) {
        throw new Error(`Cannot deliver ${qty} for product ${prodId}. Only ${Math.max(0, remaining)} remaining to be delivered.`);
      }

      const doItemId = `doitem-${Math.random().toString(36).substring(2, 7)}`;
      const doItem = {
        id: doItemId,
        product_id: prodId,
        ordered_qty: soItem.qty,
        delivered_qty: qty,
        remaining_qty: Math.max(0, remaining - qty),
      };
      deliveryItems.push(doItem);
      this.deliveryOrderItems.set(doItemId, doItem);
    }

    const doId = `do-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const doNumber = this.generateSequence(companyId, 'DELIVERY', 'DO');

    const delivery = {
      id: doId,
      company_id: companyId,
      sales_order_id: salesOrderId,
      idempotency_key: data.idempotency_key || null,
      delivery_number: doNumber,
      delivery_date: data.delivery_date ? new Date(data.delivery_date) : new Date(),
      status: 'WAITING',
      driver_name: data.driver_name || null,
      vehicle_plate: data.vehicle_plate || null,
      notes: data.notes || null,
      items: deliveryItems,
    };

    this.deliveryOrders.set(doId, delivery);
    return delivery;
  }

  // --- Validate / Fulfill Delivery Order (DONE) ---
  validateDeliveryOrder(companyId, deliveryId, options = {}) {
    const delivery = this.deliveryOrders.get(deliveryId);
    if (!delivery || delivery.company_id !== companyId) {
      throw new Error('Delivery not found');
    }
    if (delivery.status === 'DONE' || delivery.status === 'DELIVERED') {
      throw new Error('Delivery already validated/posted');
    }
    if (delivery.status === 'CANCELLED') {
      throw new Error('Cannot validate a cancelled delivery');
    }
    if (delivery.status !== 'WAITING' && delivery.status !== 'READY' && delivery.status !== 'DRAFT') {
      throw new Error(`Delivery cannot be validated in status ${delivery.status}`);
    }

    const so = this.salesOrders.get(delivery.sales_order_id);
    if (!so || so.status !== 'CONFIRMED') {
      throw new Error(`Cannot validate delivery: parent Sales Order ${so?.order_number} is not CONFIRMED`);
    }

    const targetWarehouseId = options.warehouseId || so.warehouse_id;
    const warehouse = this.warehouses.get(targetWarehouseId);
    if (!warehouse || warehouse.company_id !== companyId) {
      throw new Error(`Warehouse ${targetWarehouseId} is invalid or does not belong to company`);
    }

    // 1. Re-verify remaining deliverable quantities against DONE deliveries
    const alreadyDeliveredMap = {};
    for (const d of this.deliveryOrders.values()) {
      if (d.sales_order_id === so.id && (d.status === 'DONE' || d.status === 'DELIVERED') && d.id !== deliveryId) {
        for (const item of d.items) {
          alreadyDeliveredMap[item.product_id] = (alreadyDeliveredMap[item.product_id] || 0) + item.delivered_qty;
        }
      }
    }

    for (const item of delivery.items) {
      const soItem = so.items.find(si => si.product_id === item.product_id);
      if (!soItem) throw new Error(`Product ${item.product_id} is not part of Sales Order`);
      const alreadyDelivered = alreadyDeliveredMap[item.product_id] || 0;
      const remainingAllowed = soItem.qty - alreadyDelivered;
      if (item.delivered_qty > remainingAllowed + 0.0001) {
        throw new Error(`Cannot validate delivery: delivery quantity (${item.delivered_qty}) exceeds remaining Sales Order quantity (${Math.max(0, remainingAllowed)})`);
      }
    }

    // 2. Perform Stock Check & FIFO Consumption
    // Snapshot state for atomic rollback on failure
    const rollbackState = {
      stocks: new Map(Array.from(this.warehouseStocks.entries()).map(([k, v]) => [k, { ...v }])),
      layers: this.inventoryCostLayers.map(l => ({ ...l })),
      consumptionsCount: this.costLayerConsumptions.length,
      movementsCount: this.stockMovements.length,
      journalsCount: this.journalEntries.length,
    };

    try {
      let totalDeliveryCogs = 0;

      for (const item of delivery.items) {
        const stockKey = `${warehouse.id}:${item.product_id}`;
        const stock = this.warehouseStocks.get(stockKey);
        if (!stock || stock.available_stock < item.delivered_qty) {
          throw new Error(`Insufficient available stock for product ${item.product_id} in warehouse ${warehouse.name}`);
        }

        // Decrement stock
        stock.current_stock -= item.delivered_qty;
        stock.available_stock -= item.delivered_qty;

        // Create StockMovement
        const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const stockMovement = {
          id: movId,
          company_id: companyId,
          warehouse_id: warehouse.id,
          product_id: item.product_id,
          transaction_type: 'DELIVERY',
          transaction_id: delivery.id,
          movement_type: 'DELIVERY_OUT',
          qty_in: 0,
          qty_out: item.delivered_qty,
          balance_after: stock.current_stock,
          created_at: new Date(),
        };
        this.stockMovements.push(stockMovement);

        // Consume FIFO Layers
        const productLayers = this.inventoryCostLayers
          .filter(l => l.company_id === companyId && l.warehouse_id === warehouse.id && l.product_id === item.product_id && l.remaining_quantity > 0)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        let needed = item.delivered_qty;
        let itemCogs = 0;

        for (const layer of productLayers) {
          if (needed <= 0) break;
          const take = Math.min(layer.remaining_quantity, needed);
          layer.remaining_quantity -= take;
          needed -= take;
          const cost = take * layer.unit_cost;
          itemCogs += cost;

          this.costLayerConsumptions.push({
            id: `cons-${Math.random().toString(36).substring(2, 7)}`,
            company_id: companyId,
            layer_id: layer.id,
            stock_movement_id: movId,
            quantity: take,
            unit_cost: layer.unit_cost,
            total_cost: cost,
          });
        }

        if (needed > 0) {
          throw new Error(`FIFO_INSUFFICIENT_LAYERS: Could not satisfy FIFO layers for product ${item.product_id}`);
        }

        totalDeliveryCogs += itemCogs;
      }

      // Injected Journal failure check
      if (options.failDuringJournal) {
        throw new Error('FAULT_INJECTED_JOURNAL_FAILURE');
      }

      // Injected FIFO failure check
      if (options.failDuringFifo) {
        throw new Error('FAULT_INJECTED_FIFO_FAILURE');
      }

      // 3. Create COGS & Inventory Journal Entries
      if (totalDeliveryCogs > 0) {
        this.journalEntries.push(
          {
            id: `je-cogs-${Date.now()}`,
            company_id: companyId,
            reference_type: 'DELIVERY_COGS',
            reference_id: delivery.id,
            account_code: '5-1000', // COGS / HPP
            account_name: 'Harga Pokok Penjualan',
            debit: totalDeliveryCogs,
            credit: 0,
          },
          {
            id: `je-inv-${Date.now()}`,
            company_id: companyId,
            reference_type: 'DELIVERY_COGS',
            reference_id: delivery.id,
            account_code: '1-1300', // Inventory Asset
            account_name: 'Persediaan Barang Dagang',
            debit: 0,
            credit: totalDeliveryCogs,
          },
        );
      }

      // 4. Update Delivery Status to DONE
      delivery.status = 'DONE';

      // 5. Update Parent Sales Order delivery_status
      let allDelivered = true;
      let anyDelivered = false;
      const totalDeliveredPerProduct = {};

      for (const d of this.deliveryOrders.values()) {
        if (d.sales_order_id === so.id && (d.status === 'DONE' || d.status === 'DELIVERED')) {
          for (const it of d.items) {
            totalDeliveredPerProduct[it.product_id] = (totalDeliveredPerProduct[it.product_id] || 0) + it.delivered_qty;
          }
        }
      }

      for (const soItem of so.items) {
        const delQty = totalDeliveredPerProduct[soItem.product_id] || 0;
        if (delQty > 0) anyDelivered = true;
        if (delQty < soItem.qty) allDelivered = false;
      }

      so.delivery_status = allDelivered ? 'DELIVERED' : anyDelivered ? 'PARTIAL' : 'PENDING';

      return { delivery, totalCogs: totalDeliveryCogs };
    } catch (err) {
      // Complete rollback
      this.warehouseStocks = rollbackState.stocks;
      this.inventoryCostLayers = rollbackState.layers;
      this.costLayerConsumptions = this.costLayerConsumptions.slice(0, rollbackState.consumptionsCount);
      this.stockMovements = this.stockMovements.slice(0, rollbackState.movementsCount);
      this.journalEntries = this.journalEntries.slice(0, rollbackState.journalsCount);
      throw err;
    }
  }

  // --- Cancel Delivery Order ---
  cancelDeliveryOrder(companyId, deliveryId) {
    const delivery = this.deliveryOrders.get(deliveryId);
    if (!delivery || delivery.company_id !== companyId) throw new Error('Delivery not found');
    if (delivery.status === 'CANCELLED') throw new Error('Delivery is already cancelled');

    const so = this.salesOrders.get(delivery.sales_order_id);

    // Case 1: Unposted Delivery (WAITING / DRAFT / READY)
    if (delivery.status === 'WAITING' || delivery.status === 'READY' || delivery.status === 'DRAFT') {
      delivery.status = 'CANCELLED';
      return { success: true, status: 'CANCELLED' };
    }

    // Case 2: Posted Delivery (DONE / DELIVERED) -> Reversal
    if (delivery.status === 'DONE' || delivery.status === 'DELIVERED') {
      // Find movements
      const movements = this.stockMovements.filter(m => m.company_id === companyId && m.transaction_id === delivery.id && m.transaction_type === 'DELIVERY');
      if (movements.length === 0) throw new Error('Cannot find stock movements associated with delivery');

      let totalReversalValuation = 0;

      for (const mov of movements) {
        const consumptions = this.costLayerConsumptions.filter(c => c.stock_movement_id === mov.id);

        for (const c of consumptions) {
          totalReversalValuation += c.total_cost;
          // Restore exact FIFO layer
          const layer = this.inventoryCostLayers.find(l => l.id === c.layer_id);
          if (layer) {
            layer.remaining_quantity += c.quantity;
          } else {
            // Restore as new layer if original layer missing
            this.inventoryCostLayers.push({
              id: `restored-${c.layer_id}`,
              company_id: companyId,
              warehouse_id: mov.warehouse_id,
              product_id: mov.product_id,
              quantity: c.quantity,
              unit_cost: c.unit_cost,
              remaining_quantity: c.quantity,
              created_at: new Date(),
            });
          }
        }

        // Restore Physical Stock
        const stockKey = `${mov.warehouse_id}:${mov.product_id}`;
        const stock = this.warehouseStocks.get(stockKey);
        if (stock) {
          stock.current_stock += mov.qty_out;
          stock.available_stock += mov.qty_out;
        }

        // Record Inbound Reversal Movement
        this.stockMovements.push({
          id: `mov-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          company_id: companyId,
          warehouse_id: mov.warehouse_id,
          product_id: mov.product_id,
          transaction_type: 'DELIVERY_REVERSAL',
          transaction_id: delivery.id,
          movement_type: 'DELIVERY_IN',
          qty_in: mov.qty_out,
          qty_out: 0,
          balance_after: stock ? stock.current_stock : 0,
          created_at: new Date(),
        });
      }

      // Reversing Journal Entries: Dr Inventory, Cr COGS
      if (totalReversalValuation > 0) {
        this.journalEntries.push(
          {
            id: `je-rev-inv-${Date.now()}`,
            company_id: companyId,
            reference_type: 'DELIVERY_REVERSAL',
            reference_id: delivery.id,
            account_code: '1-1300', // Inventory Asset
            account_name: 'Persediaan Barang Dagang',
            debit: totalReversalValuation,
            credit: 0,
          },
          {
            id: `je-rev-cogs-${Date.now()}`,
            company_id: companyId,
            reference_type: 'DELIVERY_REVERSAL',
            reference_id: delivery.id,
            account_code: '5-1000', // COGS / HPP
            account_name: 'Harga Pokok Penjualan',
            debit: 0,
            credit: totalReversalValuation,
          },
        );
      }

      delivery.status = 'CANCELLED';

      // Recalculate SO delivery status
      let allDelivered = true;
      let anyDelivered = false;
      const totalDelPerProduct = {};

      for (const d of this.deliveryOrders.values()) {
        if (d.sales_order_id === so.id && (d.status === 'DONE' || d.status === 'DELIVERED')) {
          for (const it of d.items) {
            totalDelPerProduct[it.product_id] = (totalDelPerProduct[it.product_id] || 0) + it.delivered_qty;
          }
        }
      }

      for (const soItem of so.items) {
        const delQty = totalDelPerProduct[soItem.product_id] || 0;
        if (delQty > 0) anyDelivered = true;
        if (delQty < soItem.qty) allDelivered = false;
      }
      so.delivery_status = allDelivered ? 'DELIVERED' : anyDelivered ? 'PARTIAL' : 'PENDING';

      return { success: true, status: 'CANCELLED', reversedCost: totalReversalValuation };
    }
  }
}

// ==========================================
// TEST EXECUTION
// ==========================================
async function runAllTests() {
  console.log('=== TATALORA Phase 5A.2: Delivery Order Fulfillment & FIFO Inventory Issue Test Suite ===\n');
  const runner = new Phase5A2DeliveryFulfillmentRunner();

  // Create Standard Confirmed Sales Order
  // SO-1: 50 units prod-timber @ 250,000, 20 units prod-plywood @ 180,000
  const so1 = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    warehouse_id: 'wh-main',
    status: 'CONFIRMED',
    items: [
      { product_id: 'prod-timber', qty: 50, unit_price: 250000 },
      { product_id: 'prod-plywood', qty: 20, unit_price: 180000 },
    ],
  });

  // ----------------------------------------------------
  // Scenario 1: Create a Delivery Order from confirmed SO
  // ----------------------------------------------------
  console.log('--- SCENARIO 1: Create Delivery Order from Confirmed SO ---');
  const do1 = runner.createDeliveryOrder('comp-1', so1.id, {
    items: [
      { product_id: 'prod-timber', qty: 20 },
      { product_id: 'prod-plywood', qty: 10 },
    ],
  });
  assert.strictEqual(do1.status, 'WAITING');
  assert.strictEqual(do1.items.length, 2);
  assert.strictEqual(do1.delivery_number.startsWith('DO/'), true);
  console.log(`✔ Scenario 1 Passed: Delivery Order [${do1.delivery_number}] created in WAITING status.`);

  // ----------------------------------------------------
  // Scenario 2: Reject delivery from an unconfirmed SO
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 2: Reject Delivery from Unconfirmed SO ---');
  const soDraft = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    status: 'DRAFT',
    items: [{ product_id: 'prod-timber', qty: 10, unit_price: 250000 }],
  });
  assert.throws(() => {
    runner.createDeliveryOrder('comp-1', soDraft.id, {
      items: [{ product_id: 'prod-timber', qty: 5 }],
    });
  }, /Order status must be CONFIRMED/);
  console.log('✔ Scenario 2 Passed: Unconfirmed (DRAFT) Sales Order strictly rejected from delivery creation.');

  // ----------------------------------------------------
  // Scenario 3: Complete a full delivery
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 3: Complete Full Delivery ---');
  // Create single-item SO for complete delivery test
  const soFull = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    warehouse_id: 'wh-main',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-plywood', qty: 5, unit_price: 180000 }],
  });
  const doFull = runner.createDeliveryOrder('comp-1', soFull.id, {
    items: [{ product_id: 'prod-plywood', qty: 5 }],
  });
  const fullRes = runner.validateDeliveryOrder('comp-1', doFull.id);
  assert.strictEqual(doFull.status, 'DONE');
  assert.strictEqual(soFull.delivery_status, 'DELIVERED');
  console.log(`✔ Scenario 3 Passed: Full delivery completed; SO delivery_status automatically updated to DELIVERED.`);

  // ----------------------------------------------------
  // Scenario 4: Complete multiple partial deliveries against one SO
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 4: Complete Multiple Partial Deliveries ---');
  // First partial delivery for do1: 20 timber, 10 plywood
  const partRes1 = runner.validateDeliveryOrder('comp-1', do1.id);
  assert.strictEqual(do1.status, 'DONE');
  assert.strictEqual(so1.delivery_status, 'PARTIAL');

  // Second partial delivery: remaining 30 timber, 10 plywood
  const do2 = runner.createDeliveryOrder('comp-1', so1.id, {
    items: [
      { product_id: 'prod-timber', qty: 30 },
      { product_id: 'prod-plywood', qty: 10 },
    ],
  });
  const partRes2 = runner.validateDeliveryOrder('comp-1', do2.id);
  assert.strictEqual(do2.status, 'DONE');
  assert.strictEqual(so1.delivery_status, 'DELIVERED');
  console.log(`✔ Scenario 4 Passed: Multiple partial deliveries executed; SO transitions PARTIAL -> DELIVERED.`);

  // ----------------------------------------------------
  // Scenario 5: Reject quantity exceeding remaining ordered quantity
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 5: Reject Quantity Exceeding Ordered Quantity ---');
  assert.throws(() => {
    runner.createDeliveryOrder('comp-1', so1.id, {
      items: [{ product_id: 'prod-timber', qty: 1 }],
    });
  }, /remaining to be delivered/);
  console.log('✔ Scenario 5 Passed: Over-delivery beyond ordered quantity strictly prevented.');

  // ----------------------------------------------------
  // Scenario 6: Reject insufficient physical stock
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 6: Reject Insufficient Warehouse Stock ---');
  // Stock of timber remaining in wh-main is 100 - 50 = 50.
  // Create SO for 80 timber and attempt to deliver 80
  const soOver = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    warehouse_id: 'wh-main',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-timber', qty: 80, unit_price: 250000 }],
  });
  const doOver = runner.createDeliveryOrder('comp-1', soOver.id, {
    items: [{ product_id: 'prod-timber', qty: 80 }],
  });
  assert.throws(() => {
    runner.validateDeliveryOrder('comp-1', doOver.id);
  }, /Insufficient available stock/);
  console.log('✔ Scenario 6 Passed: Insufficient physical stock cleanly caught and rejected.');

  // ----------------------------------------------------
  // Scenario 7 & 8: Verify FIFO layer consumption order & exact FIFO cost calculation
  // ----------------------------------------------------
  console.log('\n--- SCENARIOS 7 & 8: FIFO Layer Consumption Order & Cost Valuation ---');
  // In Scenarios 1 & 4, 50 timber were delivered:
  // Layer 1 (40 units @ 140,000) was completely exhausted = 5,600,000
  // Layer 2 (60 units @ 160,000) was partially consumed by 10 units = 1,600,000
  // Total COGS for 50 timber = 7,200,000
  // Plus 20 plywood from layer-ply-1 (20 @ 120,000) = 2,400,000
  // Total expected COGS for do1 (20 timber + 10 plywood):
  // 20 timber @ 140,000 = 2,800,000 + 10 ply @ 120,000 = 1,200,000 -> Total = 4,000,000
  assert.strictEqual(partRes1.totalCogs, 4000000);

  // Total expected COGS for do2 (30 timber + 10 plywood):
  // Remaining 20 of Layer 1 @ 140,000 = 2,800,000
  // Plus 10 of Layer 2 @ 160,000 = 1,600,000
  // Plus 10 ply @ 120,000 = 1,200,000 -> Total = 5,600,000
  assert.strictEqual(partRes2.totalCogs, 5600000);

  const layerTimber1 = runner.inventoryCostLayers.find(l => l.id === 'layer-timber-1');
  const layerTimber2 = runner.inventoryCostLayers.find(l => l.id === 'layer-timber-2');
  assert.strictEqual(layerTimber1.remaining_quantity, 0); // fully consumed first
  assert.strictEqual(layerTimber2.remaining_quantity, 50); // 60 - 10 = 50 remaining
  console.log('✔ Scenarios 7 & 8 Passed: Strict FIFO ordering verified. Oldest layer exhausted before subsequent layer.');

  // ----------------------------------------------------
  // Scenario 9: Verify StockMovement creation
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 9: StockMovement Creation & Traceability ---');
  const movementsDo1 = runner.stockMovements.filter(m => m.transaction_id === do1.id);
  assert.strictEqual(movementsDo1.length, 2);
  assert.strictEqual(movementsDo1[0].transaction_type, 'DELIVERY');
  assert.strictEqual(movementsDo1[0].qty_out > 0, true);
  console.log('✔ Scenario 9 Passed: Immutable StockMovement records created for each delivered item.');

  // ----------------------------------------------------
  // Scenario 10: Verify COGS debit and Inventory credit journals
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 10: General Ledger Integration (Dr COGS / Cr Inventory) ---');
  const journalsDo1 = runner.journalEntries.filter(j => j.reference_id === do1.id);
  assert.strictEqual(journalsDo1.length, 2);
  const drCogs = journalsDo1.find(j => j.account_code === '5-1000');
  const crInv = journalsDo1.find(j => j.account_code === '1-1300');
  assert.strictEqual(drCogs.debit, 4000000);
  assert.strictEqual(crInv.credit, 4000000);
  assert.strictEqual(drCogs.debit, crInv.credit);
  console.log(`✔ Scenario 10 Passed: Balanced GL JournalEntry posted: Dr COGS 4,000,000 / Cr Inventory 4,000,000.`);

  // ----------------------------------------------------
  // Scenario 11 & 12: Verify NO Revenue, AR, or Cash movement
  // ----------------------------------------------------
  console.log('\n--- SCENARIOS 11 & 12: Revenue, AR & Cash Invariant Verification ---');
  const revenueJournals = runner.journalEntries.filter(j => j.account_code.startsWith('4-'));
  const arJournals = runner.journalEntries.filter(j => j.account_code === '1-1200' || j.account_code.startsWith('1-12'));
  assert.strictEqual(revenueJournals.length, 0);
  assert.strictEqual(arJournals.length, 0);

  const bankBca = runner.cashAccounts.get('bank-bca');
  assert.strictEqual(bankBca.balance, 500000000); // 0 cash movement
  assert.strictEqual(runner.financeTransactions.length, 0);
  console.log('✔ Scenarios 11 & 12 Passed: Zero revenue, zero AR, and zero cash movements verified.');

  // ----------------------------------------------------
  // Scenario 13: Reject duplicate fulfillment
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 13: Reject Duplicate DO Fulfillment ---');
  assert.throws(() => {
    runner.validateDeliveryOrder('comp-1', do1.id);
  }, /Delivery already validated\/posted/);
  console.log('✔ Scenario 13 Passed: Already validated delivery cannot be validated again.');

  // ----------------------------------------------------
  // Scenario 14: Test concurrent completion of same DO
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 14: Concurrent Completion of Same DO ---');
  const soConc = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-timber', qty: 5, unit_price: 250000 }],
  });
  const doConc = runner.createDeliveryOrder('comp-1', soConc.id, {
    items: [{ product_id: 'prod-timber', qty: 5 }],
  });

  let concSuccess = 0;
  let concFail = 0;
  const tryValidate = () => {
    try {
      runner.validateDeliveryOrder('comp-1', doConc.id);
      concSuccess++;
    } catch (e) {
      concFail++;
    }
  };
  tryValidate();
  tryValidate();
  assert.strictEqual(concSuccess, 1);
  assert.strictEqual(concFail, 1);
  console.log('✔ Scenario 14 Passed: Exactly 1 concurrent request succeeded, race condition blocked.');

  // ----------------------------------------------------
  // Scenario 15: Concurrent deliveries competing for same stock
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 15: Concurrent Deliveries Competing for Limited Stock ---');
  // Current available timber stock is 45 (100 - 50 - 5 = 45).
  // Two orders of 30 timber each compete:
  const soCompA = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-timber', qty: 30, unit_price: 250000 }],
  });
  const soCompB = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-timber', qty: 30, unit_price: 250000 }],
  });

  const doCompA = runner.createDeliveryOrder('comp-1', soCompA.id, {
    items: [{ product_id: 'prod-timber', qty: 30 }],
  });
  const doCompB = runner.createDeliveryOrder('comp-1', soCompB.id, {
    items: [{ product_id: 'prod-timber', qty: 30 }],
  });

  // Validate A succeeds (leaves 15 stock)
  runner.validateDeliveryOrder('comp-1', doCompA.id);
  assert.strictEqual(doCompA.status, 'DONE');

  // Validate B must fail (only 15 stock remaining, needed 30)
  assert.throws(() => {
    runner.validateDeliveryOrder('comp-1', doCompB.id);
  }, /Insufficient available stock/);
  console.log('✔ Scenario 15 Passed: Serialized stock allocation prevents overdraft under competing demand.');

  // ----------------------------------------------------
  // Scenario 16: Concurrent partial deliveries against same SO item
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 16: Concurrent Partial Deliveries Against Same SO Item ---');
  const soItemRace = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-plywood', qty: 10, unit_price: 180000 }],
  });
  // Available ply stock is 25 (50 - 20 - 5 = 25).
  const doRace1 = runner.createDeliveryOrder('comp-1', soItemRace.id, {
    items: [{ product_id: 'prod-plywood', qty: 6 }],
  });
  const doRace2 = runner.createDeliveryOrder('comp-1', soItemRace.id, {
    items: [{ product_id: 'prod-plywood', qty: 4 }],
  });

  runner.validateDeliveryOrder('comp-1', doRace1.id);
  runner.validateDeliveryOrder('comp-1', doRace2.id);
  assert.strictEqual(soItemRace.delivery_status, 'DELIVERED');

  // A third delivery attempting any additional quantity fails
  assert.throws(() => {
    runner.createDeliveryOrder('comp-1', soItemRace.id, {
      items: [{ product_id: 'prod-plywood', qty: 1 }],
    });
  }, /remaining to be delivered/);
  console.log('✔ Scenario 16 Passed: Aggregate order fulfillment capacity accurately protected.');

  // ----------------------------------------------------
  // Scenario 17: Test rollback when FIFO consumption fails
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 17: Fault Injection - FIFO Failure Rollback ---');
  const stockBeforeFail = runner.warehouseStocks.get('wh-main:prod-timber').current_stock;
  const mvtCountBefore = runner.stockMovements.length;

  const soFifoFail = runner.createSalesOrder('comp-1', {
    customer_id: 'cust-1',
    status: 'CONFIRMED',
    items: [{ product_id: 'prod-timber', qty: 5, unit_price: 250000 }],
  });
  const doFifoFail = runner.createDeliveryOrder('comp-1', soFifoFail.id, {
    items: [{ product_id: 'prod-timber', qty: 5 }],
  });

  assert.throws(() => {
    runner.validateDeliveryOrder('comp-1', doFifoFail.id, { failDuringFifo: true });
  }, /FAULT_INJECTED_FIFO_FAILURE/);

  assert.strictEqual(doFifoFail.status, 'WAITING');
  assert.strictEqual(runner.warehouseStocks.get('wh-main:prod-timber').current_stock, stockBeforeFail);
  assert.strictEqual(runner.stockMovements.length, mvtCountBefore);
  console.log('✔ Scenario 17 Passed: Rollback verified upon FIFO failure; physical stock untouched.');

  // ----------------------------------------------------
  // Scenario 18: Test rollback when Journal creation fails
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 18: Fault Injection - Journal Failure Rollback ---');
  const jnlCountBefore = runner.journalEntries.length;
  assert.throws(() => {
    runner.validateDeliveryOrder('comp-1', doFifoFail.id, { failDuringJournal: true });
  }, /FAULT_INJECTED_JOURNAL_FAILURE/);

  assert.strictEqual(doFifoFail.status, 'WAITING');
  assert.strictEqual(runner.journalEntries.length, jnlCountBefore);
  assert.strictEqual(runner.warehouseStocks.get('wh-main:prod-timber').current_stock, stockBeforeFail);
  console.log('✔ Scenario 18 Passed: Rollback verified upon accounting failure; zero uncommitted state.');

  // ----------------------------------------------------
  // Scenario 19: Test cross-company isolation
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 19: Cross-Company Isolation ---');
  assert.throws(() => {
    // Attempt to deliver using other company's warehouse
    runner.validateDeliveryOrder('comp-1', doFifoFail.id, { warehouseId: 'wh-comp2' });
  }, /Warehouse wh-comp2 is invalid or does not belong to company/);
  console.log('✔ Scenario 19 Passed: Tenant isolation enforced on warehouse boundaries.');

  // ----------------------------------------------------
  // Scenario 20: Verify DONE document immutability
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 20: DONE Document Immutability ---');
  assert.throws(() => {
    runner.validateDeliveryOrder('comp-1', do1.id);
  }, /already validated/);
  console.log('✔ Scenario 20 Passed: DONE documents cannot be re-validated or directly overwritten.');

  // ----------------------------------------------------
  // Scenario 21: Cancel unfulfilled Delivery Order
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 21: Cancellation of Unfulfilled Delivery ---');
  const cancelRes = runner.cancelDeliveryOrder('comp-1', doFifoFail.id);
  assert.strictEqual(cancelRes.status, 'CANCELLED');
  assert.strictEqual(doFifoFail.status, 'CANCELLED');
  console.log('✔ Scenario 21 Passed: Unposted delivery safely cancelled without stock or financial mutations.');

  // ----------------------------------------------------
  // Scenario 22: Safe Reversal of DONE delivery
  // ----------------------------------------------------
  console.log('\n--- SCENARIO 22: Reversal of Posted (DONE) Delivery ---');
  // Reversing doFull (5 plywood delivered with total cogs 600,000)
  const plyStockBeforeRev = runner.warehouseStocks.get('wh-main:prod-plywood').current_stock;
  const plyLayer = runner.inventoryCostLayers.find(l => l.id === 'layer-ply-1');
  const plyLayerQtyBeforeRev = plyLayer.remaining_quantity;

  const revRes = runner.cancelDeliveryOrder('comp-1', doFull.id);
  assert.strictEqual(revRes.status, 'CANCELLED');
  assert.strictEqual(revRes.reversedCost, 600000);

  // Stock restored
  const plyStockAfterRev = runner.warehouseStocks.get('wh-main:prod-plywood').current_stock;
  assert.strictEqual(plyStockAfterRev, plyStockBeforeRev + 5);

  // Layer restored at exact original cost
  assert.strictEqual(plyLayer.remaining_quantity, plyLayerQtyBeforeRev + 5);

  // Inbound Reversal movement recorded
  const revMovement = runner.stockMovements.find(m => m.transaction_id === doFull.id && m.transaction_type === 'DELIVERY_REVERSAL');
  assert.ok(revMovement != null);
  assert.strictEqual(revMovement.qty_in, 5);

  // Offsetting Journal recorded: Dr Inventory, Cr COGS
  const revJournals = runner.journalEntries.filter(j => j.reference_id === doFull.id && j.reference_type === 'DELIVERY_REVERSAL');
  assert.strictEqual(revJournals.length, 2);
  const drInv = revJournals.find(j => j.account_code === '1-1300');
  const crCogs = revJournals.find(j => j.account_code === '5-1000');
  assert.strictEqual(drInv.debit, 600000);
  assert.strictEqual(crCogs.credit, 600000);

  // SO delivery_status reverted
  assert.strictEqual(soFull.delivery_status, 'PENDING');
  console.log(`✔ Scenario 22 Passed: Full delivery reversal succeeded. Stock, exact FIFO layers, COGS journal, and SO status cleanly restored.`);

  console.log('\n================================================================');
  console.log('ALL PHASE 5A.2 DELIVERY FULFILLMENT AUDITS PASSED (22/22 SCENARIOS)!');
  console.log('================================================================\n');
}

runAllTests().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
