const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/purchase-fish/create/page.tsx', 'utf8');

content = content.replace(
  /paid_amount: 0,\s*payment_method: "TUNAI"/g,
  `paid_amount: 0,
    payment_method: "TUNAI",
    payment_terms: 0`
);

content = content.replace(
  /<CardTitle className="text-lg text-blue-700 dark:text-blue-400">Pembayaran Langsung \(Opsional\)<\/CardTitle>/g,
  `<CardTitle className="text-lg text-blue-700 dark:text-blue-400">Pembayaran & Termin (Utang)</CardTitle>`
);

content = content.replace(
  /<CardDescription>Isi jika Kakak langsung membayar \/ mencicil utang ke Nelayan saat ini.<\/CardDescription>/g,
  `<CardDescription>Jika belum dibayar lunas, sisa tagihan akan masuk ke utang. Atur termin jatuh tempo di bawah.</CardDescription>`
);

content = content.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/g,
  `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">`
);

const newDropdown = `
            <div className="space-y-2">
              <Label>Termin / Jatuh Tempo (Hari)</Label>
              <Select 
                value={formData.payment_terms.toString()} 
                onValueChange={val => setFormData({...formData, payment_terms: parseInt(val)})}
              >
                <SelectTrigger className="bg-white dark:bg-background">
                  <SelectValue placeholder="Pilih Termin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cash / 0 Hari</SelectItem>
                  <SelectItem value="7">7 Hari (Net 7)</SelectItem>
                  <SelectItem value="14">14 Hari (Net 14)</SelectItem>
                  <SelectItem value="30">30 Hari (Net 30)</SelectItem>
                  <SelectItem value="60">60 Hari (Net 60)</SelectItem>
                </SelectContent>
              </Select>
            </div>
`;

content = content.replace(
  /<div className="space-y-2">\s*<Label>Metode Pembayaran<\/Label>[\s\S]*?<\/select>\s*<\/div>/g,
  (match) => match + newDropdown
);

fs.writeFileSync('src/app/inventory/purchase-fish/create/page.tsx', content);
