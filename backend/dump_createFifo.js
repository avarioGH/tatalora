
const fs = require("fs");
const content = fs.readFileSync("src/inventory/fifo.engine.ts", "utf8");
console.log(content.substring(content.indexOf("export async function createFifoLayer"), content.indexOf("export async function consumeFifoLayers")));

