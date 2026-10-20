const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/invoices/create/page.tsx');
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('import { B2BApi }')) {
  c = c.replace(
    'import { useRouter, useSearchParams } from "next/navigation"',
    'import { useRouter, useSearchParams } from "next/navigation"\nimport { B2BApi } from "@/lib/api"'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed B2BApi import');
} else {
  console.log('B2BApi already imported');
}
