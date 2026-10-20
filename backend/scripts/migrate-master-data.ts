import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING MASTER DATA MIGRATION ---');

  // 1. Migrate Species
  const rawLogSpecies = await prisma.rawLog.findMany({
    where: { speciesId: null, species: { not: '' } },
    select: { species: true },
    distinct: ['species'],
  });
  const trimmedLogSpecies = await prisma.trimmedLog.findMany({
    where: { speciesId: null, species: { not: '' } },
    select: { species: true },
    distinct: ['species'],
  });
  const inputLogSpecies = await prisma.inputLog.findMany({
    where: { speciesId: null, species: { not: '' } },
    select: { species: true },
    distinct: ['species'],
  });
  const variantSpecies = await prisma.timberVariant.findMany({
    where: { speciesId: null, species: { not: '' } },
    select: { species: true },
    distinct: ['species'],
  });

  const allDistinctSpecies = new Set([
    ...rawLogSpecies.map(s => s.species.toUpperCase()),
    ...trimmedLogSpecies.map(s => s.species.toUpperCase()),
    ...inputLogSpecies.map(s => s.species.toUpperCase()),
    ...variantSpecies.map(s => s.species.toUpperCase()),
  ]);

  // Assume companyId is the first company found (adjust logic if multi-tenant)
  const company = await prisma.company.findFirst();
  if (!company) throw new Error('No company found');
  const companyId = company.id;

  for (const s of allDistinctSpecies) {
    if (s === 'ULIN LOKAL') {
      console.log('Skipping ambiguous species: ULIN LOKAL (Manual review required)');
      continue;
    }

    let speciesMaster = await prisma.timberSpecies.findFirst({
      where: { company_id: companyId, code: s }
    });

    if (!speciesMaster) {
      speciesMaster = await prisma.timberSpecies.create({
        data: {
          company_id: companyId,
          code: s,
          name: s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
        }
      });
      console.log(`Created new TimberSpecies: ${s}`);
    }

    // Update records
    const res1 = await prisma.rawLog.updateMany({ where: { speciesId: null, species: s }, data: { speciesId: speciesMaster.id }});
    const res2 = await prisma.trimmedLog.updateMany({ where: { speciesId: null, species: s }, data: { speciesId: speciesMaster.id }});
    const res3 = await prisma.inputLog.updateMany({ where: { speciesId: null, species: s }, data: { speciesId: speciesMaster.id }});
    const res4 = await prisma.timberVariant.updateMany({ where: { speciesId: null, species: s }, data: { speciesId: speciesMaster.id }});

    console.log(`Mapped Species ${s} -> Raw:${res1.count} Trim:${res2.count} Inp:${res3.count} Var:${res4.count}`);
  }

  // 2. Migrate Grades
  const variantGrades = await prisma.timberVariant.findMany({
    where: { gradeId: null, grade: { not: '' } },
    select: { grade: true },
    distinct: ['grade']
  });

  for (const g of variantGrades.map(x => x.grade.toUpperCase())) {
    let gradeMaster = await prisma.timberGrade.findFirst({
      where: { company_id: companyId, code: g }
    });

    if (!gradeMaster) {
      gradeMaster = await prisma.timberGrade.create({
        data: {
          company_id: companyId,
          code: g,
          name: `Grade ${g}`,
        }
      });
      console.log(`Created new TimberGrade: ${g}`);
    }

    const res = await prisma.timberVariant.updateMany({ where: { gradeId: null, grade: g }, data: { gradeId: gradeMaster.id }});
    console.log(`Mapped Grade ${g} -> Var:${res.count}`);
  }

  console.log('--- MIGRATION COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
