const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== PHASE 23 AUDIT EXECUTION ===');
  try {
    let company = await prisma.company.findFirst();
    if (!company) { console.log('No company found.'); return; }
    console.log('Company:', company.id);

    const accounts = await prisma.cashAccount.findMany({ where: { company_id: company.id } });
    console.log('\n--- CASH ACCOUNTS ---');
    console.log(accounts.map(a => a.name + ': ' + a.balance).join('\n'));

    const txs = await prisma.financeTransaction.groupBy({
      by: ['transaction_type'],
      where: { company_id: company.id, status: { notIn: ['CANCELLED', 'Draft'] } },
      _sum: { total_amount: true },
      _count: { id: true }
    });
    console.log('\n--- FINANCE TRANSACTIONS SUMMARY ---');
    console.log(txs);

    const sales = await prisma.salesOrder.aggregate({
      where: { company_id: company.id, status: { notIn: ['CANCELLED'] } },
      _sum: { total_amount: true }
    });
    console.log('\n--- TOTAL SALES (REVENUE) ---', sales._sum.total_amount);

    const purchases = await prisma.timberPurchase.aggregate({
      where: { company_id: company.id, status: { notIn: ['CANCELLED'] } },
      _sum: { total_amount: true }
    });
    console.log('\n--- TOTAL TIMBER PURCHASES ---', purchases._sum.total_amount);

  } catch (error) {
    console.error('Audit Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}
runAudit();
