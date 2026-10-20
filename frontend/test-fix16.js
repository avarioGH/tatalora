const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/sawn-timber/output/page.tsx', 'utf8');

content = content.replace(
  /<td className="py-3 px-6 font-medium text-muted-foreground">\{out\.inputLog\?\.inputNumber \|\| "-"\}<\/td>/,
  '<td className="py-3 px-6 font-medium text-emerald-600 dark:text-emerald-400">{out.partai?.name || "-"}</td>\n                          <td className="py-3 px-6 font-medium text-muted-foreground">{out.inputLog?.inputNumber || "-"}</td>'
);

fs.writeFileSync('src/app/inventory/sawn-timber/output/page.tsx', content);
