
const fs = require("fs");
// P&L Report method - CRITICAL
const finance = fs.readFileSync("src/finance/finance.service.ts", "utf8");
const start = finance.indexOf("async getProfitLossReport");
const end = finance.indexOf("async getCashFlowReport");
const plSection = finance.substring(start, end);
console.log("P&L METHOD (first 1500 chars):", plSection.substring(0, 1500));

