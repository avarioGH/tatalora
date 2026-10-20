const fs = require('fs');
const path = require('path');

const oPath = path.join(__dirname, '../src/app/sales/orders/create/page.tsx');
let content = fs.readFileSync(oPath, 'utf8');

// 1. Add CurrencyInput import
if (!content.includes('CurrencyInput')) {
  content = content.replace(
    'import { Input } from "@/components/ui/input"',
    'import { Input } from "@/components/ui/input"\nimport { CurrencyInput } from "@/components/ui/currency-input"'
  );
}

// 2. Add currency to form state
if (!content.includes('currency: "IDR"')) {
  content = content.replace(
    'payment_method: "Transfer"',
    'payment_method: "Transfer",\n    currency: "IDR"'
  );
}

// 3. Add Mata Uang select in Data Utama card
const cardContentTarget = `<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

const newCardContent = `<CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mata Uang</Label>
              <Select value={form.currency} onValueChange={(v: any) => setForm({...form, currency: v || 'IDR'})}>
                <SelectTrigger><SelectValue placeholder="Pilih Mata Uang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Rupiah Indonesia (Rp)</SelectItem>
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar (S$)</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>`;

if (!content.includes('Mata Uang')) {
  content = content.replace(cardContentTarget, newCardContent);
}

// 4. In Table, replace item.unit_price Input with CurrencyInput
content = content.replace(
  `<Input type="number" value={item.unit_price} onChange={e => {
                    const newItems = [...items]; newItems[index].unit_price = e.target.value as any; setItems(newItems);
                  }} />`,
  `<CurrencyInput value={item.unit_price} onChange={val => {
                    const newItems = [...items]; newItems[index].unit_price = val; setItems(newItems);
                  }} prefix={form.currency === 'IDR' ? 'Rp' : form.currency} className="text-right font-medium" />`
);

// 5. In Total / Subtotal labels, show currency
content = content.replace(
  `<Label className="text-xs">Harga Satuan (Rp)</Label>`,
  `<Label className="text-xs">Harga Satuan ({form.currency})</Label>`
);

content = content.replace(
  `value={(Number(item.qty) * Number(item.unit_price)).toLocaleString('id-ID')}`,
  `value={\`\${form.currency} \${(Number(item.qty) * Number(item.unit_price)).toLocaleString('id-ID')}\`}`
);

fs.writeFileSync(oPath, content, 'utf8');
console.log('Successfully upgraded CreateSalesOrderPage with Currency & Auto-formatting CurrencyInput!');
