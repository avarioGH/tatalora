
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "await prisma.`$runCommandRaw\(\{ create: 'SalesOrder' \}\);", "await prisma.`$runCommandRaw({ create: 'SalesOrder' }); await prisma.`$runCommandRaw({ createIndexes: 'SalesOrder', indexes: [{ key: { company_id: 1, ecommerce_session_id: 1 }, name: 'unique_session', unique: true }] });"

Set-Content $file -Value $content

