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

  const idMatch = body.match(/^\s*(\w+)\s+([A-Za-z0-9_]+)(\??)\s+@id/m);
  let idField = idMatch ? idMatch[1] : 'unknown';
  let idType = idMatch ? idMatch[2] : 'unknown';
  let isUuidDefault = body.includes('@default(uuid())');

  models.push({ modelName, tableName, idField, idType, isUuidDefault });
}

console.log('Total models:', models.length);
const nonStandardId = models.filter(m => m.idField !== 'id' || m.idType !== 'String');
console.log('Non-standard ID models:', nonStandardId);
const withoutUuidDefault = models.filter(m => !m.isUuidDefault);
console.log('Without @default(uuid()):', withoutUuidDefault.length);
