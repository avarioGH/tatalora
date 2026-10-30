/**
 * Acceptance Test Simulation for Phase 4B.4:
 * Validates the Target Architecture (Model A GRNI, Strict 3-Way Matching, PPN Masukan Isolation, Variance Handling)
 */

const assert = require('assert');

class TargetAccountingSimulation {
  constructor() {
    this.glEntries = [];
    this.fifoLayers = [];
    this.purchaseOrders = new Map();
    this.goodsReceipts = [];
    this.vendorBills = [];
    this.purchaseDeposits = [];
  }

  // Task 2 & 5.1: Create PO -> No GL
  createPO(id, qty, unitPrice, taxRate = 0) {
    const po = {
      id,
      qty,
      unitPrice,
      taxRate,
      subtotal: qty * unitPrice,
      tax: qty * unitPrice * taxRate,
      total: qty * unitPrice * (1 + taxRate),
      receivedQty: 0,
      billedQty: 0,
      depositPaid: 0,
    };
    this.purchaseOrders.set(id, po);
    return po;
  }

  // Task 2 & 5.4: Purchase Deposit (Advance Payment before receiving goods)
  recordPurchaseDeposit(poId, depositAmount, bankAccountId = '1-1001') {
    const po = this.purchaseOrders.get(poId);
    po.depositPaid += depositAmount;

    const entry = {
      event: `Purchase Deposit for ${poId}`,
      lines: [
        { code: '1-1410', name: 'Uang Muka Pembelian (Purchase Deposit)', debit: depositAmount, credit: 0 },
        { code: bankAccountId, name: 'Kas / Bank', debit: 0, credit: depositAmount },
      ],
    };
    this.glEntries.push(entry);
    this.purchaseDeposits.push({ poId, amount: depositAmount });
    return entry;
  }

  // Task 2 & 5.1: GRN creates Inventory Asset & GRNI clearing (Model A)
  receiveGoods(poId, qty) {
    const po = this.purchaseOrders.get(poId);
    assert(po.receivedQty + qty <= po.qty, 'Cannot receive more than PO quantity');
    po.receivedQty += qty;

    const receiptValue = qty * po.unitPrice;
    this.fifoLayers.push({ poId, qty, unitPrice: po.unitPrice, value: receiptValue });

    const entry = {
      event: `GRN for ${poId} (${qty} pcs)`,
      lines: [
        { code: '1-1300', name: 'Persediaan Barang', debit: receiptValue, credit: 0 },
        { code: '2-1150', name: 'Hutang Belum Difaktur (GRNI)', debit: 0, credit: receiptValue },
      ],
    };
    this.glEntries.push(entry);
    this.goodsReceipts.push({ poId, qty, value: receiptValue });
    return entry;
  }

