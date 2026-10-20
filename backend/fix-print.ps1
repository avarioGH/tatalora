
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "if \(successCount === 3 && orderIds.size === 1\) \{", "console.log('successCount:', successCount, 'orderIds:', Array.from(orderIds)); if (successCount === 3 && orderIds.size === 1) {"
$content = $content -replace "if \(cSuccess === 3 && cFail === 1\) \{", "console.log('cSuccess:', cSuccess, 'cFail:', cFail); if (cSuccess === 3 && cFail === 1) {"

Set-Content $file -Value $content

