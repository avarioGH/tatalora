
$file = "prisma/schema.prisma"
$content = Get-Content $file

$content = $content -replace "@@unique\(\[company_id, order_number\]\)", "@@unique([company_id, order_number])`n  @@unique([company_id, ecommerce_session_id])"

Set-Content $file -Value $content