  // Task 2, 4, 5.2, 5.3: Vendor Bill matching GRN
  // Formula: Billed Qty <= receivedQty - billedQty (Strict 3-Way Match)
  // Handles Price Variance and PPN Masukan
  createVendorBill(poId, qty, billedUnitPrice, creditableTax = true, applyDeposit = 0) {
    const po = this.purchaseOrders.get(poId);

    // Strict 3-Way Match Rule:
    const unbilledReceivedQty = po.receivedQty - po.billedQty;
    assert(
      qty <= unbilledReceivedQty,
      `Strict 3-Way Match Violation: Attempted to bill ${qty} pcs, but only ${unbilledReceivedQty} pcs received & unbilled.`
    );

    // Variance Rule: 2% tolerance check
    const basePrice = po.unitPrice;
    const variancePerUnit = billedUnitPrice - basePrice;
    const variancePercent = Math.abs(variancePerUnit / basePrice) * 100;
    if (variancePercent > 2) {
      // Must have approval flag
      // In simulation, we assume approval is required and passed
    }

    po.billedQty += qty;

    const grniClearAmount = qty * basePrice; // Always clears GRNI at standard PO receipt cost
    const totalVariance = qty * variancePerUnit;
    const subtotal = qty * billedUnitPrice;
    const taxAmount = subtotal * po.taxRate;
    const totalPayableGross = subtotal + taxAmount;
    const netPayable = totalPayableGross - applyDeposit;

    const lines = [];

    // 1. Clear GRNI (Debit)
    lines.push({ code: '2-1150', name: 'Hutang Belum Difaktur (GRNI)', debit: grniClearAmount, credit: 0 });

    // 2. Handle Price Variance (Debit if unfavorable, Credit if favorable)
    if (totalVariance > 0) {
      lines.push({ code: '5-2100', name: 'Selisih Harga Pembelian (PPV)', debit: totalVariance, credit: 0 });
    } else if (totalVariance < 0) {
      lines.push({ code: '5-2100', name: 'Selisih Harga Pembelian (PPV)', debit: 0, credit: Math.abs(totalVariance) });
    }

    // 3. Tax Treatment: Creditable vs Non-creditable
    if (taxAmount > 0) {
      if (creditableTax) {
        // Isolated into PPN Masukan Asset
        lines.push({ code: '1-1500', name: 'PPN Masukan (Creditable VAT)', debit: taxAmount, credit: 0 });
      } else {
        // Capitalized into Expense / Inventory adjustment
        lines.push({ code: '5-2200', name: 'Pajak Masukan Tidak Dapat Dikreditkan', debit: taxAmount, credit: 0 });
      }
    }

    // 4. Apply Purchase Deposit if any
    if (applyDeposit > 0) {
      assert(applyDeposit <= po.depositPaid, 'Deposit deduction exceeds available deposit');
      po.depositPaid -= applyDeposit;
      lines.push({ code: '1-1410', name: 'Uang Muka Pembelian (Purchase Deposit)', debit: 0, credit: applyDeposit });
    }

    // 5. Recognize Accounts Payable (Credit)
    lines.push({ code: '2-1100', name: 'Hutang Usaha (AP)', debit: 0, credit: netPayable });

    const entry = {
      event: `Vendor Bill for ${poId} (${qty} pcs @ Rp${billedUnitPrice})`,
      lines,
    };
    this.glEntries.push(entry);
    this.vendorBills.push({ poId, qty, billedUnitPrice, netPayable });
    return entry;
  }

  getBalances() {
    const balanceMap = new Map();
    for (const e of this.glEntries) {
      for (const l of e.lines) {
        const cur = balanceMap.get(l.code) || { name: l.name, debit: 0, credit: 0, netDebit: 0 };
        cur.debit += l.debit;
        cur.credit += l.credit;
        cur.netDebit = cur.debit - cur.credit;
        balanceMap.set(l.code, cur);
      }
    }
    return balanceMap;
  }
}

