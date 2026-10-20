
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file
$content = $content -replace "import { EventEmitterModule } from '@nestjs/event-emitter';", ""
$content = "import { EventEmitterModule } from '@nestjs/event-emitter';`n" + ($content -join "`n")
Set-Content $file -Value $content

