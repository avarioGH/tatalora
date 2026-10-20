const xlsx = require('xlsx');
const wb = xlsx.readFile('C:/Users/Billion/Downloads/13. PROD SWM ULIN AWIE.xlsx');
const outData = xlsx.utils.sheet_to_json(wb.Sheets['Sheet3'], { defval: null });
const inData = xlsx.utils.sheet_to_json(wb.Sheets['Input Log'], { defval: null });

// 1. Keterangan Forensics
const ketFreq = {};
outData.forEach(row => {
    const ket = row['Keterangan'];
    if (ket) { ketFreq[ket] = (ketFreq[ket] || 0) + 1; }
});
console.log("\n--- KETERANGAN FREQUENCIES ---");
console.log(Object.entries(ketFreq).sort((a,b)=>b[1]-a[1]).slice(0, 10));

// 2. Bundel Forensics
const bundles = {};
outData.forEach(row => {
    const bundel = row['BUNDEL'];
    if (bundel) {
        if (!bundles[bundel]) bundles[bundel] = { count: 0, dates: new Set(), inputs: new Set(), products: new Set() };
        bundles[bundel].count++;
        bundles[bundel].dates.add(row['TANGGAL']);
        bundles[bundel].inputs.add(row['NO. INPUT']);
        bundles[bundel].products.add(row['UKURAN']);
    }
});
let bundleRepeatsDates = 0, bundleMultipleProducts = 0, bundleMultipleInputs = 0;
Object.values(bundles).forEach(b => {
    if (b.dates.size > 1) bundleRepeatsDates++;
    if (b.products.size > 1) bundleMultipleProducts++;
    if (b.inputs.size > 1) bundleMultipleInputs++;
});
console.log("\n--- BUNDLE FORENSICS ---");
console.log(`Total Unique Bundles: ${Object.keys(bundles).length}`);
console.log(`Bundles spanning multiple dates: ${bundleRepeatsDates}`);
console.log(`Bundles containing multiple sizes (UKURAN): ${bundleMultipleProducts}`);
console.log(`Bundles linked to multiple Input Logs: ${bundleMultipleInputs}`);
console.log(`Sample bundle: ${Object.keys(bundles)[0]}`);

// 3. Input Consumption Forensics
const inputs = {};
outData.forEach(row => {
    const noInput = row['NO. INPUT'];
    if (noInput) {
        if (!inputs[noInput]) inputs[noInput] = { outCount: 0, shifts: new Set(), dates: new Set(), bundles: new Set(), outM3: 0 };
        inputs[noInput].outCount++;
        inputs[noInput].shifts.add(row['SHIFT']);
        inputs[noInput].dates.add(row['TANGGAL']);
        inputs[noInput].bundles.add(row['BUNDEL']);
        inputs[noInput].outM3 += (parseFloat(row['M3']) || 0);
    }
});
let inputsSpanningDates = 0, inputsSpanningShifts = 0, inputsMultipleBundles = 0;
Object.values(inputs).forEach(data => {
    if (data.dates.size > 1) inputsSpanningDates++;
    if (data.shifts.size > 1) inputsSpanningShifts++;
    if (data.bundles.size > 1) inputsMultipleBundles++;
});
console.log("\n--- INPUT CONSUMPTION FORENSICS ---");
console.log(`Total Unique Input Logs in Output: ${Object.keys(inputs).length}`);
console.log(`Inputs spanning multiple Dates: ${inputsSpanningDates}`);
console.log(`Inputs spanning multiple Shifts: ${inputsSpanningShifts}`);
console.log(`Inputs producing multiple Bundles: ${inputsMultipleBundles}`);

// Compare Input M3 with Output M3
const inputMap = {};
inData.forEach(row => {
    const no = row['No Input'];
    if (no) inputMap[no] = parseFloat(row['M3']) || 0;
});
let inputsExceedingM3 = 0;
Object.entries(inputs).forEach(([no, data]) => {
    const inM3 = inputMap[no];
    if (inM3 && data.outM3 > inM3) inputsExceedingM3++;
});
console.log(`Inputs where Output M3 > Input M3: ${inputsExceedingM3}`);

// 4. Shift Forensics
const shifts = {};
outData.forEach(row => {
    const shift = row['SHIFT'];
    if (shift) shifts[shift] = (shifts[shift] || 0) + 1;
});
console.log("\n--- SHIFT FORENSICS ---");
console.log(shifts);

// 5. Rendement Forensics (just pulling data to verify formula isn't trivial)
console.log("\n--- RENDEMENT FORENSICS ---");
const monData = xlsx.utils.sheet_to_json(wb.Sheets['Monitoring'], { defval: null });
console.log(monData.slice(0, 3));
