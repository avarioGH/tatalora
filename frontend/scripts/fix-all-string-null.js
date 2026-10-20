const fs = require('fs');
const p = 'src/app/sales/quotations/create/page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /onValueChange=\{v => setFormData\(\{\.\.\.formData, (.*?): v\}\)\}/g,
  'onValueChange={v => setFormData({...formData, $1: v || ""})}'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed all string|null type errors in quotations create page');
