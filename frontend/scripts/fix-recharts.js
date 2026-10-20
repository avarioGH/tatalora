const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/purchasing/overview/page.tsx');
let c = fs.readFileSync(p, 'utf8');

// Replace (value: number) with (value: any)
c = c.replace(
  /formatter=\{\(value: number\) =>/g,
  'formatter={(value: any) =>'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Recharts TS error in purchasing overview');
