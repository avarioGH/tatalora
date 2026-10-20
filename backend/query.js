require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const items = await prisma.journalEntryItem.findMany({
    include: { account: { include: { account_type: true } }, journal_entry: true }
  });
  console.log(items.map(i => ({
    acc: i.account.name,
    type: i.account.account_type.name,
    deb: i.debit,
    cred: i.credit
  })));
}
run().finally(() => prisma.$disconnect());
