# Dokumentasi Deployment VPS TATALORA

## 1. Detail Server VPS
- **IP Address**: `103.235.75.105`
- **SSH User**: `danvers`
- **SSH Key**: `~/.ssh/tatalora_deploy`
- **Password**: `Avario050306`
- **Operating System**: Linux Ubuntu (x86_64)
- **Project Directory**: `/home/danvers/tatalora`

---

## 2. Domain & Routing Nginx
| Domain / Subdomain | Target Local Port | Keterangan |
|---|---|---|
| `app.tatalora.com` | `127.0.0.1:3010` (Docker `tatalora_frontend`) | Frontend Next.js Cloud ERP |
| `api.tatalora.com` | `127.0.0.1:5000` (Docker `tatalora_backend`) | Backend NestJS API & Database |
| `admin.tatalora.com` | `127.0.0.1:3010` (Docker `tatalora_frontend`) | Admin Master Portal |
| `adminku.tatalora.com` | `127.0.0.1:3010` (Docker `tatalora_frontend`) | Mirror Admin Portal |

> **Catatan DNS Cloudflare / Registrar**:
> Pastikan record DNS untuk subdomain `admin.tatalora.com` telah ditambahkan:
> - **Type**: `A`
> - **Name**: `admin`
> - **Content / Target**: `103.235.75.105`
> - **Proxy status**: Proxied (atau DNS only)

---

## 3. Akun Admin Portal
- **URL**: `https://admin.tatalora.com/admin` (atau `https://app.tatalora.com/admin` bagi SUPERADMIN)
- **Username**: `developer`
- **Email**: `developer@tatalora.com`
- **Password**: `tatalora2013`
- **Role**: `SUPERADMIN`

---

## 4. Struktur Database & Konfigurasi
- **Database Engine**: PostgreSQL Supabase Pooler (`aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`)
- **Tabel Utama Admin**:
  - `User`: Seluruh user terdaftar di sistem.
  - `Company`: Seluruh tenant dan workspace terdaftar.
  - `Role`: Hak akses sistem (`SUPERADMIN`, `Owner`, `Admin`, `User`).
  - `ConsultationLead`: Data leads masuk dari form website `tatalora.com`.

---

## 5. Perintah Deploy & Update Cepat
```bash
# SSH ke VPS
ssh -i ~/.ssh/tatalora_deploy danvers@103.235.75.105

# Masuk ke direktori projek dan update
cd /home/danvers/tatalora
git pull origin main

# Rebuild dan restart container
docker compose up -d --build
```
