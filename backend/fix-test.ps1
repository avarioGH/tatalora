
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "promises\.push\(checkoutService\.checkout\(c1, sid, payload\)\);", "promises.push(checkoutService.checkout(c1, sid, payload).catch(e => { throw e; }));"

Set-Content $file -Value $content

