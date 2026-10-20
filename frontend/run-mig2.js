const axios = require('axios');

async function main() {
  try {
    const migRes = await axios.get('http://localhost:3001/inventory/migrate-all');
    console.log(migRes.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
  }
}
main();
