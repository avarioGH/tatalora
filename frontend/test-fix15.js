const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/sawn-timber/output/page.tsx', 'utf8');

content = content.replace(
  /<th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Source Input<\/th>/,
  '<th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Partai</th>\n                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Source Input</th>'
);

content = content.replace(
  /<td className="py-3 px-6 font-medium text-muted-foreground">\{out\.inputLog\?.inputNumber \|\| "-"\.<\/td>/,
  '<td className="py-3 px-6 font-medium text-emerald-600 dark:text-emerald-400">{out.partai?.name || "-"}</td>\n                          <td className="py-3 px-6 font-medium text-muted-foreground">{out.inputLog?.inputNumber || "-"}</td>'
);

content = content.replace(
  /\{totalM3\.toFixed\(4\)\}/,
  '{Number(totalM3.toFixed(4))}'
);

fs.writeFileSync('src/app/inventory/sawn-timber/output/page.tsx', content);
