const xlsx = require('xlsx');
const fs = require('fs');

const path = 'C:/Users/Billion/Downloads/13. PROD SWM ULIN AWIE.xlsx';
if (!fs.existsSync(path)) {
    console.error("File not found: " + path);
    process.exit(1);
}

const wb = xlsx.readFile(path);
console.log("Sheets:", wb.SheetNames.join(', '));

// Let's get "Output Sawn timber"
const outSheetName = wb.SheetNames.find(s => s.toLowerCase().includes('output') || s.toLowerCase().includes('sawn'));
const inSheetName = wb.SheetNames.find(s => s.toLowerCase().includes('input'));
const monSheetName = wb.SheetNames.find(s => s.toLowerCase() === 'monitoring');

let outData = [];
if (outSheetName) {
    outData = xlsx.utils.sheet_to_json(wb.Sheets[outSheetName], { defval: null });
}

let inData = [];
if (inSheetName) {
    inData = xlsx.utils.sheet_to_json(wb.Sheets[inSheetName], { defval: null });
}

// 1. Keterangan Forensics
const ketFreq = {};
outData.forEach(row => {
    const ket = row['Keterangan'] || row['KETERANGAN'] || row['Ket'];
    if (ket) {
        ketFreq[ket] = (ketFreq[ket] || 0) + 1;
    }
});
console.log("\n--- KETERANGAN FREQUENCIES ---");
console.log(Object.entries(ketFreq).sort((a,b)=>b[1]-a[1]).slice(0, 20));

// 2. Bundel Forensics
const bundles = {};
outData.forEach(row => {
    const bundel = row['BUNDEL'] || row['Bundel'] || row['Bundle'];
    if (bundel) {
        if (!bundles[bundel]) bundles[bundel] = { count: 0, dates: new Set(), inputs: new Set(), products: new Set() };
        bundles[bundel].count++;
        bundles[bundel].dates.add(row['TANGGAL'] || row['Tanggal']);
        bundles[bundel].inputs.add(row['NO. INPUT'] || row['No Input']);
        bundles[bundel].products.add(row['PRODUK'] || row['Produk']);
    }
});
let bundleRepeatsDates = 0;
let bundleMultipleProducts = 0;
let bundleMultipleInputs = 0;
Object.values(bundles).forEach(b => {
    if (b.dates.size > 1) bundleRepeatsDates++;
    if (b.products.size > 1) bundleMultipleProducts++;
    if (b.inputs.size > 1) bundleMultipleInputs++;
});
console.log("\n--- BUNDLE FORENSICS ---");
console.log(`Total Unique Bundles: ${Object.keys(bundles).length}`);
console.log(`Bundles spanning multiple dates: ${bundleRepeatsDates}`);
console.log(`Bundles containing multiple products: ${bundleMultipleProducts}`);
console.log(`Bundles linked to multiple Input Logs: ${bundleMultipleInputs}`);

// 3. Input Consumption Forensics
const inputs = {};
outData.forEach(row => {
    const noInput = row['NO. INPUT'] || row['No Input'];
    if (noInput) {
        if (!inputs[noInput]) inputs[noInput] = { outCount: 0, shifts: new Set(), dates: new Set(), totalM3: 0 };
        inputs[noInput].outCount++;
        inputs[noInput].shifts.add(row['SHIFT'] || row['Shift']);
        inputs[noInput].dates.add(row['TANGGAL'] || row['Tanggal']);
        inputs[noInput].totalM3 += parseFloat(row['M3'] || 0);
    }
});
let inputsSpanningDates = 0;
let inputsSpanningShifts = 0;
Object.entries(inputs).forEach(([no, data]) => {
    if (data.dates.size > 1) inputsSpanningDates++;
    if (data.shifts.size > 1) inputsSpanningShifts++;
});
console.log("\n--- INPUT CONSUMPTION FORENSICS ---");
console.log(`Total Unique Input Logs in Output: ${Object.keys(inputs).length}`);
console.log(`Inputs spanning multiple Dates: ${inputsSpanningDates}`);
console.log(`Inputs spanning multiple Shifts: ${inputsSpanningShifts}`);

// Output sample input to output mapping
console.log("\nSample Input Log Mapping:");
console.log(Object.entries(inputs).slice(0, 3));

