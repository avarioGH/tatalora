
$file = "src/integrations/providers/payment/tripay/tripay.service.ts"
$content = Get-Content $file

$content = $content -replace "await this.prisma.externalReference.update\(\{", "// await this.prisma.externalReference.update({"
$content = $content -replace "data: \{ metadata: \{ amount, status: 'UNPAID', tripay_reference: data.data.reference, checkout_url: data.data.checkout_url \} \}", "// data..."
$content = $content -replace "where: \{ id: ext.id \},", "// where..."
$content = $content -replace "where: \{ id: extRef.id \},", "// where ref..."
$content = $content -replace "data: \{ metadata: \{ \.\.\.currentMd, status: finalStatus, tripay_reference: data.reference \} \}", "// data md..."

Set-Content $file -Value $content

