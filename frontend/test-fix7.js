const fs = require('fs');
const file = 'src/app/inventory/partai/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /<SelectItem key=\{g\.id\} value=\{g\.id\}>\{g\.name && g\.name\.trim\(\) !== "" \? \(g\.code \? g\.code \+ ' - ' \+ g\.name : g\.name\) : \(g\.code && g\.code\.trim\(\) \!== "" \? g\.code : "Grade " \+ g\.id\.substring\(g\.id\.length - 4\)\)\}<\/SelectItem>/g,
  `<SelectItem key={g.id || g._id} value={g.id || g._id}>{g.name ? g.name : (g.code ? g.code : "Grade " + (g.id || g._id).toString().slice(-4))}</SelectItem>`
);
fs.writeFileSync(file, content);
