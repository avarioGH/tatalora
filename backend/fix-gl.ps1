
$file = "src/gl/gl.service.ts"
$content = Get-Content $file
$content = "import { PrismaService } from '../prisma/prisma.service';`nimport { Logger } from '@nestjs/common';`n" + ($content -join "`n")
Set-Content $file -Value $content

