const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { execSync, spawn } = require('child_process');
const path = require('path');

async function main() {
  console.log('Starting MongoDB Memory Replica Set...');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let uri = replSet.getUri();
  
  if (uri.includes('?')) {
    uri = uri.replace('?', 'erp_db?');
  } else if (uri.endsWith('/')) {
    uri += 'erp_db';
  } else {
    uri += '/erp_db';
  }
  
  console.log(`MongoDB Memory Server started at: ${uri}`);
  require('fs').writeFileSync(path.join(__dirname, '.test-db-url'), uri);
  process.env.DATABASE_URL = uri;
  process.env.PORT = '3001'; // Let's set port 3001 for the backend to avoid collision with frontend

  
  // console.log('Pushing Prisma Schema...');
  // execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit', env: process.env });
  
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
  
  console.log('Seeding Database...');
  try {
    execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });
  } catch (e) {
    console.log('Seed failed or not defined, skipping...');
  }
  
  console.log('Starting NestJS server...');
  const nestProcess = spawn('npm', ['run', 'start:dev'], { stdio: 'inherit', env: process.env, shell: true });
  
  nestProcess.on('close', (code) => {
    console.log(`NestJS process exited with code ${code}`);
    replSet.stop();
    process.exit(code);
  });
  
  process.on('SIGINT', async () => {
    console.log('Stopping server...');
    nestProcess.kill('SIGINT');
    await replSet.stop();
    process.exit(0);
  });
}

main().catch(console.error);
