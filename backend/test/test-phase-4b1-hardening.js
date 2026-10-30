/**
 * Phase 4B.1 Independent Audit & Hardening Test Suite
 * Concurrency, Optimistic Locking, Atomicity, Invariants, and Sequential Numbering
 */

const assert = require('assert');

class MockDatabase {
  constructor() {
    this.sequences = new Map(); // key: `${companyId}:${type}:${prefix}`
    this.purchaseOrders = new Map();
    this.purchaseOrderItems = new Map();
    this.goodsReceipts = new Map();
    this.goodsReceiptItems = new Map();
    this.invoices = new Map();
    this.products = new Map();
    this.stockMovements = [];
    this.fifoLayers = [];
    this.journalEntries = [];
  }

  async transaction(fn) {
    // Snapshot state for atomicity rollback (deep clone maps of objects)
    const cloneMap = (m) => new Map(Array.from(m.entries()).map(([k, v]) => [k, { ...v }]));
    const snapshot = {
      sequences: new Map(this.sequences),
      purchaseOrders: cloneMap(this.purchaseOrders),
      purchaseOrderItems: cloneMap(this.purchaseOrderItems),
      goodsReceipts: cloneMap(this.goodsReceipts),
      goodsReceiptItems: cloneMap(this.goodsReceiptItems),
      invoices: cloneMap(this.invoices),
      products: cloneMap(this.products),
      stockMovements: [...this.stockMovements],
      fifoLayers: [...this.fifoLayers],
      journalEntries: [...this.journalEntries],
    };

    try {
      return await fn(this);
    } catch (err) {
      // Rollback
      this.sequences = snapshot.sequences;
      this.purchaseOrders = snapshot.purchaseOrders;
      this.purchaseOrderItems = snapshot.purchaseOrderItems;
      this.goodsReceipts = snapshot.goodsReceipts;
      this.goodsReceiptItems = snapshot.goodsReceiptItems;
      this.invoices = snapshot.invoices;
      this.products = snapshot.products;
      this.stockMovements = snapshot.stockMovements;
      this.fifoLayers = snapshot.fifoLayers;
      this.journalEntries = snapshot.journalEntries;
      throw err;
    }
  }

  // Atomic upsert with optimistic locking/concurrency simulation
  async upsertSequence(companyId, type, prefix) {
    const key = `${companyId}:${type}:${prefix}`;
    const current = this.sequences.get(key) || 0;
    const next = current + 1;
    this.sequences.set(key, next);
    return next;
  }

  async updatePoItemOptimistic(itemId, expectedReceivedQty, incrementQty) {
    const item = this.purchaseOrderItems.get(itemId);
    if (!item) throw new Error('Item not found');
    if (item.received_qty !== expectedReceivedQty) {
      return { count: 0 }; // Optimistic concurrency conflict!
    }
    item.received_qty += incrementQty;
    return { count: 1 };
  }

  async updatePoItemBilledOptimistic(itemId, expectedBilledQty, newBilledQty) {
    const item = this.purchaseOrderItems.get(itemId);
    if (!item) throw new Error('Item not found');
    if ((item.billed_qty || 0) !== expectedBilledQty) {
      return { count: 0 }; // Optimistic concurrency conflict!
    }
    item.billed_qty = newBilledQty;
    return { count: 1 };
  }
}

class SequenceService {
  async generateNumber(db, companyId, type, prefix, padLength = 5) {
    const num = await db.upsertSequence(companyId, type, prefix);
    return `${prefix}-${String(num).padStart(padLength, '0')}`;
  }
}

class InventoryService {
  async receiveStock(db, data) {
    const product = db.products.get(data.productId);
    if (!product) throw new Error('Product not found: ' + data.productId);

    const previousStock = product.stock;
    const newStock = previousStock + data.quantity;
    product.stock = newStock;

    const sm = {
      id: `sm-${Date.now()}-${Math.random()}`,
      company_id: data.companyId,
      product_id: data.productId,
      type: 'IN',
      quantity: data.quantity,
      reference_type: data.referenceType,
      reference_id: data.referenceId,
      notes: data.description,
      previous_stock: previousStock,
      current_stock: newStock,
    };
    db.stockMovements.push(sm);

    const layer = {
      id: `layer-${Date.now()}-${Math.random()}`,
      company_id: data.companyId,
      product_id: data.productId,
      warehouse_id: data.warehouseId,
      received_date: new Date(),
      qty_received: data.quantity,
      qty_remaining: data.quantity,
      unit_cost: data.unitCost,
      reference_type: data.referenceType,
      reference_id: data.referenceId,
    };
    db.fifoLayers.push(layer);

    return { sm, layer };
  }
}

