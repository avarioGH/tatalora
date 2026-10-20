const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/invoices/create/page.tsx');
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('const searchParams = useSearchParams()')) {
  c = c.replace(
    'const router = useRouter()',
    'const router = useRouter();\n  const searchParams = useSearchParams();\n  const quotation_id = searchParams.get("quotation_id");\n  const so_id = searchParams.get("so_id");'
  );
}

if (!c.includes('B2BApi')) {
  c = c.replace(
    'import { useRouter, useSearchParams } from "next/navigation"',
    'import { useRouter, useSearchParams } from "next/navigation"\nimport { B2BApi } from "@/lib/api"'
  );
}

// We also need `setForm` to exist, let's see if setForm exists.
// Wait, the injected code was:
// setForm(prev => ({ ...prev, partner_id: q.customer_id, notes: q.notes || prev.notes }))
if (!c.includes('const [form, setForm]')) {
  c = c.replace(
    'const [items, setItems]',
    'const [form, setForm] = useState({ partner_id: "", notes: "", quotation_id: quotation_id || "", so_id: so_id || "" });\n  const [items, setItems]'
  );
}

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed quotation_id error');
