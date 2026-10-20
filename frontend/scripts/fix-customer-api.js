const fs = require('fs');
const files = [
  'src/app/sales/invoices/create/page.tsx',
  'src/app/sales/quotations/create/page.tsx',
  'src/app/sales/orders/create/page.tsx'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/api\.get\('\/crm\/customers'\)/g, 'api.get(\'/customers\')');
  fs.writeFileSync(f, c, 'utf8');
});
console.log('Fixed API route for customers');
