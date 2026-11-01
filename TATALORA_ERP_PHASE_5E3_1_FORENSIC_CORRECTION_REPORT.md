# TATALORA ERP — PHASE 5E.3.1 FORENSIC CORRECTION REPORT
## FIFO Forensic Correction, Credential Security & Release Blocker Remediation

**Branch:** `feature/purchasing-separation-4a`  
**Execution Mode:** Local Development Forensic Audit & Remediation (Zero Production Mutation)  
**Date:** 2026-11-01  
**Report Type:** Defect Remediation, Security Hardening & Authoritative Balance Realignment  

---

### 1. ROOT CAUSE INVESTIGATION: 20-UNIT / RP 2.000.000 FIFO DISCREPANCY

#### A. Problem Statement
Pada laporan Fase 5E.2 dan 5E.3 sebelumnya tertulis:
- *Stok Awal:* 100 unit (Layer 1: 50 @ 100k, Layer 2: 50 @ 120k = Rp 11.000.000)
- *Pengiriman:* 40 unit (DO 1: 25 unit, DO 2: 15 unit)
- *Retur:* 5 unit dikembalikan pada biaya asli Rp 100.000
- *Saldo Akhir Yang Dilaporkan:* **85 unit / Rp 9.500.000** $\longleftarrow$ *Anomali Matematis*

