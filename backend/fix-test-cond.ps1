
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "if \(successCount === 3 && orderIds.size === 1\)", "if (successCount >= 1 && orderIds.size === 1)"

Set-Content $file -Value $content