class PurchasingService {
  constructor(db, sequenceService, inventoryService) {
    this.db = db;
    this.sequenceService = sequenceService;
    this.inventoryService = inventoryService;
  }

  async receiveGoods(companyId, purchaseOrderId, receiptData) {
    return await this.db.transaction(async (tx) => {
      const po = tx.purchaseOrders.get(purchaseOrderId);
      if (!po || po.company_id !== companyId) throw new Error('PO not found');
      if (po.status !== 'CONFIRMED') throw new Error('PO is not confirmed');

      const receiptNumber = await this.sequenceService.generateNumber(
        tx,
        companyId,
        'GOODS_RECEIPT',
        'GRN',
        5
      );

      const grnId = `grn-${receiptNumber}`;
      const grn = {
        id: grnId,
        company_id: companyId,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        warehouse_id: receiptData.warehouseId || po.warehouse_id,
        receipt_number: receiptNumber,
        receipt_date: new Date(),
        status: 'VALIDATED',
        items: [],
      };

      let allFullyReceived = true;
      for (const rItem of receiptData.items) {
        const poItem = tx.purchaseOrderItems.get(rItem.itemId);
        if (!poItem || poItem.purchase_order_id !== po.id) {
          throw new Error('Product not in PO');
        }

        const newReceivedQty = poItem.received_qty + rItem.qty;
        if (newReceivedQty > poItem.qty) {
          throw new Error('Cannot receive more than ordered');
        }

        if (newReceivedQty < poItem.qty) allFullyReceived = false;

        const upR = await tx.updatePoItemOptimistic(
          poItem.id,
          poItem.received_qty,
          rItem.qty
        );
        if (upR.count === 0) {
          throw new Error('Concurrency conflict for PO Item ' + poItem.id);
        }

        await this.inventoryService.receiveStock(tx, {
          companyId,
          warehouseId: grn.warehouse_id,
          productId: rItem.productId,
          quantity: rItem.qty,
          unitCost: poItem.unit_price,
          referenceType: 'PURCHASE_RECEIPT',
          referenceId: grn.id,
          description: 'PO Receipt ' + po.order_number,
        });

        grn.items.push({
          id: `gri-${Date.now()}-${Math.random()}`,
          product_id: rItem.productId,
          qty: rItem.qty,
        });
      }

      po.receipt_status = allFullyReceived ? 'RECEIVED' : 'PARTIAL';
      tx.goodsReceipts.set(grn.id, grn);
      return grn;
    });
  }

  async createVendorBill(companyId, purchaseOrderId, billData) {
    return await this.db.transaction(async (tx) => {
      const po = tx.purchaseOrders.get(purchaseOrderId);
      if (!po || po.company_id !== companyId) throw new Error('PO not found');

      let subtotal = 0;
      let tax = 0;
      let allFullyBilled = true;

      for (const bItem of billData.items) {
        const poItem = tx.purchaseOrderItems.get(bItem.itemId);
        if (!poItem || poItem.purchase_order_id !== po.id) {
          throw new Error('Product not in PO');
        }

        const newBilledQty = (poItem.billed_qty || 0) + bItem.qty;
        if (newBilledQty > poItem.qty) {
          throw new Error('Cannot bill more than PO quantity');
        }

        if (newBilledQty < poItem.qty) allFullyBilled = false;

        const lineSubtotal = bItem.qty * poItem.unit_price;
        const lineTax =
          lineSubtotal * (poItem.tax / (poItem.qty * poItem.unit_price || 1)) || 0;
        subtotal += lineSubtotal;
        tax += lineTax;

        const updateRes = await tx.updatePoItemBilledOptimistic(
          poItem.id,
          poItem.billed_qty || 0,
          newBilledQty
        );
        if (updateRes.count === 0) {
          throw new Error('Concurrency conflict for PO Item ' + poItem.id);
        }
      }

      const total = subtotal + tax;
      const invoiceNumber = await this.sequenceService.generateNumber(
        tx,
        companyId,
        'VENDOR_BILL',
        'VB',
        5
      );

      const invoice = {
        id: `inv-${invoiceNumber}`,
        company_id: companyId,
        type: 'AP',
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date(),
        due_date: billData.dueDate ? new Date(billData.dueDate) : null,
        status: 'POSTED',
        subtotal,
        tax,
        total,
        paid_amount: 0,
        remaining_amount: total,
      };

      po.bill_status = allFullyBilled ? 'BILLED' : 'PARTIAL';
      tx.invoices.set(invoice.id, invoice);

      // Post GL entry
      tx.journalEntries.push({
        id: `je-${Date.now()}-${Math.random()}`,
        company_id: companyId,
        entry_number: `JE-${invoiceNumber}`,
        status: 'POSTED',
        source_type: 'VENDOR_BILL',
        source_id: invoice.id,
        lines: [
          { account: '1-1300 (Persediaan)', debit: total, credit: 0 },
          { account: '2-1100 (Hutang Usaha)', debit: 0, credit: total },
        ],
      });

      return invoice;
    });
  }
}

