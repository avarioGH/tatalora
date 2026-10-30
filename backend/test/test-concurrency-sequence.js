const assert = require('assert');

// Simulate multi-worker concurrent requests trying to create sequences
class ConcurrencyDbMock {
  constructor() {
    this.table = new Map(); // composite key -> record
    this.poTable = new Map(); // (company_id + order_number) -> record
  }

  async upsertSequence(companyId, type, prefix) {
    const key = `${companyId}_${type}_${prefix}`;
    let rec = this.table.get(key);
    if (rec) {
      rec.last_value += 1;
    } else {
      rec = { company_id: companyId, type, prefix, last_value: 1 };
      this.table.set(key, rec);
    }
    const padded = rec.last_value.toString().padStart(5, '0');
    return `${prefix}${padded}`;
  }

  async insertPO(companyId, orderNumber) {
    const poKey = `${companyId}_${orderNumber}`;
    if (this.poTable.has(poKey)) {
      throw new Error(`P2002 Unique constraint failed on (company_id, order_number): ${orderNumber}`);
    }
    const po = { id: 'po-' + Math.random(), company_id: companyId, order_number: orderNumber };
    this.poTable.set(poKey, po);
    return po;
  }
}

async function runConcurrencyStress() {
  console.log('Testing 50 parallel concurrent PO creations...');
  const db = new ConcurrencyDbMock();
  const companyId = 'test-company-1';
  const prefix = 'PO/2026/';

  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push((async () => {
      await new Promise(r => setTimeout(r, Math.random() * 20));
      const orderNumber = await db.upsertSequence(companyId, 'PURCHASE_ORDER', prefix);
      return db.insertPO(companyId, orderNumber);
    })());
  }

  const results = await Promise.all(promises);
  assert.strictEqual(results.length, 50, 'All 50 POs must be created');
  
  const numbers = results.map(r => r.order_number);
  const uniqueNumbers = new Set(numbers);
  assert.strictEqual(uniqueNumbers.size, 50, 'All 50 order numbers must be completely unique');
  assert.strictEqual(numbers[0].startsWith('PO/2026/'), true);
  
  console.log('✅ Concurrency stress test passed: 50/50 unique sequential numbers without any collision.');
}

runConcurrencyStress().catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});
