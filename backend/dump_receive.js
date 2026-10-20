
const fs = require("fs");
const content = fs.readFileSync("src/inventory/inventory.service.ts", "utf8");
console.log(content.substring(content.indexOf("async receiveStock"), content.indexOf("async issueStock")));

