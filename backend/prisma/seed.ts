import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Default Company
  let company = await prisma.company.findFirst({ where: { name: 'Avario Coffee Co.' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Avario Coffee Co.',
        address: 'Jl. Jenderal Sudirman No. 1, Jakarta',
        phone: '021-555-0199',
        email: 'contact@avario.com',
        tax_number: '01.234.567.8-999.000',
      },
    });
  }

  // 2. Create Owner User
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const ownerRole = await prisma.role.upsert({
    where: { company_id_name: { company_id: company.id, name: 'Owner' } },
    update: {},
    create: {
      company_id: company.id,
      name: 'Owner',
    }
  });

  let permAll = await prisma.permission.findUnique({ where: { name: '*' } });
  if (!permAll) {
    permAll = await prisma.permission.create({ data: { name: '*', description: 'Super Admin Access' } });
  }
  
  await prisma.rolePermission.upsert({
    where: { role_id_permission_id: { role_id: ownerRole.id, permission_id: permAll.id } },
    update: {},
    create: { role_id: ownerRole.id, permission_id: permAll.id }
  });

  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      company_id: company.id,
      email: 'owner@avario.com',
      username: 'owner',
      password: hashedPassword,
      name: 'Avario Owner',
      role_id: ownerRole.id,
      status: true,
    },
  });

  // 3. Create Warehouses
  const whA = await prisma.warehouse.upsert({
    where: { company_id_code: { company_id: company.id, code: 'WH-A' } },
    update: {},
    create: {
      company_id: company.id,
      name: 'Gudang Pusat (A)',
      code: 'WH-A',
      address: 'Kawasan Industri Pulogadung',
    }
  });

  const whB = await prisma.warehouse.upsert({
    where: { company_id_code: { company_id: company.id, code: 'WH-B' } },
    update: {},
    create: {
      company_id: company.id,
      name: 'Gudang Cabang (B)',
      code: 'WH-B',
      address: 'Bandung Raya',
    }
  });

  const whC = await prisma.warehouse.upsert({
    where: { company_id_code: { company_id: company.id, code: 'WH-C' } },
    update: {},
    create: {
      company_id: company.id,
      name: 'Gudang Retail (C)',
      code: 'WH-C',
      address: 'Mall Kelapa Gading',
    }
  });

  // 4. Create Category & Unit
  let catCoffee = await prisma.category.findFirst({ where: { company_id: company.id, name: 'Biji Kopi' } });
  if (!catCoffee) {
    catCoffee = await prisma.category.create({ data: { company_id: company.id, name: 'Biji Kopi' } });
  }

  let unitPcs = await prisma.unit.findFirst({ where: { company_id: company.id, name: 'Pcs' } });
  if (!unitPcs) {
    unitPcs = await prisma.unit.create({ data: { company_id: company.id, name: 'Pcs' } });
  }

  // 5. Create Products & Stocks
  // (Dummy products removed so database starts clean)

  let assetType = await prisma.accountType.findFirst({
    where: { company_id: company.id, code: 'ASSET' },
  });
  if (!assetType) {
    assetType = await prisma.accountType.create({
      data: {
        company_id: company.id,
        code: 'ASSET',
        name: 'Aset Lancar',
        normal_balance: 'Debit',
      },
    });
  }

  let revenueType = await prisma.accountType.findFirst({
    where: { company_id: company.id, code: 'REVENUE' },
  });
  if (!revenueType) {
    revenueType = await prisma.accountType.create({
      data: {
        company_id: company.id,
        code: 'REVENUE',
        name: 'Pendapatan Usaha',
        normal_balance: 'Credit',
      },
    });
  }

  let liabilityType = await prisma.accountType.findFirst({
    where: { company_id: company.id, code: 'LIABILITY' },
  });
  if (!liabilityType) {
    liabilityType = await prisma.accountType.create({
      data: {
        company_id: company.id,
        code: 'LIABILITY',
        name: 'Kewajiban Jangka Pendek',
        normal_balance: 'Credit',
      },
    });
  }

  let coaKasUtama = await prisma.chartOfAccount.findFirst({
    where: { company_id: company.id, account_code: '1-1001' },
  });
  if (!coaKasUtama) {
    coaKasUtama = await prisma.chartOfAccount.create({
      data: {
        company_id: company.id,
        account_code: '1-1001',
        account_name: 'Kas Utama (BCA)',
        account_type_id: assetType.id,
      },
    });
  }

  // Ensure 4-1000 Pendapatan Penjualan exists with correct REVENUE AccountType
  let coaRevenue = await prisma.chartOfAccount.findFirst({
    where: { company_id: company.id, account_code: '4-1000' },
  });
  if (!coaRevenue) {
    coaRevenue = await prisma.chartOfAccount.create({
      data: {
        company_id: company.id,
        account_code: '4-1000',
        account_name: 'Pendapatan Penjualan',
        account_type_id: revenueType.id,
      },
    });
  } else if (coaRevenue.account_type_id !== revenueType.id) {
    await prisma.chartOfAccount.update({
      where: { id: coaRevenue.id },
      data: { account_type_id: revenueType.id },
    });
  }

  // Create Cash Account
  let cashAccount = await prisma.cashAccount.findFirst({ where: { company_id: company.id, code: '111-001' } });
  if (!cashAccount) {
    cashAccount = await prisma.cashAccount.create({
      data: {
        company_id: company.id,
        code: '111-001',
        name: 'Kas Utama (BCA)',
        account_type: 'Bank',
        chart_of_account_id: coaKasUtama.id,
        current_balance: 0,
      }
    });
  } else if (!cashAccount.chart_of_account_id) {
    await prisma.cashAccount.update({
      where: { id: cashAccount.id },
      data: { chart_of_account_id: coaKasUtama.id },
    });
  }

  // 7. Create Finance Categories
  const categoriesData = [
    { name: 'Pendapatan Penjualan', type: 'Income', color: '#10B981', icon: 'ShoppingCart' },
    { name: 'Pendapatan Lainnya', type: 'Income', color: '#3B82F6', icon: 'TrendingUp' },
    { name: 'Biaya Gaji Karyawan', type: 'Expense', color: '#EF4444', icon: 'Users' },
    { name: 'Biaya Operasional (Listrik, Air, Internet)', type: 'Expense', color: '#F59E0B', icon: 'Zap' },
    { name: 'Biaya Marketing', type: 'Expense', color: '#8B5CF6', icon: 'Megaphone' },
    { name: 'Pajak & Retribusi', type: 'Expense', color: '#6366F1', icon: 'FileText' },
    { name: 'Transfer Kas/Bank', type: 'Transfer', color: '#6B7280', icon: 'Repeat' }
  ];

  for (const cat of categoriesData) {
    const exists = await prisma.financeCategory.findFirst({ where: { company_id: company.id, name: cat.name }});
    if (!exists) {
      await prisma.financeCategory.create({
        data: {
          company_id: company.id,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
        }
      });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

