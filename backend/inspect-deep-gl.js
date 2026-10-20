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

async function inspect() {
  const ca = await prisma.cashAccount.findFirst({
    include: { chart_of_account: true },
  });
  console.log('=== CASH ACCOUNT ===');
  console.log('ID:', ca.id);
  console.log('Name:', ca.name);
  console.log('Operational Balance:', ca.current_balance);
  console.log('Opening Balance:', ca.opening_balance);
  console.log('Mapped CoA:', ca.chart_of_account ? `${ca.chart_of_account.account_code} (${ca.chart_of_account.id})` : 'UNMAPPED');

  console.log('\n=== FINANCE TRANSACTIONS ===');
  const txs = await prisma.financeTransaction.findMany({
    where: { cash_account_id: ca.id },
  });
  let sumIn = 0;
  let sumOut = 0;
  for (const t of txs) {
    console.log(`- [${t.transaction_type}] ${t.transaction_no} | Ref: ${t.reference_type} (${t.reference_id}) | Rp ${t.total_amount} | Status: ${t.status}`);
    if (t.transaction_type === 'Cash In') sumIn += t.total_amount;
    if (t.transaction_type === 'Cash Out') sumOut += t.total_amount;
  }
  console.log(`Total Inflows: Rp ${sumIn} | Total Outflows: Rp ${sumOut} | Net: Rp ${sumIn - sumOut}`);

  console.log('\n=== JOURNAL ITEMS FOR CASH COA ===');
  const items = await prisma.journalEntryItem.findMany({
    where: { account_id: ca.chart_of_account_id },
    include: { journal_entry: true },
  });

  let postedDebit = 0;
  let postedCredit = 0;
  let reversedDebit = 0;
  let reversedCredit = 0;

  for (const item of items) {
    const j = item.journal_entry;
    console.log(`- Journal: ${j.journal_no} | Status: ${j.status} | Ref: ${j.reference_type} (${j.reference_id}) | Debit: Rp ${item.debit} | Credit: Rp ${item.credit} | Desc: ${j.description}`);
    if (j.status === 'Posted') {
      postedDebit += item.debit;
      postedCredit += item.credit;
    } else if (j.status === 'Reversed') {
      reversedDebit += item.debit;
      reversedCredit += item.credit;
    }
  }

  console.log('\n--- GL SUMMARIES ---');
  console.log(`Only Posted: Debit Rp ${postedDebit} - Credit Rp ${postedCredit} = Net Rp ${postedDebit - postedCredit}`);
  console.log(`Posted + Reversed: Debit Rp ${postedDebit + reversedDebit} - Credit Rp ${postedCredit + reversedCredit} = Net Rp ${(postedDebit + reversedDebit) - (postedCredit + reversedCredit)}`);

  console.log('\n=== ALL POSTED JOURNALS IN COMPANY ===');
  const allJournals = await prisma.journalEntry.findMany({
    where: { company_id: ca.company_id },
    include: { items: { include: { account: true } } },
  });
  for (const j of allJournals) {
    console.log(`\nJournal ${j.journal_no} [${j.status}] Ref: ${j.reference_type} (${j.reference_id}) - ${j.description}`);
    for (const line of j.items) {
      console.log(`   ${line.account.account_code} (${line.account.account_name}): Dr ${line.debit} | Cr ${line.credit}`);
    }
  }

  await prisma.$disconnect();
}

inspect().catch(console.error);