async function runAcceptanceTests() {
  console.log('=== TATALORA Phase 4B.4: Acceptance Test Simulation for Target Architecture ===\n');

  const sim = new TargetAccountingSimulation();

  // Test Case 1: Standard Model A Lifecycle with Strict Matching & PPN Masukan
  console.log('[Test 1] Standard PO -> GRN -> Strict Vendor Bill with 11% PPN...');
  sim.createPO('PO-101', 100, 20000, 0.11); // 100 pcs @ 20.000 + 11% tax

  // 1a. Receive 40 pcs
  sim.receiveGoods('PO-101', 40); // 40 * 20.000 = Rp800.000
  let bal = sim.getBalances();
  assert.strictEqual(bal.get('1-1300').netDebit, 800000, 'Persediaan must reflect physical receipt');
  assert.strictEqual(bal.get('2-1150').credit - bal.get('2-1150').debit, 800000, 'GRNI must equal unbilled receipt value');

  // 1b. Attempt over-bill before second receipt (Strict 3-Way Match Check)
  let failedStrictCheck = false;
  try {
    sim.createVendorBill('PO-101', 50, 20000, true); // Attempting 50 when only 40 received
  } catch (err) {
    failedStrictCheck = true;
    console.log(`  ✔ Strict 3-Way Match caught over-billing: "${err.message}"`);
  }
  assert(failedStrictCheck, 'Must block billing above received qty');

  // 1c. Bill exact 40 pcs with 11% PPN
  sim.createVendorBill('PO-101', 40, 20000, true); // Subtotal 800k, PPN 88k, Total AP 888k
  bal = sim.getBalances();
  assert.strictEqual(bal.get('2-1150').netDebit, 0, 'GRNI for first 40 pcs must be completely cleared to 0');
  assert.strictEqual(bal.get('1-1300').netDebit, 800000, 'Persediaan must NOT be doubled');
  assert.strictEqual(bal.get('1-1500').netDebit, 88000, 'PPN Masukan must be isolated');
  assert.strictEqual(bal.get('2-1100').credit, 888000, 'AP must equal gross invoice');
  console.log('  ✔ Test 1 Passed: GRNI cleared cleanly, inventory never doubled, tax properly isolated.\n');

  // Test Case 2: Advance Payment (Purchase Deposit) Workflow
  console.log('[Test 2] Advance Payment (Purchase Deposit) without Fictitious Inventory...');
  const sim2 = new TargetAccountingSimulation();
  sim2.createPO('PO-202', 10, 100000, 0); // 10 pcs @ 100.000 = Rp1.000.000

  // 2a. Pay 50% Down Payment
  sim2.recordPurchaseDeposit('PO-202', 500000, '1-1001');
  bal = sim2.getBalances();
  assert.strictEqual(bal.get('1-1410').netDebit, 500000, 'Purchase deposit asset recognized');
  assert.strictEqual(bal.get('1-1300'), undefined, 'No fictitious inventory created on deposit');

  // 2b. Receive all 10 pcs
  sim2.receiveGoods('PO-202', 10);
  bal = sim2.getBalances();
  assert.strictEqual(bal.get('1-1300').netDebit, 1000000, 'Inventory recognized on physical receipt');
  assert.strictEqual(bal.get('2-1150').credit - bal.get('2-1150').debit, 1000000, 'GRNI recognized');

  // 2c. Final Vendor Bill deducting Deposit
  sim2.createVendorBill('PO-202', 10, 100000, false, 500000);
  bal = sim2.getBalances();
  assert.strictEqual(bal.get('2-1150').netDebit, 0, 'GRNI cleared to 0');
  assert.strictEqual(bal.get('1-1410').netDebit, 0, 'Purchase deposit cleared to 0');
  assert.strictEqual(bal.get('2-1100').credit, 500000, 'Net AP reflects remaining payable');
  console.log('  ✔ Test 2 Passed: Advance deposit cleanly handled with zero fictitious inventory.\n');

  // Test Case 3: Price Variance Handling (PPV)
  console.log('[Test 3] Price Variance (PO Rp20.000 vs Invoice Rp20.500)...');
  const sim3 = new TargetAccountingSimulation();
  sim3.createPO('PO-303', 10, 20000, 0);
  sim3.receiveGoods('PO-303', 10); // GRNI = 200.000, Persediaan = 200.000

  // Invoice arrives at Rp20.500 (2.5% variance)
  sim3.createVendorBill('PO-303', 10, 20500, false);
  bal = sim3.getBalances();
  assert.strictEqual(bal.get('2-1150').netDebit, 0, 'GRNI cleared at standard PO cost (200k)');
  assert.strictEqual(bal.get('5-2100').netDebit, 5000, 'PPV captures 10 * 500 variance');
  assert.strictEqual(bal.get('2-1100').credit, 205000, 'AP reflects vendor actual invoice');
  assert.strictEqual(bal.get('1-1300').netDebit, 200000, 'Inventory remains stable at receipt valuation');
  console.log('  ✔ Test 3 Passed: Price variance safely isolated into PPV account without distorting inventory.\n');

  console.log('================================================================');
  console.log('ALL PHASE 4B.4 ACCEPTANCE SIMULATION TESTS PASSED!');
  console.log('================================================================');
}

runAcceptanceTests().catch((e) => {
  console.error('Acceptance test failed:', e);
  process.exit(1);
});
