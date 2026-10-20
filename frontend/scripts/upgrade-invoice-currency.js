const fs = require('fs');
const path = require('path');

const invoiceCreatePath = path.join(__dirname, '../src/app/sales/invoices/create/page.tsx');
let content = fs.readFileSync(invoiceCreatePath, 'utf8');

// 1. Add CurrencyInput import
if (!content.includes('CurrencyInput')) {
  content = content.replace(
    'import { Input } from "@/components/ui/input"',
    'import { Input } from "@/components/ui/input"\nimport { CurrencyInput } from "@/components/ui/currency-input"'
  );
}

// 2. Add currency state
if (!content.includes('const [currency, setCurrency]')) {
  content = content.replace(
    'const [items, setItems] = useState([',
    'const [currency, setCurrency] = useState("IDR")\n  const [items, setItems] = useState(['
  );
}

// 3. Add Mata Uang select in Section 1 (above/alongside customer & document info)
const customerRowTarget = `<div className="space-y-2">
                  <Label className="text-foreground">Pelanggan <span className="text-rose-500">*</span></Label>`;

const newCustomerRow = `<div className="space-y-2">
                  <Label className="text-foreground">Mata Uang</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v || "IDR")}>
                    <SelectTrigger className="bg-muted border-border font-medium">
                      <SelectValue placeholder="Pilih Mata Uang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">IDR - Rupiah Indonesia (Rp)</SelectItem>
                      <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar (S$)</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Pelanggan <span className="text-rose-500">*</span></Label>`;

if (!content.includes('Mata Uang')) {
  content = content.replace(
    `<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">`,
    `<div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">`
  );
  content = content.replace(customerRowTarget, newCustomerRow);
}

// 4. In Items table, replace Price input with CurrencyInput
content = content.replace(
  `<Input type="number" value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} placeholder="0" className="bg-card border-border text-right" />`,
  `<CurrencyInput value={item.price || 0} onChange={(val) => updateItem(item.id, 'price', val)} prefix={currency === 'IDR' ? 'Rp' : currency} placeholder="0" className="bg-card border-border text-right font-medium" />`
);

// 5. In Summary block, use CurrencyInput for values and replace currency symbols
// Sub Total
content = content.replace(
  `{subTotal.toLocaleString('id-ID')}`,
  `{currency} {subTotal.toLocaleString('id-ID')}`
);

// Diskon
content = content.replace(
  `- {calculatedDiscount.toLocaleString('id-ID')}`,
  `- {currency} {calculatedDiscount.toLocaleString('id-ID')}`
);
content = content.replace(
  `<div className={\`px-3 py-1 cursor-pointer text-xs rounded-sm transition-colors \${discountMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDiscountMode('amount')}>Rp</div>`,
  `<div className={\`px-3 py-1 cursor-pointer text-xs rounded-sm transition-colors \${discountMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDiscountMode('amount')}>{currency}</div>`
);
content = content.replace(
  `<Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" />`,
  `{discountMode === 'percent' ? (
      <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" placeholder="0" />
    ) : (
      <CurrencyInput value={discountValue} onChange={(val) => setDiscountValue(val)} className="h-8 w-32 text-sm text-right" placeholder="0" />
    )}`
);

// Biaya Pengiriman
content = content.replace(
  `{shippingCost.toLocaleString('id-ID')}`,
  `{currency} {shippingCost.toLocaleString('id-ID')}`
);
content = content.replace(
  `<div className="px-3 py-1 bg-muted border border-border rounded-md text-xs text-muted-foreground">Rp</div>`,
  `<div className="px-3 py-1 bg-muted border border-border rounded-md text-xs text-muted-foreground font-medium">{currency}</div>`
);
content = content.replace(
  `<Input type="number" value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value) || 0)} className="h-8 w-32 text-sm" />`,
  `<CurrencyInput value={shippingCost} onChange={(val) => setShippingCost(val)} className="h-8 w-36 text-sm text-right" placeholder="0" />`
);

// Biaya Transaksi
content = content.replace(
  `{calculatedTransactionFee.toLocaleString('id-ID')}`,
  `{currency} {calculatedTransactionFee.toLocaleString('id-ID')}`
);
content = content.replace(
  `<div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${transactionFeeMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setTransactionFeeMode('amount')}>Rp</div>`,
  `<div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${transactionFeeMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setTransactionFeeMode('amount')}>{currency}</div>`
);
content = content.replace(
  `<Input type="number" value={transactionFeeValue} onChange={(e) => setTransactionFeeValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" />`,
  `{transactionFeeMode === 'percent' ? (
      <Input type="number" value={transactionFeeValue} onChange={(e) => setTransactionFeeValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" placeholder="0" />
    ) : (
      <CurrencyInput value={transactionFeeValue} onChange={(val) => setTransactionFeeValue(val)} className="h-8 w-32 text-sm text-right" placeholder="0" />
    )}`
);

// Total
content = content.replace(
  `{total.toLocaleString('id-ID')}`,
  `{currency} {total.toLocaleString('id-ID')}`
);

// Uang Muka
content = content.replace(
  `- {calculatedDownPayment.toLocaleString('id-ID')}`,
  `- {currency} {calculatedDownPayment.toLocaleString('id-ID')}`
);
content = content.replace(
  `<div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${downPaymentMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDownPaymentMode('amount')}>Rp</div>`,
  `<div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${downPaymentMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDownPaymentMode('amount')}>{currency}</div>`
);
content = content.replace(
  `<Input type="number" value={downPaymentValue} onChange={(e) => setDownPaymentValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" />`,
  `{downPaymentMode === 'percent' ? (
      <Input type="number" value={downPaymentValue} onChange={(e) => setDownPaymentValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" placeholder="0" />
    ) : (
      <CurrencyInput value={downPaymentValue} onChange={(val) => setDownPaymentValue(val)} className="h-8 w-32 text-sm text-right" placeholder="0" />
    )}`
);

// Sisa Tagihan (Grand Total)
content = content.replace(
  `{grandTotal.toLocaleString('id-ID')}`,
  `{currency} {grandTotal.toLocaleString('id-ID')}`
);

fs.writeFileSync(invoiceCreatePath, content, 'utf8');
console.log('Successfully upgraded CreateSalesInvoicePage with Currency options & Auto-formatting CurrencyInput!');
