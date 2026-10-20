const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/orders/create/page.tsx');
let c = fs.readFileSync(p, 'utf8');

// Remove the wrongly injected useEffect block from SearchableSelect
const wrongUseEffect = `
  useEffect(() => {
    if (quotation_id) {
      B2BApi.getQuotation(quotation_id).then((q: any) => {
        if (q) {
          setForm(prev => ({
            ...prev,
            partner_id: q.customer_id,
            notes: q.notes || prev.notes
          }))
          if (q.items && q.items.length > 0) {
            setItems(q.items.map((i: any) => ({
              product_id: i.product_id,
              qty: i.qty,
              unit_price: i.unit_price
            })))
          }
        }
      }).catch((err: any) => console.error(err))
    }
  }, [quotation_id])`;
  
c = c.replace(wrongUseEffect, '');

// Ensure useSearchParams is imported
if (!c.includes('useSearchParams')) {
  c = c.replace('import { useRouter } from "next/navigation"', 'import { useRouter, useSearchParams } from "next/navigation"');
}

// Ensure the code is inside CreateSalesOrderPage
if (!c.includes('const searchParams = useSearchParams()')) {
  c = c.replace(
    'export default function CreateSalesOrderPage() {\n  const router = useRouter()',
    'export default function CreateSalesOrderPage() {\n  const router = useRouter();\n  const searchParams = useSearchParams();\n  const quotation_id = searchParams.get("quotation_id");' + wrongUseEffect
  );
} else {
  // If searchParams exists but quotation_id does not, maybe fix it
  if (!c.includes('quotation_id = searchParams.get')) {
    c = c.replace(
      'const searchParams = useSearchParams()',
      'const searchParams = useSearchParams();\n  const quotation_id = searchParams.get("quotation_id");' + wrongUseEffect
    );
  }
}

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed CreateSalesOrderPage properly');
