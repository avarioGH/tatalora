import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================");
  console.log("   MASS EXCEL IMPORTER (ERP BOOSTUP)     ");
  console.log("==========================================");
  
  // Ambil company Boostup Kayu
  let company = await prisma.company.findFirst({ where: { name: { contains: 'kayu', mode: 'insensitive' } } }); if (!company) { company = await prisma.company.findFirst(); }
  
  if (!company) {
    console.error("Company Kayu tidak ditemukan!");
    return;
  }
  const companyId = company.id;

  // Dapatkan Warehouse default (bukan Location)
  let warehouse = await prisma.warehouse.findFirst({ where: { company_id: companyId } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: { company_id: companyId, code: 'WH-KAYU', name: 'Gudang Kayu Utama' }
    });
  }

  let importedLogs = 0;
  
  // Mencari file excel2.xlsx
  const possiblePaths = ['../historical-data/excel2.xlsx', 'historical-data/excel2.xlsx', '../../historical-data/excel2.xlsx'];
  let targetFile = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(path.resolve(__dirname, p))) {
      targetFile = path.resolve(__dirname, p);
      break;
    }
  }

  if (!targetFile) {
    console.error("Error: File 'excel2.xlsx' tidak ditemukan! Pastikan file berada di folder historical-data.");
    return;
  }

  console.log(`Membaca file: ${targetFile}...`);
  try {
    const wb = xlsx.readFile(targetFile);
    
    // 1. PARSING DUKB (RAW LOGS)
    const dukbSheet = wb.Sheets['DUKB'];
    if (dukbSheet) {
      console.log("Parsing Sheet 'DUKB' (Log Datang)...");
      const rows: any[] = xlsx.utils.sheet_to_json(dukbSheet, { header: 1 });
      
      for (let i = 5; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 5) continue;
        
        const logNo = row[1]; // No Log
        const species = row[3]; // Species
        const length = parseFloat(row[5]) || 0;
        const diameter = parseFloat(row[10]) || parseFloat(row[11]) || 0;
        const volume = parseFloat(row[16]) || parseFloat(row[12]) || 0; 
        
        if (logNo && species && length > 0) {
          const logNumberStr = logNo.toString().trim();
          
          const exist = await prisma.rawLog.findFirst({
            where: { logNumber: logNumberStr }
          });
          
          if (!exist) {
            await prisma.rawLog.create({
              data: {
                logNumber: logNumberStr,
                species: species.toString(),
                batch: "Batch Excel",
                originalLength: length,
                diameter1: diameter,
                diameter2: diameter,
                diameter3: diameter,
                diameter4: diameter,
                averageDiameter: diameter,
                roundedDiameter: diameter,
                grossVolume: volume,
                netVolume: volume,
                status: 'AVAILABLE', barcode: 'RAW-' + logNumberStr,
                locationId: warehouse.id
              }
            });
            importedLogs++;
          }
        }
      }
    }

    console.log(`==========================================`);
    console.log(`SUKSES: Berhasil mengimpor ${importedLogs} Raw Logs dari Excel!`);
    console.log(`==========================================`);
  } catch (error) {
    console.error("Gagal memproses Excel:", error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());



