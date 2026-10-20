import { PrismaClient } from '@prisma/client';
import { ReportService } from './src/inventory/report.service';

const prisma = new PrismaClient();
const reportService = new ReportService(prisma as any);

async function run() {
  const company = await prisma.company.findFirst();
  if (!company) throw new Error('No company');
  const wh = await prisma.warehouse.findFirst({ where: { company_id: company.id } });
  if (!wh) throw new Error('No warehouse');
  
  const variant = await prisma.timberVariant.findFirst();
  if (!variant) throw new Error('No variant');

  // Create UAT InputLog
  const inputLog = await prisma.inputLog.create({
    data: {
      inputNumber: 'UAT-482-INPUT-1',
      totalVolume: 10,
      totalQty: 1,
      species: 'MERANTI',
      locationId: wh.id
    }
  });

  // Create UAT Outputs
  // Output 1: Grade A (4), Grade B (3)
  await prisma.sawnTimberOutput.create({
    data: {
      bundleNumber: 'UAT-482-OUT-1',
      inputLogId: inputLog.id,
      locationId: wh.id,
      status: 'POSTED',
      items: {
        create: [
          { timberVariantId: variant.id, quantityPcs: 1, thicknessMm: 1, widthMm: 1, lengthMm: 1, volumeM3: 4, grade: 'A' },
          { timberVariantId: variant.id, quantityPcs: 1, thicknessMm: 1, widthMm: 1, lengthMm: 1, volumeM3: 3, grade: 'B' }
        ]
      }
    }
  });

  // Output 2: Grade LKL (1), Grade WASTE (2)
  await prisma.sawnTimberOutput.create({
    data: {
      bundleNumber: 'UAT-482-OUT-2',
      inputLogId: inputLog.id,
      locationId: wh.id,
      status: 'POSTED',
      items: {
        create: [
          { timberVariantId: variant.id, quantityPcs: 1, thicknessMm: 1, widthMm: 1, lengthMm: 1, volumeM3: 1, grade: 'LKL' },
          { timberVariantId: variant.id, quantityPcs: 1, thicknessMm: 1, widthMm: 1, lengthMm: 1, volumeM3: 2, grade: 'WASTE' }
        ]
      }
    }
  });

  const res = await reportService.getYieldReport(company.id, {});
  console.log('Result:', JSON.stringify(res.summary, null, 2));
  console.log('Row count:', res.rows.length);
  const uatRows = res.rows.filter((r: any) => r.inputNumber.startsWith('UAT-482'));
  console.log('UAT Rows:', JSON.stringify(uatRows, null, 2));

  // Cleanup
  await prisma.sawnTimberOutput.deleteMany({ where: { bundleNumber: { startsWith: 'UAT-482' } } });
  await prisma.inputLog.deleteMany({ where: { inputNumber: { startsWith: 'UAT-482' } } });
}
run().catch(console.error).finally(() => prisma.$disconnect());
