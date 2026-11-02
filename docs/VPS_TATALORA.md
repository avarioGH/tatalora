# Data Server & VPS TATALORA Production

Dokumen ini berisi informasi konfigurasi, akses, dan panduan deployment untuk server produksi TATALORA agar terorganisir dan tidak tertukar dengan environment atau server VPS lainnya.

---

## 1. Spesifikasi & Akses Server

| Parameter | Keterangan |
| :--- | :--- |
| **Domain Aplikasi (Frontend)** | `https://app.tatalora.com` |
| **Domain API (Backend)** | `https://api.tatalora.com` |
| **IP Address VPS** | `103.235.75.105` |
| **SSH User** | `danvers` |
| **SSH Password** | `Avario050306` |
| **SSH Key Lokal** | `~/.ssh/tatalora_deploy` |
| **Direktori Proyek di Server**| `~/tatalora` (`/home/danvers/tatalora`) |

---

## 2. Cara Akses SSH

### Menggunakan SSH Key (Direkomendasikan)
```bash
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105
```

### Menggunakan Password
```bash
ssh danvers@103.235.75.105
# Masukkan password: Avario050306
```

---

## 3. Arsitektur Layanan (Docker)

Layanan berjalan menggunakan Docker Compose di dalam direktori `~/tatalora`:
- **Frontend Container**: `tatalora_frontend` (Next.js - port internal `3000`)
- **Backend Container**: `tatalora_backend` (NestJS - port internal `3001` / API)
- **Database**: PostgreSQL Supabase (Managed Cloud)
- **Reverse Proxy**: Nginx / Caddy dengan SSL Let's Encrypt aktif untuk `app.tatalora.com` & `api.tatalora.com`.

---

## 4. Prosedur Deploy / Update Kode Baru

Untuk meng-update aplikasi di VPS ke versi terbaru dari branch `main`:

```bash
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105 "cd ~/tatalora && git pull origin main && docker compose build && docker compose up -d"
```

Jika hanya ingin rebuild frontend atau backend:
```bash
# Rebuild frontend saja
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105 "cd ~/tatalora && git pull origin main && docker compose build frontend && docker compose up -d frontend"

# Rebuild backend saja
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105 "cd ~/tatalora && git pull origin main && docker compose build backend && docker compose up -d backend"
```

---

## 5. Pemeriksaan Status Server & Kontainer

```bash
# Cek kontainer yang sedang berjalan
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105 "docker ps"

# Cek log backend secara realtime
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105 "docker logs -f --tail=100 tatalora_backend"

# Cek log frontend secara realtime
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105 "docker logs -f --tail=100 tatalora_frontend"
```
