const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/sawn-timber/output/page.tsx', 'utf8');

// Add "Partai" to Table Head
content = content.replace(
  /<th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Source Input<\/th>/,
  '<th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Partai</th>\n                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Source Input</th>'
);

// Add "Partai" to Table Body
content = content.replace(
  /<td className="p-4 px-6 align-middle">\{item\.inputLog\?.inputNumber \|\| "-"\.<\/td>/, // Wait, I don't know exact code
  '' // I will use standard string replace below
);
fs.writeFileSync('test-fix14.js', 'check');
