
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "await prisma.`$runCommandRaw\(\{ createIndexes: 'SalesOrder'", "const idxRes = await prisma.`$runCommandRaw({ createIndexes: 'SalesOrder'"
$content = $content -replace "unique: true \}\] \}\);", "unique: true }] }); console.log('idxRes:', idxRes);"

Set-Content $file -Value $content

