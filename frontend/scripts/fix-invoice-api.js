const fs = require('fs');
const p = 'src/app/reports/sales/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/api\.get\('\/sales\/invoices\?limit=1000'\)/g, 'api.get(\'/finance/invoices?type=SALES&limit=1000\')');
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed API route for invoices');
