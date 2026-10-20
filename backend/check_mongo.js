const { MongoClient } = require('mongodb');
async function run() {
  try {
    const client = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    console.log('CONNECTED TO LOCAL MONGO');
    await client.close();
  } catch(e) {
    console.log('NO LOCAL MONGO');
  }
}
run();
