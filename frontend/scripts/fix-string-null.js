const fs = require('fs');
const p = 'src/app/sales/quotations/create/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'onValueChange={v => setFormData({...formData, customerId: v})}',
  'onValueChange={(v) => setFormData({...formData, customerId: v || ""})}'
);
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Type error for string|null');
