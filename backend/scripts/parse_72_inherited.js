const fs = require('fs');
const list = JSON.parse(fs.readFileSync('backend/prisma/exact_without_direct.json', 'utf8'));

// The 4 explicit global models with no foreign relations:
const globals = ['Permission', 'Tenant', 'SubscriptionPlan', 'ImportSession'];
const inherited = list.filter(m => !globals.includes(m.modelName));
console.log('Inherited models count:', inherited.length);

const results = inherited.map(m => {
  // Parse relation fields
  const parsedRel = m.relations.map(r => {
    const match = r.match(/(\w+)\s+([A-Za-z0-9_]+)\??\s+@relation\((.*)\)/);
    if (!match) return { raw: r };
    const fieldName = match[1];
    const targetModel = match[2];
    const relArgs = match[3];
    const fkMatch = relArgs.match(/fields:\s*\[([^\]]+)\]/);
    const refMatch = relArgs.match(/references:\s*\[([^\]]+)\]/);
    return {
      fieldName,
      targetModel,
      fk: fkMatch ? fkMatch[1].trim() : 'unknown',
      ref: refMatch ? refMatch[1].trim() : 'unknown',
      raw: r
    };
  });
  return {
    modelName: m.modelName,
    tableName: m.tableName,
    relations: parsedRel
  };
});

fs.writeFileSync('backend/prisma/exact_72_inherited.json', JSON.stringify(results, null, 2));
console.log('Saved exact 72 inherited models.');
