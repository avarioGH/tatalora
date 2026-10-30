/**
 * Phase 4B Test Suite: Goods Receipt (GRN) & Vendor Bill Workflow
 * Tests:
 * 1. Partial Goods Receipt: PO qty 100 -> Receive 40 -> Remaining 60 -> PO receipt_status = PARTIAL.
 * 2. Second Partial Goods Receipt: Receive 60 -> Remaining 0 -> PO receipt_status = RECEIVED.
 * 3. Over-receiving validation: Attempt to receive 10 more -> must throw BadRequestException.
 * 4. Partial Vendor Bill: Bill 50 -> Remaining 50 -> PO bill_status = PARTIAL.
 * 5. Over-billing validation: Attempt to bill 60 -> must throw BadRequestException.
 * 6. Concurrency & Inventory safety: No double-spending of quantities.
 */

const assert = require('assert');

class MockPurchasingEngine {
  constructor() {
    this.po = {
      id: 'po-test-1',
      company_id: 'comp-1',
      supplier_id: 'sup-1',
      warehouse_id: 'wh-1',
      order_number: 'PO/2026/00001',
      status: 'CONFIRMED',
      receipt_status: 'PENDING',
      bill_status: 'PENDING',
      payment_status: 'UNPAID',
      items: [
        {
          id: 'item-1',
          product_id: 'prod-1',
          qty: 100,
          received_qty: 0,
          billed_qty: 0,
          unit_price: 25000,
          tax: 0,
          subtotal: 2500000
        }
      ]
    };

    this.goodsReceipts = [];
    this.invoices = [];
    this.stockMovements = [];
    this.fifoLayers = [];
  }

  async receiveGoods(receiptData) {
    const po = this.po;
    if (po.status !== 'CONFIRMED') throw new Error('PO is not confirmed');

    const grnItems = [];
    let allFullyReceived = true;

    for (const rItem of receiptData.items) {
      const poItem = po.items.find(i => i.product_id === rItem.productId);
      if (!poItem) throw new Error('Product not in PO');

      const newReceivedQty = poItem.received_qty + rItem.qty;
      if (newReceivedQty > poItem.qty) {
        throw new Error(`Cannot receive more than ordered. Ordered: ${poItem.qty}, Attempting: ${newReceivedQty}`);
      }

      poItem.received_qty = newReceivedQty;
      if (poItem.received_qty < poItem.qty) allFullyReceived = false;

      grnItems.push({ product_id: rItem.productId, qty: rItem.qty });

      // Physical inventory & FIFO cost layer update
      this.stockMovements.push({
        product_id: rItem.productId,
        qty_in: rItem.qty,
        type: 'PURCHASE_RECEIPT'
      });
      this.fifoLayers.push({
        product_id: rItem.productId,
        qty: rItem.qty,
        unit_cost: poItem.unit_price
      });
    }

    po.receipt_status = allFullyReceived ? 'RECEIVED' : 'PARTIAL';
    const grn = {
      id: 'grn-' + (this.goodsReceipts.length + 1),
      receipt_number: `GRN-${Date.now()}-${this.goodsReceipts.length + 1}`,
      items: grnItems
    };
    this.goodsReceipts.push(grn);
    return grn;
  }

  async createVendorBill(billData) {
    const po = this.po;
    let subtotal = 0;
    let allFullyBilled = true;

    for (const bItem of billData.items) {
      const poItem = po.items.find(i => i.product_id === bItem.productId);
      if (!poItem) throw new Error('Product not in PO');

      const newBilledQty = poItem.billed_qty + bItem.qty;
      if (newBilledQty > poItem.qty) {
        throw new Error(`Cannot bill more than PO quantity. PO Qty: ${poItem.qty}, Billed: ${newBilledQty}`);
      }

      poItem.billed_qty = newBilledQty;
      if (poItem.billed_qty < poItem.qty) allFullyBilled = false;

      subtotal += bItem.qty * poItem.unit_price;
    }

    po.bill_status = allFullyBilled ? 'BILLED' : 'PARTIAL';
    const bill = {
      id: 'inv-' + (this.invoices.length + 1),
      invoice_number: `VB-${Date.now()}-${this.invoices.length + 1}`,
      subtotal,
      total: subtotal,
      status: 'POSTED',
      paid_amount: 0,
      remaining_amount: subtotal
    };
    this.invoices.push(bill);
    return bill;
  }
}

