
$file = "src/integrations/providers/payment/tripay/tripay.service.ts"
$content = Get-Content $file

$content = $content -replace "\/\/ data\.\.\.`n        \}\);", "// data... `n        // });"
$content = $content -replace "\/\/ data md\.\.\.`n      \}\);", "// data md... `n      // });"

Set-Content $file -Value $content

