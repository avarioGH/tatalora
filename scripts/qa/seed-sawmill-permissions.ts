/**
 * seed-sawmill-permissions.ts
 * Run: npx ts-node scripts/qa/seed-sawmill-permissions.ts
 * Registers the 5 production.sawmill.* permissions in MongoDB
 * and grants them to any existing "Admin" or "Owner" roles.
 * Safe to run multiple times (idempotent).
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SAWMILL_PERMISSIONS = [
  { name: "production.sawmill.view",   description: "View Sawmill Production Runs" },
  { name: "production.sawmill.create", description: "Create Sawmill Production Drafts" },
  { name: "production.sawmill.edit",   description: "Edit Sawmill Production Drafts" },
  { name: "production.sawmill.post",   description: "Post Sawmill Production to Ledger" },
  { name: "production.sawmill.cancel", description: "Cancel/Reverse a Posted Sawmill Production" },
];

async function main() {
  console.log("Seeding Sawmill Production permissions...");
  const perms: any[] = [];
  for (const p of SAWMILL_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where:  { name: p.name },
      update: { description: p.description },
      create: { name: p.name, description: p.description },
    });
    perms.push(perm);
    console.log("  [OK] " + perm.name);
  }

  // Grant to Owner and Admin roles (all companies)
  const adminRoles = await prisma.role.findMany({ where: { name: { in: ["Owner", "Admin", "Superadmin", "FULL_ADMIN"] } } });
  console.log("  Granting to " + adminRoles.length + " admin role(s)...");
  for (const role of adminRoles) {
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where:  { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
        update: {},
        create: { role_id: role.id, permission_id: perm.id },
      });
    }
    console.log("  [OK] " + role.name + " (company: " + (role.company_id || "global") + ")");
  }
  console.log("Done. Run the connected UAT script next.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
