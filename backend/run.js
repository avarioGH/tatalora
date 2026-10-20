const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, ...v] = line.split('=');
    process.env[k] = v.join('=').trim().replace(/\r/g, '');
  }
});
require('./audit-p23.js');
