const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/products/page.tsx', 'utf8');

content = content.replace(
  /\{\/\* Total \*\/\}\s*\{visibleColumns\.totalStock && \(\s*<TableCell className="text-center">/g,
  "{/* Total */}\n  {visibleColumns.totalStock && !activeWarehouse && (\n  <TableCell className=\"text-center\">"
);

fs.writeFileSync('src/app/inventory/products/page.tsx', content);