#### B. Forensic Findings & Code Evidence
Pemeriksaan kode test runner aktual pada [`backend/test/test-phase-5e1-sales-integration.js`](file:///c:/Users/seanb/Downloads/tatalora/backend/test/test-phase-5e1-sales-integration.js#L916-L919) mengungkap:
```javascript
// 5. Reconcile Physical Stock
// 100 initial - 25 (DO1) - 15 (DO2) + 5 (Return) = 65
assert.strictEqual(runner.warehouseStocks.get(`${whId}:${prodId}`).current_stock, 65);
```
- **Kebenaran Eksekusi:** Kode test suite yang sebenarnya dieksekusi **selalu memverifikasi 65 unit**, dan baris penegasan (*assertion*) tersebut **100% lulus (PASSED)**.
- **Akar Masalah (Root Cause):** **Report-only typographical arithmetic transcription error**. Dalam penulisan tabel narasi Markdown laporan 5E.2 dan 5E.3, formula pengiriman 40 unit keliru disalin seolah-olah pengiriman hanya 20 unit ($100 - 20 + 5 = 85$), padahal eksekusi sistem sebenarnya mengeluarkan 40 unit ($100 - 40 + 5 = 65$).
- **Status Implementasi:** Logika FIFO pada `InventoryService` dan `SalesReturnService` terbukti **TIDAK CACAT**. Tidak ada mutasi persediaan ganda ataupun kegagalan pemulihan layer.

#### C. Corrected Authoritative FIFO & GL Reconciliation
```text
Layer 1 Ending: 15 units @ Rp 100.000 = Rp 1.500.000
Layer 2 Ending: 50 units @ Rp 120.000 = Rp 6.000.000
TOTAL ENDING INVENTORY: 65 units = Rp 7.500.000
```
- **Persediaan Fisik & Subledger:** 65 unit = **Rp 7.500.000**
- **Persediaan Barang Jadi GL (Akun `1-1300`):** Saldo Awal Rp 11.000.000 - HPP DO Rp 4.000.000 + Pemulihan HPP Retur Rp 500.000 = **Rp 7.500.000**
- **Variansi:** **Rp 0 (100% Reconciled)**

---

### 2. DATABASE CREDENTIAL SECURITY REMEDIATION

#### A. Remediation pada `docker-compose.yml`
Audit menemukan adanya nilai fallback password hardcoded pada file Compose. Perbaikan pengerasan (*security hardening*) langsung diterapkan:

1. **Penghapusan Default Password Fallback:**
   ```yaml
   # SEBELUM (Rentan):
   POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-AvarioSecurePass2026!}
   DATABASE_URL: ${DATABASE_URL:-postgresql://tatalora_admin:AvarioSecurePass2026!@db:5432/...}
   JWT_SECRET: ${JWT_SECRET:-tatalora_super_secret_jwt_key_2026!}

   # SESUDAH (Aman & Wajib Diekspor dari Environment/Secret Vault):
   POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD environment variable must be set}
   DATABASE_URL: ${DATABASE_URL:?DATABASE_URL environment variable must be set}
   JWT_SECRET: ${JWT_SECRET:?JWT_SECRET environment variable must be set}
   ```
2. **Pencegahan Public Port Exposure:**
   Port PostgreSQL dan Redis kini di-bind secara eksklusif ke antarmuka loopback lokal:
   - `127.0.0.1:5432:5432` (PostgreSQL tidak dapat diakses langsung dari jaringan eksternal/internet).
   - `127.0.0.1:6379:6379` (Redis terlindungi dari akses publik).
3. **Audit Repository & Credential Rotation Recommendation:**
   Karena string password lama pernah tercatat dalam riwayat commit repository publik/tim di masa lalu, disarankan untuk melakukan **Credential Rotation** penuh pada database server VPS sebelum deployment rilis berikutnya.

---

### 3. CONCURRENCY LOCK-ORDER AUDIT

Audit mendalam terhadap seluruh alur transaksi multientitas:

| Operasi Finansial | Urutan Penguncian Baris (`SELECT FOR UPDATE`) | Status Deadlock Risk |
|---|---|---|
| **Alokasi Pembayaran (`applyDeposit`)** | `Invoice` $\rightarrow$ `Payment` | **Bebas Siklus** (Hierarki satu arah) |
| **Alokasi Nota Kredit (`applyCredit`)** | `lockIds = [ccnId, invoiceId].sort()` | **Bebas Deadlock** (Deterministik lexicographical) |
| **Pembatalan Alokasi (`reverseApplication`)** | `lockIds = [ccnId, invoiceId].sort()` | **Bebas Deadlock** (Deterministik lexicographical) |
| **Refund Uang Muka (`refundCustomerAdvance`)** | Kunci eksklusif baris tunggal `Payment` | **Bebas Deadlock** (Sumber tunggal) |
| **Pembatalan Refund Uang Muka** | `CustomerAdvanceRefund` $\rightarrow$ `Payment` | **Bebas Siklus** |
| **Sales Return Approval** | `SalesReturn` $\rightarrow$ `CostLayer` $\rightarrow$ `WarehouseStock` | **Bebas Siklus** |

- **Temuan:** Protokol pengurutan deterministik berbasis `sort()` dan hierarki kunci searah (*unidirectional locking order*) telah konsisten di seluruh service layer, mengeliminasi risiko siklus saling tunggu (*AB vs BA deadlock*).

---

### 4. IDEMPOTENCY & TRANSACTIONAL OUTBOX RISK ASSESSMENT

1. **Mandatory Idempotency Keys:**
   - Parameter `idempotencyKey` telah aktif di seluruh operasi moneter (`CustomerCreditApplication`, `CustomerCreditRefund`, `CustomerAdvanceRefund`).
   - String kosong `""` dan `null` ditangani; permintaan ganda dengan payload sama menghasilkan respon sukses idempotent tanpa menduplikasi jurnal atau kas keluar.
   - Permintaan dengan key sama tetapi nominal/payload berbeda langsung ditolak (`Conflicting payload for identical idempotency key`).
2. **Outbox Risk Evaluation:**
   - Pemancaran event akuntansi in-memory via `EventEmitter2` berjalan stabil karena menyertakan context transaksi `tx`.
   - Namun, tabel `ReverseSyncOutbox` yang telah disiapkan di skema direkomendasikan untuk diaktifkan penuh dengan worker berkala guna menutup celah kegagalan proses Node.js di luar database commit window.

---

### 5. REAL DATABASE BLOCKER & STAGING SETUP GUIDE

Sesuai aturan ketat: *Jangan mensimulasikan PostgreSQL lalu melabelinya sebagai database riil*.

- **Penyebab Blocker Lokal:** Host workstation Windows pengembang tidak memiliki runtime Docker atau service native PostgreSQL yang terpasang (`where docker: not found`, `where postgres: not found`).
- **Instruksi Eksekusi Staging Container Riil (Untuk Staging Release Gate):**
  ```bash
  # 1. Jalankan container PostgreSQL 16 terisolasi
  docker run -d --name tatalora_test_pg -e POSTGRES_USER=tatalora_test -e POSTGRES_PASSWORD=TestSecretPass2026! -e POSTGRES_DB=tatalora_test_db -p 127.0.0.1:5432:5432 postgres:16-alpine

  # 2. Migrasikan skema Prisma ke database uji
  cd backend
  DATABASE_URL="postgresql://tatalora_test:TestSecretPass2026!@127.0.0.1:5432/tatalora_test_db?schema=public" npx prisma db push

  # 3. Eksekusi pengujian multi-koneksi paralel
  node test/test-phase-5e2-production-readiness.js
  ```
- **Klasifikasi Transparan:** Pengujian multi-koneksi soket TCP pada PostgreSQL riil ditandai sebagai **UNEXECUTED ON LOCAL WORKSTATION** dan menjadi **Staging Prerequisite Gate** sebelum produksi.

---

### 6. REGRESSION STATUS ACROSS ALL SUITES

```text
===================================================================================
SUITE                                              TOTAL TESTS   RESULT
===================================================================================
Phase 4D.2: Supplier Credit & AP Reconciliation      15 / 15     PASSED (100%)
Phase 5A.1: Sales Quotation & Safe SO Separation     18 / 18     PASSED (100%)
Phase 5A.2: Delivery Order & FIFO Stock Issue        22 / 22     PASSED (100%)
Phase 5B.2: Delivery-Based Sales Invoicing           26 / 26     PASSED (100%)
Phase 5C.1: Customer Payment & AR Settlement         33 / 33     PASSED (100%)
Phase 5D.1: Sales Return, Credit Note & Refund       38 / 38     PASSED (100%)
Phase 5D.2: Customer Advance Refund                  20 / 20     PASSED (100%)
Phase 5E.1: End-to-End Sales Integration Audit       20 / 20     PASSED (100%)
Phase 5E.2: Concurrency & Negative Tenant Security    8 / 8      PASSED (100%)
Phase 5E.3.1: FIFO Forensic Math Correction Suite     1 / 1      PASSED (100%)
===================================================================================
TOTAL TESTS EXECUTED ACROSS SUITES                  201 / 201    PASSED (100%)
===================================================================================
```

---

### 7. FINAL VERDICT

**VERDICT: CONDITIONAL GO**

- **Justifikasi Kelulusan:**
  1. Anomali FIFO telah terbukti tuntas sebagai kesalahan ketik tipografi pada laporan narasi; kode mesin persediaan dan penegasan matematis diverifikasi 100% akurat pada saldo **65 unit / Rp 7.500.000**.
  2. Kerentanan kredensial default pada `docker-compose.yml` telah dieliminasi dan port diamankan ke antarmuka `127.0.0.1`.
  3. Seluruh 201 skenario pengujian unit, bisnis, rekonsiliasi GL, dan simulasi konkurensi lulus tanpa cacat.
  4. Kondisi bersyarat (*conditional requirement*): Mengingat workstation lokal tidak memiliki Docker/PostgreSQL terpasang, pengujian multi-koneksi TCP paralel wajib divalidasi pada container staging sebelum rilis live ke VPS.
- **Kepatuhan Kebijakan:** Seluruh perubahan kode dan laporan tetap berada di branch lokal `feature/purchasing-separation-4a` tanpa adanya mutasi database produksi atau remote.
