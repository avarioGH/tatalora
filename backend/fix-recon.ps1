
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "const recon =", "console.log('extRef:', extRef); const recon ="
$content = $content -replace "if \(recon\.success\) \{", "console.log('recon:', recon); if (recon.success) {"

Set-Content $file -Value $content

