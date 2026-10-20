const fs = require('fs');
const content = fs.readFileSync('backend/prisma/schema.postgresql.prisma', 'utf8');

const modelRegex = /^model\s+(\w+)\s*\{([\s\S]*?)\n\}/gm;
const models = [];
let match;
while ((match = modelRegex.exec(content)) !== null) {
  const modelName = match[1];
  const body = match[2];

  let tableName = modelName;
  const mapMatch = body.match(/@@map\("([^"]+)"\)/);
  if (mapMatch) tableName = mapMatch[1];

  const fields = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      fields.push({ name: parts[0], type: parts[1], raw: trimmed });
    }
  }

  const hasCompanyId = fields.some(f => f.name === 'company_id' || f.name === 'companyId');
  const hasTenantId = fields.some(f => f.name === 'tenant_id' || f.name === 'tenantId');
  const relations = fields.filter(f => f.raw.includes('@relation'));

  models.push({ modelName, tableName, hasCompanyId, hasTenantId, fields: fields.map(f => f.name), relations: relations.map(r => r.raw) });
}

console.log('Total verified models:', models.length);
const withoutDirect = models.filter(m => !m.hasCompanyId && !m.hasTenantId);
console.log('Total without direct ownership:', withoutDirect.length);

fs.writeFileSync('backend/prisma/exact_without_direct.json', JSON.stringify(withoutDirect, null, 2));
