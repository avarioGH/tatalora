import json

with open('package.json', 'r') as f:
    pkg = json.load(f)

pkg['scripts']['verify:erp'] = "npx prisma validate && npx prisma generate && npx tsc --noEmit && npx ts-node -T test/verify.erp.ts"

with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)

