const fs = require('fs');
const path = require('path');
const testDbFile = path.resolve(__dirname, '.test-db-url');
const testDbUrl = fs.existsSync(testDbFile)
  ? fs.readFileSync(testDbFile, 'utf-8').trim()
  : process.env.DATABASE_URL;

process.env.DATABASE_URL = testDbUrl;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

async function check() {
  const ca = await prisma.cashAccount.findFirst({
    include: { chart_of_account: true },
  });
  console.log('CASH ACCOUNT DB STATE:');
  console.log('ID:', ca.id);
  console.log('Name:', ca.name);
  console.log('Current Balance:', ca.current_balance);
  console.log('Opening Balance:', ca.opening_balance);
  console.log('Mapped CoA:', ca.chart_of_account ? `${ca.chart_of_account.account_code} - ${ca.chart_of_account.account_name}` : 'UNMAPPED');

  const txs = await prisma.financeTransaction.findMany({
    where: { cash_account_id: ca.id },
  });
  console.log('Finance Transactions count:', txs.length);
  for (const t of txs) {
    console.log(` - [${t.transaction_type}] ${t.transaction_no}: Rp ${t.total_amount} (${t.status}) ref: ${t.reference_type}`);
  }

  const journals = await prisma.journalEntryItem.findMany({
    where: { account_id: ca.chart_of_account_id },
    include: { journal_entry: true },
  });
  console.log('GL Journal Items count:', journals.length);
  for (const j of journals) {
    console.log(` - Journal ${j.journal_entry.journal_no} (${j.journal_entry.status}): Debit ${j.debit} Credit ${j.credit}`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
