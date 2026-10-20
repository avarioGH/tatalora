const fs = require("fs");
let content = fs.readFileSync("backend/prisma/schema.prisma", "utf8");
content = content.replace("payments         Payment[]\n  payments         Payment[]", "payments         Payment[]");
content = content.replace("allocations    PaymentAllocation[]\n\n  allocations    PaymentAllocation[]", "allocations    PaymentAllocation[]");
content = content.replace("allocations    PaymentAllocation[]\n  allocations    PaymentAllocation[]", "allocations    PaymentAllocation[]");
fs.writeFileSync("backend/prisma/schema.prisma", content);