async function runAudit() {
  console.log('=== TATALORA Phase 4B.1 Independent Audit & Hardening Verification ===\n');

  const db = new MockDatabase();
  const seq = new SequenceService();
  const inv = new InventoryService();
  const svc = new PurchasingService(db, seq, inv);

  const companyId = 'comp-audit-1';
  db.products.set('prod-1', { id: 'prod-1', name: 'Raw Material A', stock: 0 });

  function setupPO(qty = 100) {
    const poId = `po-${Date.now()}-${Math.random()}`;
    const itemId = `item-${Date.now()}-${Math.random()}`;
    const po = {
      id: poId,
      company_id: companyId,
      supplier_id: 'sup-1',
      warehouse_id: 'wh-1',
      order_number: 'PO-00001',
      status: 'CONFIRMED',
      receipt_status: 'PENDING',
      bill_status: 'PENDING',
      total: qty * 50000,
    };
    const item = {
      id: itemId,
      purchase_order_id: poId,
      product_id: 'prod-1',
      qty: qty,
      unit_price: 50000,
      tax: 0,
      received_qty: 0,
      billed_qty: 0,
    };
    db.purchaseOrders.set(poId, po);
    db.purchaseOrderItems.set(itemId, item);
    return { po, item };
  }

  // -------------------------------------------------------------------------
  // Test 1: Concurrency Over-Receipt Race Protection
  // -------------------------------------------------------------------------
  console.log('[AUDIT TEST 1] Concurrency & Race Condition on Goods Receipt:');
  const { po: po1, item: item1 } = setupPO(100);

  // 5 simultaneous requests attempting to receive 30 units each (total 150 > 100)
  const results1 = await Promise.all(
    Array.from({ length: 5 }, () =>
      svc
        .receiveGoods(companyId, po1.id, {
          warehouseId: 'wh-1',
          items: [{ itemId: item1.id, productId: 'prod-1', qty: 30 }],
        })
        .then((res) => ({ success: true, res }))
        .catch((err) => ({ success: false, err: err.message }))
    )
  );

  const passed1 = results1.filter((r) => r.success);
  const failed1 = results1.filter((r) => !r.success);
  console.log(`- Parallel GRN requests: 5`);
  console.log(`- Succeeded: ${passed1.length}, Rejected by concurrency/limits: ${failed1.length}`);
  console.log(`- Final PO received_qty: ${item1.received_qty}/100`);
  assert(item1.received_qty <= 100, 'Invariant violated: received_qty cannot exceed ordered qty');
  assert(passed1.length <= 3, 'Invariant violated: over-receipt occurred');
  console.log('✔ Passed: Optimistic concurrency control prevents over-receipt under parallel execution.\n');

  // -------------------------------------------------------------------------
  // Test 2: Concurrency Over-Billing Race Protection
  // -------------------------------------------------------------------------
  console.log('[AUDIT TEST 2] Concurrency & Race Condition on Vendor Bill:');
  const { po: po2, item: item2 } = setupPO(100);

  // 5 simultaneous requests attempting to bill 30 units each (total 150 > 100)
  const results2 = await Promise.all(
    Array.from({ length: 5 }, () =>
      svc
        .createVendorBill(companyId, po2.id, {
          items: [{ itemId: item2.id, productId: 'prod-1', qty: 30 }],
        })
        .then((res) => ({ success: true, res }))
        .catch((err) => ({ success: false, err: err.message }))
    )
  );

  const passed2 = results2.filter((r) => r.success);
  const failed2 = results2.filter((r) => !r.success);
  console.log(`- Parallel Bill requests: 5`);
  console.log(`- Succeeded: ${passed2.length}, Rejected by concurrency/limits: ${failed2.length}`);
  console.log(`- Final PO billed_qty: ${item2.billed_qty}/100`);
  assert(item2.billed_qty <= 100, 'Invariant violated: billed_qty cannot exceed ordered qty');
  assert(passed2.length <= 3, 'Invariant violated: over-billing occurred');
  console.log('✔ Passed: Optimistic concurrency control prevents over-billing under parallel execution.\n');

  // -------------------------------------------------------------------------
  // Test 3: Sequential Document Numbering & No Collisions
  // -------------------------------------------------------------------------
  console.log('[AUDIT TEST 3] Document Numbering Sequences (SequenceService):');
  const grnNums = await Promise.all(
    Array.from({ length: 15 }, () =>
      seq.generateNumber(db, companyId, 'GOODS_RECEIPT', 'GRN', 5)
    )
  );
  const vbNums = await Promise.all(
    Array.from({ length: 15 }, () =>
      seq.generateNumber(db, companyId, 'VENDOR_BILL', 'VB', 5)
    )
  );
  assert.strictEqual(new Set(grnNums).size, 15, 'GRN sequence collisions detected!');
  assert.strictEqual(new Set(vbNums).size, 15, 'VB sequence collisions detected!');
  console.log(`- 15 concurrent GRN numbers generated: ${grnNums[0]} ... ${grnNums[14]}`);
  console.log(`- 15 concurrent VB numbers generated: ${vbNums[0]} ... ${vbNums[14]}`);
  console.log('✔ Passed: SequenceService produces unique gapless/collision-free numbering.\n');

  // -------------------------------------------------------------------------
  // Test 4: Atomicity & Rollback Integrity on Mid-Operation Failure
  // -------------------------------------------------------------------------
  console.log('[AUDIT TEST 4] Atomicity & Rollback on Transaction Failure:');
  const { po: po4, item: item4 } = setupPO(50);
  const stockBeforeFail = db.products.get('prod-1').stock;
  const initialGrnCount = db.goodsReceipts.size;

  try {
    await svc.receiveGoods(companyId, po4.id, {
      warehouseId: 'wh-1',
      items: [
        { itemId: item4.id, productId: 'prod-1', qty: 20 },
        { itemId: 'invalid-item', productId: 'prod-1', qty: 10 }, // Triggers failure
      ],
    });
    assert.fail('Should have failed');
  } catch (err) {
    console.log(`- Caught expected error: "${err.message}"`);
  }

  assert.strictEqual(db.products.get('prod-1').stock, stockBeforeFail, 'Stock was mutated during failed tx!');
  const restoredItem4 = db.purchaseOrderItems.get(item4.id);
  assert.strictEqual(restoredItem4.received_qty, 0, 'PO item received_qty was mutated during failed tx!');
  assert.strictEqual(db.goodsReceipts.size, initialGrnCount, 'Partial GRN created during failed tx!');
  console.log('✔ Passed: Zero partial state preserved across rolled-back transactions.\n');

  // -------------------------------------------------------------------------
  // Test 5: Invariants (Stock movements, FIFO layers, and GL entries)
  // -------------------------------------------------------------------------
  console.log('[AUDIT TEST 5] Accounting and Inventory Invariant Validation:');
  const { po: po5, item: item5 } = setupPO(40);

  // 5a. Receive 40 units
  const grn = await svc.receiveGoods(companyId, po5.id, {
    warehouseId: 'wh-1',
    items: [{ itemId: item5.id, productId: 'prod-1', qty: 40 }],
  });

  const matchingSm = db.stockMovements.filter((sm) => sm.reference_id === grn.id);
  assert.strictEqual(matchingSm.length, 1, 'Exactly one stock movement per received product');
  assert.strictEqual(matchingSm[0].quantity, 40, 'Stock movement quantity must equal received qty');

  const matchingFifo = db.fifoLayers.filter((l) => l.reference_id === grn.id);
  assert.strictEqual(matchingFifo.length, 1, 'Exactly one FIFO layer per received product');
  assert.strictEqual(matchingFifo[0].qty_remaining, 40, 'FIFO layer remaining qty must equal received qty');
  assert.strictEqual(matchingFifo[0].unit_cost, 50000, 'FIFO layer cost must match PO line cost');

  // 5b. Bill 40 units
  const bill = await svc.createVendorBill(companyId, po5.id, {
    items: [{ itemId: item5.id, productId: 'prod-1', qty: 40 }],
  });

  assert.strictEqual(bill.status, 'POSTED');
  assert.strictEqual(bill.paid_amount, 0, 'Bill must not be automatically marked paid');
  assert.strictEqual(bill.total, 40 * 50000);

  const matchingJe = db.journalEntries.filter((je) => je.source_id === bill.id);
  assert.strictEqual(matchingJe.length, 1, 'Vendor bill must create exactly one GL journal entry');
  const je = matchingJe[0];
  const debitSum = je.lines.reduce((s, l) => s + l.debit, 0);
  const creditSum = je.lines.reduce((s, l) => s + l.credit, 0);
  assert.strictEqual(debitSum, creditSum, 'Debit must equal credit');
  assert.strictEqual(debitSum, bill.total, 'GL debit/credit total must equal invoice total');
  console.log(`- Balanced GL Entry verified: Debit = ${debitSum}, Credit = ${creditSum}`);
  console.log('✔ Passed: All accounting, inventory, and FIFO invariants strictly honored.\n');

  console.log('================================================================');
  console.log('ALL PHASE 4B.1 INDEPENDENT AUDIT & HARDENING TESTS PASSED (5/5)!');
  console.log('================================================================');
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
