const fs = require('fs');
let content = fs.readFileSync('src/components/kayu-sidebar.tsx', 'utf8');

content = content.replace(
  /\{\s*title:\s*"Dashboard",\s*url:\s*"\/",\s*icon:\s*LayoutDashboard,\s*id:\s*"generic-dashboard"\s*\}/,
  '{ title: "Dashboard Utama", url: "/", icon: LayoutDashboard, id: "generic-dashboard" },\n   { title: "Dashboard Kayu", url: "/inventory/dashboard", icon: Factory, id: "dashboard" }'
);

fs.writeFileSync('src/components/kayu-sidebar.tsx', content);
