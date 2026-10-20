const xlsx = require('xlsx');
const wb = xlsx.readFile('C:/Users/Billion/Downloads/13. PROD SWM ULIN AWIE.xlsx');
['Sheet2', 'Sheet3', 'Sheet4'].forEach(sn => {
    console.log(`\n--- ${sn} Headers ---`);
    if(wb.Sheets[sn]) {
        const data = xlsx.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
        console.log(data.slice(0, 3));
    }
});
