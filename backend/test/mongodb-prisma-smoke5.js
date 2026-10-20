const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { execSync } = require('child_process');

async function testPush() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  uri = uri.replace('/?', '/erp_test?');
  
  process.env.DATABASE_URL = uri;
  console.log('Running prisma db push...');
  try {
    const stdout = execSync('npx prisma db push --skip-generate --accept-data-loss', { env: process.env, stdio: 'pipe' });
    console.log('Push stdout:', stdout.toString());
  } catch(e) {
    console.log('Push error:', e.message);
    if(e.stdout) console.log('STDOUT:', e.stdout.toString());
    if(e.stderr) console.log('STDERR:', e.stderr.toString());
  }
  
  await replSet.stop();
}
testPush();
