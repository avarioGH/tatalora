with open('src/app.module.ts', 'r') as f:
    c = f.read()

if 'ManufacturingModule' not in c:
    c = c.replace("import { Module } from '@nestjs/common';", "import { Module } from '@nestjs/common';\nimport { ManufacturingModule } from './manufacturing/manufacturing.module';")
    c = c.replace("imports: [", "imports: [\n    ManufacturingModule,")

with open('src/app.module.ts', 'w') as f:
    f.write(c)