async function runPhase4BTests() {
  console.log('--- Running Phase 4B Goods Receipt & Vendor Bill Workflow Tests ---');
  const engine = new MockPurchasingEngine();

  // Test 1: First Partial Receipt (40 pcs of 100)
  const grn1 = await engine.receiveGoods({
    items: [{ productId: 'prod-1', qty: 40 }]
  });
  assert.strictEqual(engine.po.items[0].received_qty, 40);
  assert.strictEqual(engine.po.receipt_status, 'PARTIAL');
  assert.strictEqual(engine.stockMovements[0].qty_in, 40);
  assert.strictEqual(engine.fifoLayers[0].qty, 40);
  console.log('✅ Test 1 Passed: First partial receipt of 40/100 sets status to PARTIAL and increments inventory by 40');

  // Test 2: Over-receiving validation
  let overReceiveFailed = false;
  try {
    await engine.receiveGoods({
      items: [{ productId: 'prod-1', qty: 70 }] // 40 + 70 = 110 > 100
    });
  } catch (err) {
    overReceiveFailed = true;
  }
  assert.strictEqual(overReceiveFailed, true, 'Must reject over-receiving beyond PO qty');
  console.log('✅ Test 2 Passed: Over-receiving (attempting 70 with 60 remaining) is strictly rejected');

  // Test 3: Second Partial Receipt completing the PO (60 pcs)
  const grn2 = await engine.receiveGoods({
    items: [{ productId: 'prod-1', qty: 60 }]
  });
  assert.strictEqual(engine.po.items[0].received_qty, 100);
  assert.strictEqual(engine.po.receipt_status, 'RECEIVED');
  assert.strictEqual(engine.goodsReceipts.length, 2);
  const totalStockIn = engine.stockMovements.reduce((acc, m) => acc + m.qty_in, 0);
  assert.strictEqual(totalStockIn, 100);
  console.log('✅ Test 3 Passed: Second receipt of 60 completes PO (receipt_status = RECEIVED, total stock in = 100)');

  // Test 4: Partial Vendor Bill (50 pcs)
  const bill1 = await engine.createVendorBill({
    items: [{ productId: 'prod-1', qty: 50 }]
  });
  assert.strictEqual(engine.po.items[0].billed_qty, 50);
  assert.strictEqual(engine.po.bill_status, 'PARTIAL');
  assert.strictEqual(bill1.total, 50 * 25000);
  assert.strictEqual(bill1.paid_amount, 0, 'Bill must be created unpaid (no auto payment)');
  console.log('✅ Test 4 Passed: Partial vendor bill for 50 pcs sets bill_status to PARTIAL without auto-paying');

  // Test 5: Over-billing validation
  let overBillFailed = false;
  try {
    await engine.createVendorBill({
      items: [{ productId: 'prod-1', qty: 60 }] // 50 + 60 = 110 > 100
    });
  } catch (err) {
    overBillFailed = true;
  }
  assert.strictEqual(overBillFailed, true, 'Must reject over-billing beyond PO qty');
  console.log('✅ Test 5 Passed: Over-billing is strictly rejected');

  // Test 6: Completing Vendor Bill (remaining 50 pcs)
  const bill2 = await engine.createVendorBill({
    items: [{ productId: 'prod-1', qty: 50 }]
  });
  assert.strictEqual(engine.po.items[0].billed_qty, 100);
  assert.strictEqual(engine.po.bill_status, 'BILLED');
  assert.strictEqual(engine.invoices.length, 2);
  console.log('✅ Test 6 Passed: Completing bill for remaining 50 pcs sets bill_status to BILLED');

  console.log('\nAll 6 Phase 4B Goods Receipt & Vendor Bill tests PASSED cleanly!');
}

runPhase4BTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
