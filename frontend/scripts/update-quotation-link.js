const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/quotations/[id]/page.tsx');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  /onClick=\{\(\) => router\.push\('\/sales\/invoices\/create'\)\}/g,
  "onClick={() => router.push('/sales/invoices/create?quotation_id=' + data.id)}"
);

content = content.replace(
  /onClick=\{\(\) => router\.push\('\/sales'\)\}/g,
  "onClick={() => router.push('/sales/orders/create?quotation_id=' + data.id)}"
);

fs.writeFileSync(p, content, 'utf8');
console.log('Done');
