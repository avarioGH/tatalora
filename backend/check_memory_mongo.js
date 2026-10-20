const { MongoMemoryReplSet } = require('mongodb-memory-server');

async function check() {
  try {
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    console.log('MEMORY_MONGO_URI=' + uri);
    await replSet.stop();
  } catch (e) {
    console.error('FAILED TO START IN-MEMORY MONGO', e);
  }
}
check();
