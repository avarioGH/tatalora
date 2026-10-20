const axios = require('axios');
const assert = require('assert');

const API = 'http://localhost:3001';
let token = '';
let companyId = '';

async function runTests() {
  try {
    console.log('1. Login...');
    const loginRes = await axios.post(`${API}/auth/login`, { username: 'owner', password: 'password123' });
    token = loginRes.data.access_token;
    companyId = loginRes.data.user.company_id;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('2. Create test customer and product...');
    const custRes = await axios.post(`${API}/crm/customers`, { name: 'Audit Customer', phone: '081234' });
    const customerId = custRes.data.id;
    
    const prodRes = await axios.post(`${API}/inventory/products`, { name: 'Audit Product', code: 'PROD-01', selling_price: 10000 });
    const productId = prodRes.data.id;

    console.log('3. Test Quotation Conversion...');
    const qRes = await axios.post(`${API}/crm/quotations`, {
      customer_id: customerId,
      quotation_date: new Date().toISOString(),
      items: [{ product_id: productId, qty: 10, unit_price: 10000 }]
    });
    const quotationId = qRes.data.id;
    
    // Confirm Quotation
    await axios.post(`${API}/crm/quotations/${quotationId}/confirm`);
    
    // Check if Sales Order was created automatically (since backend code does this)
    const qDetails = await axios.get(`${API}/crm/quotations/${quotationId}`);
    const salesOrders = qDetails.data.sales_orders || [];
    if(salesOrders.length === 0) {
      console.log('FAIL: Sales Order was not automatically created on confirm');
    } else {
      console.log(`PASS: Quotation converted to SO (${salesOrders[0].id})`);
    }

    console.log('All available backend tests executed successfully.');
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  }
}

runTests();
