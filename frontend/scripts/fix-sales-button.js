const fs = require('fs');
const p = 'src/app/sales/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  /<DropdownMenuTrigger asChild>\s*<Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-none px-2">\s*<ChevronDown className="w-4 h-4" \/>\s*<\/Button>\s*<\/DropdownMenuTrigger>/g,
  `<DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-none px-2 h-9">
    <ChevronDown className="w-4 h-4" />
  </DropdownMenuTrigger>`
);
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed nested button correctly in sales/page.tsx');
