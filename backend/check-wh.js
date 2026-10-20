const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const wh = await prisma.warehouse.findFirst({ where: { name: 'Kiln Chamber 03' } });
  if (!wh) { console.log('not found'); return; }
  
  const rawLogs = await prisma.rawLog.count({ where: { locationId: wh.id } });
  const trimLogs = await prisma.trimmedLog.count({ where: { locationId: wh.id } });
  const inputLogs = await prisma.inputLog.count({ where: { locationId: wh.id } });
  const sawnOut = await prisma.sawnTimberOutput.count({ where: { locationId: wh.id } });
  const tx = await prisma.inventoryTransaction.count({ where: { OR: [{warehouse_id: wh.id}, {target_warehouse_id: wh.id}] } });
  const move = await prisma.stockMovement.count({ where: { warehouse_id: wh.id } });
  const pos = await prisma.posShift.count({ where: { warehouse_id: wh.id } });

  console.log({ rawLogs, trimLogs, inputLogs, sawnOut, tx, move, pos });
}
main().finally(() => prisma.$disconnect());
