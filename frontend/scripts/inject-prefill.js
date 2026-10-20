const fs = require('fs');
const path = require('path');

const orderPagePath = path.join(__dirname, '../src/app/sales/orders/create/page.tsx');
let orderContent = fs.readFileSync(orderPagePath, 'utf8');

if (!orderContent.includes('useSearchParams')) {
  orderContent = orderContent.replace(
    'import { useRouter } from "next/navigation"',
    'import { useRouter, useSearchParams } from "next/navigation"'
  );
}

const orderHookInjection = `
  const searchParams = useSearchParams()
  const quotation_id = searchParams.get('quotation_id')
`;
if (!orderContent.includes('const searchParams = useSearchParams()')) {
  orderContent = orderContent.replace(
    'const { toast } = useToast()',
    'const { toast } = useToast()\n' + orderHookInjection
  );
}

const formAddQuotationId = `quotation_id: quotation_id || "",\n    partner_id: "",`;
if (!orderContent.includes('quotation_id: quotation_id')) {
  orderContent = orderContent.replace('partner_id: "",', formAddQuotationId);
}

const orderUseEffectPrefill = `
  useEffect(() => {
    if (quotation_id) {
      B2BApi.getQuotation(quotation_id).then(q => {
        if (q) {
          setForm(prev => ({
            ...prev,
            partner_id: q.customer_id,
            notes: q.notes || prev.notes
          }))
          if (q.items && q.items.length > 0) {
            setItems(q.items.map(i => ({
              product_id: i.product_id,
              qty: i.qty,
              unit_price: i.unit_price
            })))
          }
        }
      }).catch(err => console.error(err))
    }
  }, [quotation_id])
`;
if (!orderContent.includes('B2BApi.getQuotation(quotation_id)')) {
  orderContent = orderContent.replace('useEffect(() => {', orderUseEffectPrefill + '\n  useEffect(() => {');
}

fs.writeFileSync(orderPagePath, orderContent, 'utf8');

// --- Invoices ---
const invoicePagePath = path.join(__dirname, '../src/app/sales/invoices/create/page.tsx');
let invoiceContent = fs.readFileSync(invoicePagePath, 'utf8');

if (!invoiceContent.includes('useSearchParams')) {
  invoiceContent = invoiceContent.replace(
    'import { useRouter } from "next/navigation"',
    'import { useRouter, useSearchParams } from "next/navigation"'
  );
}

const invHookInjection = `
  const searchParams = useSearchParams()
  const quotation_id = searchParams.get('quotation_id')
  const so_id = searchParams.get('so_id')
`;
if (!invoiceContent.includes('const searchParams = useSearchParams()')) {
  invoiceContent = invoiceContent.replace(
    'const { toast } = useToast()',
    'const { toast } = useToast()\n' + invHookInjection
  );
}

const invFormAddQuotationId = `quotation_id: quotation_id || "",\n    so_id: so_id || "",\n    partner_id: "",`;
if (!invoiceContent.includes('quotation_id: quotation_id')) {
  invoiceContent = invoiceContent.replace('partner_id: "",', invFormAddQuotationId);
}

const invUseEffectPrefill = `
  useEffect(() => {
    if (quotation_id) {
      B2BApi.getQuotation(quotation_id).then(q => {
        if (q) {
          setForm(prev => ({
            ...prev,
            partner_id: q.customer_id,
            notes: q.notes || prev.notes
          }))
          if (q.items && q.items.length > 0) {
            setItems(q.items.map(i => ({
              product_id: i.product_id,
              qty: i.qty,
              unit_price: i.unit_price
            })))
          }
        }
      }).catch(err => console.error(err))
    } else if (so_id) {
      B2BApi.getOrder(so_id).then(o => {
        if (o) {
          setForm(prev => ({
            ...prev,
            partner_id: o.customer_id,
            notes: o.notes || prev.notes
          }))
          if (o.items && o.items.length > 0) {
            setItems(o.items.map(i => ({
              product_id: i.product_id,
              qty: i.qty,
              unit_price: i.unit_price
            })))
          }
        }
      }).catch(err => console.error(err))
    }
  }, [quotation_id, so_id])
`;
if (!invoiceContent.includes('B2BApi.getQuotation(quotation_id)')) {
  invoiceContent = invoiceContent.replace('useEffect(() => {', invUseEffectPrefill + '\n  useEffect(() => {');
}

fs.writeFileSync(invoicePagePath, invoiceContent, 'utf8');

console.log('Done prefilling scripts');
