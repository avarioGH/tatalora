const fs = require('fs');
const path = require('path');

const qPath = path.join(__dirname, '../src/app/sales/quotations/create/page.tsx');
let content = fs.readFileSync(qPath, 'utf8');

// 1. Add CurrencyInput import
if (!content.includes('CurrencyInput')) {
  content = content.replace(
    "import { Input } from '@/components/ui/input'",
    "import { Input } from '@/components/ui/input'\nimport { CurrencyInput } from '@/components/ui/currency-input'"
  );
}

// 2. Add currency to formData state
if (!content.includes("currency: 'IDR'")) {
  content = content.replace(
    "notes: '',",
    "notes: '',\n    currency: 'IDR',"
  );
}

// 3. Add Mata Uang select in customer section
const customerSectionTarget = `<div className="space-y-2">
                <label className="text-sm font-semibold flex items-center">Pelanggan <span className="text-red-500 ml-1">*</span></label>`;

const newCustomerSection = `<div className="space-y-2">
                <label className="text-sm font-semibold flex items-center">Mata Uang</label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v || 'IDR'})}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Mata Uang" />
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
                <label className="text-sm font-semibold flex items-center">Pelanggan <span className="text-red-500 ml-1">*</span></label>`;

if (!content.includes('Mata Uang')) {
  content = content.replace(customerSectionTarget, newCustomerSection);
}

// 4. In Table, replace item.price Input with CurrencyInput
content = content.replace(
  `<Input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="h-9 bg-background" />`,
  `<CurrencyInput value={item.price} onChange={val => handleItemChange(index, 'price', val)} prefix={formData.currency === 'IDR' ? 'Rp' : formData.currency} className="h-9 bg-background text-right font-medium" />`
);

// 5. In Total row, display currency prefix
content = content.replace(
  `Rp. {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(subTotal)}`,
  `{formData.currency} {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(subTotal)}`
);

fs.writeFileSync(qPath, content, 'utf8');
console.log('Successfully upgraded CreateQuotationPage with Currency & Auto-formatting CurrencyInput!');
