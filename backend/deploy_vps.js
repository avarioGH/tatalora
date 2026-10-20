const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
  const localDir = __dirname;
  const remoteDir = '/root/erp-backend';

  console.log('Connecting to VPS: 194.233.85.181...');
  
  await ssh.connect({
    host: '194.233.85.181',
    username: 'root',
    password: 'Av@rio050306' // Securely provided by user
  });

  console.log('Connected! Preparing remote directory...');
  await ssh.execCommand(`mkdir -p ${remoteDir}`);

  console.log('Uploading files (excluding node_modules, dist, .git)... This may take a few minutes.');
  
  const failed = [];
  const successful = [];

  await ssh.putDirectory(localDir, remoteDir, {
    recursive: true,
    concurrency: 10,
    validate: (itemPath) => {
      const baseName = path.basename(itemPath);
      return baseName !== 'node_modules' && 
             baseName !== 'dist' && 
             baseName !== '.git' &&
             baseName !== 'backend-deploy.zip' &&
             baseName !== 'deploy_vps.js';
    },
    tick: (localPath, remotePath, error) => {
      if (error) {
        failed.push(localPath);
      } else {
        successful.push(localPath);
      }
    }
  });

  console.log(`Upload complete. Successful: ${successful.length}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.error('Some files failed to upload. Check connection.');
  }

  console.log('Executing deployment commands on VPS...');
  
  const cmd = `
    cd ${remoteDir}
    cp -f .env.production .env
    apt-get update
    apt-get install docker.io docker-compose -y || true
    systemctl enable docker
    systemctl start docker
    docker-compose up -d --build
  `;

  const result = await ssh.execCommand(cmd, { cwd: remoteDir });
  console.log('STDOUT: ' + result.stdout);
  console.log('STDERR: ' + result.stderr);
  
  console.log('Deployment script finished!');
  ssh.dispose();
}

deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
