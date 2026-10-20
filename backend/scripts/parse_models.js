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

  let pk = 'unknown';
  const idFieldMatch = body.match(/^\s*(\w+)\s+([A-Za-z0-9_]+)(\??)\s+@id/m);
  if (idFieldMatch) {
    pk = idFieldMatch[1] + ':' + idFieldMatch[2];
  } else {
    const cpMatch = body.match(/@@id\(\[([^\]]+)\]\)/);
    if (cpMatch) pk = 'composite:[' + cpMatch[1].replace(/\s+/g, '') + ']';
  }

  let softDelete = 'none';
  const sdMatch = body.match(/^\s*(deleted_at|deletedAt)\s+([A-Za-z0-9_]+)/m);
  if (sdMatch) softDelete = sdMatch[1] + ':' + sdMatch[2];

  let tenant = 'none';
  const tMatch = body.match(/^\s*(company_id|companyId|tenant_id|tenantId)\s+([A-Za-z0-9_]+)/m);
  if (tMatch) tenant = tMatch[1] + ':' + tMatch[2];

  models.push({ modelName, tableName, pk, softDelete, tenant });
}

console.log('Total models parsed:', models.length);
fs.writeFileSync('backend/prisma/models_inventory.json', JSON.stringify(models, null, 2));
