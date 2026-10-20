
const fs = require("fs");
// Check fifo engine for zero-cost fallback
const fifo = fs.readFileSync("src/inventory/fifo.engine.ts", "utf8");
const fifoBad = [];
if (fifo.includes("0 cost") || fifo.includes("assume 0") || fifo.includes("cost for remainder")) {
  const lines = fifo.split("\n");
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes("0 cost") || l.includes("assume 0") || l.includes("cost for remainder") || l.includes("INSUFFICIENT_FIFO")) {
      fifoBad.push({ line: i+1, content: l.trim() });
    }
  });
}
console.log("FIFO ZERO-COST FALLBACK:", JSON.stringify(fifoBad, null, 2));

// Check if remaining_quantity negative guard exists
const negGuard = fifo.includes("remaining_quantity: { gt: 0 }");
const atomicGuard = fifo.includes("count === 0");
console.log("\\nFIFO remaining_quantity > 0 guard:", negGuard);
console.log("FIFO atomic CAS guard on updateMany:", atomicGuard);

