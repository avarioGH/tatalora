const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const comp = await prisma.company.findFirst();
    const user = await prisma.user.findFirst({ where: { company_id: comp.id } });
    const wh = await prisma.warehouse.findFirst({ where: { company_id: comp.id } });
    const prod = await prisma.product.findFirst({ where: { company_id: comp.id } });

    console.log('Company:', comp?.id);
    console.log('User:', user?.id);
    console.log('Warehouse:', wh?.id);
    console.log('Product:', prod?.id);

    // Try to execute the EXACT logic of stock-in-tally.service.ts
    await prisma.$transaction(async (tx) => {
        const tally = await tx.stockInTally.create({
            data: {
              company_id: comp.id,
              tally_number: 'TEST/123',
              tally_date: new Date(),
              warehouse_id: wh.id,
              notes: 'test',
              status: 'POSTED',
              items: {
                create: [{
                  product_id: prod.id,
                  qty: 1
                }]
              }
            },
            include: { items: true }
          });
          console.log('Tally created:', tally.id);

          for (const item of tally.items) {
            const mov = await tx.stockMovement.create({
              data: {
                company_id: comp.id,
                warehouse_id: tally.warehouse_id,
                product_id: item.product_id,
                transaction_type: 'IN',
                movement_type: 'IN',
                transaction_id: tally.id,
                qty_in: item.qty,
                created_by: user.id
              }
            });
            console.log('Movement created:', mov.id);
          }
    });
    console.log('Transaction SUCCESS');
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
