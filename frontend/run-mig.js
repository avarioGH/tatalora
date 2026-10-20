const axios = require('axios');

async function main() {
  try {
    const res = await axios.post('http://localhost:3000/auth/login', {
      email: 'admin@avario.id',
      password: 'password'
    });
    
    const token = res.data.access_token;
    console.log('Got token');
    
    const migRes = await axios.get('http://localhost:3000/inventory/migrate-all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(migRes.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
  }
}
main();
