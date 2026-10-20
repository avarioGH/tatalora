param (
    [string]$VpsIp = "",
    [string]$VpsUser = "root"
)

if ($VpsIp -eq "") {
    Write-Host "Error: Harap masukkan IP VPS Anda." -ForegroundColor Red
    Write-Host "Cara penggunaan: .\deploy.ps1 -VpsIp '123.45.67.89' -VpsUser 'root'" -ForegroundColor Yellow
    exit
}

Write-Host "1. Mengompresi file Backend..." -ForegroundColor Cyan
# Kita kecualikan node_modules, dist, dan .git agar upload lebih cepat
Compress-Archive -Path ".\*" -DestinationPath ".\backend-deploy.zip" -Force
Write-Host "File berhasil dikompresi menjadi backend-deploy.zip" -ForegroundColor Green

Write-Host "2. Mengunggah file ke VPS ($VpsUser@$VpsIp)..." -ForegroundColor Cyan
Write-Host "Catatan: Anda mungkin akan diminta memasukkan password VPS." -ForegroundColor Yellow
scp .\backend-deploy.zip ${VpsUser}@${VpsIp}:~/backend-deploy.zip

Write-Host "3. Menjalankan skrip ekstraksi & instalasi di VPS..." -ForegroundColor Cyan
$remoteCommand = @"
    echo 'Mengekstrak file...';
    sudo apt-get update;
    sudo apt-get install unzip -y;
    mkdir -p ~/erp-backend;
    unzip -o ~/backend-deploy.zip -d ~/erp-backend;
    cd ~/erp-backend;
    echo 'Menyalin file .env.production ke .env...';
    cp .env.production .env;
    echo 'Menjalankan Docker Compose...';
    sudo docker compose up -d --build;
    echo 'Deployment Selesai!';
"@

ssh ${VpsUser}@${VpsIp} $remoteCommand

Write-Host "Proses selesai! Aplikasi sedang di-build di VPS Anda." -ForegroundColor Green
Write-Host "Cek status di VPS dengan: ssh ${VpsUser}@${VpsIp} 'cd ~/erp-backend && sudo docker compose logs -f'" -ForegroundColor Magenta
