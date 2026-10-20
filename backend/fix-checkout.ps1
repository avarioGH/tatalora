
$file = "src/ecommerce/ecommerce-checkout.service.ts"
$content = Get-Content $file

$content = $content -replace "const salesOrder = await this.prisma.salesOrder.create", "let salesOrder; try { salesOrder = await this.prisma.salesOrder.create"
$content = $content -replace "\}\)\;", "}); } catch(e: any) { if (e.code === 'P2002') { await new Promise(r => setTimeout(r, 500)); return this.checkout(companyId, sessionId, payload); } throw e; }"

Set-Content $file -Value $content

