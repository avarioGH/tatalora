import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const company = await prisma.company.findFirst();
  if (!company) { console.error('No company found.'); process.exit(1); }
  const chambers = [
    { name: 'Kiln Chamber 01', code: 'CH-01', address: 'Area Oven A' },
    { name: 'Kiln Chamber 02', code: 'CH-02', address: 'Area Oven A' },
    { name: 'Kiln Chamber 03', code: 'CH-03', address: 'Area Oven B' }
  ];
  for (const ch of chambers) {
    const existing = await prisma.warehouse.findFirst({ where: { company_id: company.id, code: ch.code } });
    if (!existing) {
      await prisma.warehouse.create({ data: { company_id: company.id, name: ch.name, code: ch.code, address: ch.address } });
      console.log('Created ' + ch.code);
    } else {
      console.log(ch.code + ' already exists.');
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
