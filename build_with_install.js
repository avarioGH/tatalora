const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH2 :: Connected to VPS!');
  const cmd = `
    sed -i "s/RUN npm ci/RUN npm install --legacy-peer-deps/" /home/danvers/erp-boostup/backend/Dockerfile
    cd /home/danvers/erp-boostup && docker compose build backend && docker compose up -d backend
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Build finished with code:', code);
      conn.end();
    })
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '103.235.75.105',
  port: 22,
  username: 'danvers',
  password: 'Avario050306'
});
