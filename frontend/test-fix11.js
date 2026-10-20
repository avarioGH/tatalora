const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/partai/[id]/page.tsx', 'utf8');

// 1. Add the missing Checkbox TableHead
content = content.replace(
  /<TableRow>\s*<TableHead>Tgl Produksi<\/TableHead>/g,
  '<TableRow>\n                        <TableHead className="w-[50px]"></TableHead>\n                        <TableHead>Tgl Produksi</TableHead>'
);

// 2. Remove trailing zeros from M3 formatting (toFixed(4) to Number(...))
content = content.replace(
  /\{i\.volumeM3\.toFixed\(4\)\}/g,
  '{Number(i.volumeM3.toFixed(4))}'
);

fs.writeFileSync('src/app/inventory/partai/[id]/page.tsx', content);
