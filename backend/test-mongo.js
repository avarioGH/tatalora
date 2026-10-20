const { MongoClient } = require('mongodb');

async function test() {
  const uris = [
    'mongodb://127.0.0.1:27017/erp_db',
    'mongodb://127.0.0.1:27017/keuangan',
    'mongodb://127.0.0.1:27017/avario',
    'mongodb://localhost:27017/erp_db',
    'mongodb://localhost:27017'
  ];
  
  for (const uri of uris) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1000 });
      await client.connect();
      console.log('Connected to', uri);
      await client.close();
      return;
    } catch(e) {}
  }
  console.log('None worked');
}
test();
