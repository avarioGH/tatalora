const fs = require('fs');
const p = 'src/app/reports/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync(p, c, 'utf8');

const p2 = 'src/app/reports/sales/page.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/\\`/g, '`');
c2 = c2.replace(/\\\$/g, '$');
fs.writeFileSync(p2, c2, 'utf8');

console.log('Fixed JSX syntax error in reports/page.tsx and reports/sales/page.tsx');
