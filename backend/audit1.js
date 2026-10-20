
const fs = require("fs");
const content = fs.readFileSync("src/inventory/inventory.service.ts", "utf8");
// Check for parseInt, floor, coercions
const lines = content.split("\n");
const issues = [];
lines.forEach((line, i) => {
  if (line.includes("parseInt") || line.includes("Math.floor") || line.includes("Math.round") || line.includes("Math.ceil")) {
    issues.push({ line: i+1, content: line.trim() });
  }
});
console.log("DECIMAL COERCIONS:", JSON.stringify(issues, null, 2));
// Check available_stock formula
const availableStockMentions = lines.filter((l, i) => l.includes("available_stock") && !l.includes("//")).map((l, i) => ({ line: l.trim() }));
console.log("\nAVAILABLE_STOCK UPDATES:", JSON.stringify(availableStockMentions.slice(0, 15), null, 2));

