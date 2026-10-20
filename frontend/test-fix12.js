const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/partai/[id]/page.tsx', 'utf8');

// Summary Cards
content = content.replace(/totalRawLogVolM3\.toFixed\(3\)/g, 'Number(totalRawLogVolM3.toFixed(3))');
content = content.replace(/totalOutputM3\.toFixed\(4\)/g, 'Number(totalOutputM3.toFixed(4))');

// Summary Table
content = content.replace(/totalTrimmedVolM3\.toFixed\(3\)/g, 'Number(totalTrimmedVolM3.toFixed(3))');
content = content.replace(/\(totalRawLogVolM3 - totalTrimmedVolM3\)\.toFixed\(3\)/g, 'Number((totalRawLogVolM3 - totalTrimmedVolM3).toFixed(3))');
content = content.replace(/postedM3\.toFixed\(4\)/g, 'Number(postedM3.toFixed(4))');
content = content.replace(/val\.m3\.toFixed\(4\)/g, 'Number(val.m3.toFixed(4))');

fs.writeFileSync('src/app/inventory/partai/[id]/page.tsx', content);
