const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/products/page.tsx', 'utf8');

// Find the section for Harga Beli Dasar
content = content.replace(
  /<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Harga Beli Dasar <span className="text-red-500">\*<\/span><\/Label>\s*<div className="relative">\s*<span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">Rp<\/span>\s*<Input\s*type="number"\s*placeholder="0"\s*value=\{formData.purchasePrice\}\s*onChange=\{\(e\) => setFormData\(\{\.\.\.formData, purchasePrice: e.target.value\}\)\}\s*className="pl-9 font-mono"\s*required\s*\/>/g,
  `<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Harga Beli Dasar</Label>
   <div className="relative">
   <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">Rp</span>
   <Input 
   type="number" 
   placeholder="0"
   value={formData.purchasePrice} 
   onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} 
   className="pl-9 font-mono"
   />`
);

fs.writeFileSync('src/app/inventory/products/page.tsx', content);
