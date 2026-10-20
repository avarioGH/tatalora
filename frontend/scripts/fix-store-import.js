const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/inventory/products/page.tsx');
let c = fs.readFileSync(p, 'utf8');

if (!c.includes(' Store ') && !c.includes('Store,')) {
  c = c.replace(
    'import { Upload, X, QrCode, Edit, ChevronDown } from "lucide-react"',
    'import { Upload, X, QrCode, Edit, ChevronDown, Store } from "lucide-react"'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Added Store icon import');
} else {
  console.log('Store icon import already exists');
}
