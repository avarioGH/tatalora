# JURNAL.ID FUNCTIONAL WORKFLOW SPECIFICATION & BENCHMARK MAP

**Benchmark Target:** Mekari Jurnal (`my.jurnal.id`)  
**Audit Method:** Live Chrome Remote Debugging (Read-Only CDP Session)  
**Session Verified URL:** `https://my.jurnal.id/v3/home` -> `https://my.jurnal.id/v3/purchases/new?type=16`  
**Account Company:** BOOSTUP INDONESIA  
**Audit Date:** 2026-10-30  

---

## 1. Verified Live Module Navigation (OBSERVED)

Dari inspeksi langsung sesi browser aktif di dashboard Jurnal.id (`/v3/home`), modul-modul berikut terkonfirmasi **nyata dan aktif**:

* **Dasbor & Ikhtisar Bisnis:** `/v3/dashboard/business_overview`
* **Penjualan:** `/v3/sales` (Sub: Penagihan Penjualan `/v3/sales/new?type=1`)
* **Pembelian:** `/v3/purchases` (Sub: Faktur Pembelian `/v3/purchases/new?type=9`, Pesanan Pembelian `/purchase_orders/new`, Penawaran `/purchase_quotes/new`, Permintaan `/purchase_requests/new`)
* **Biaya:** `/expenses/new`
* **Kontak:** `/v3/contacts/new` (Pelanggan & Supplier)
* **Produk & Jasa:** `/v3/products/new`
* **Gudang:** `/warehouses/new`
* **Kas & Bank:** `/registers/index`
* **Daftar Akun (COA):** `/accounts/chart_of_accounts`
* **Laporan Keuangan:** `/reports/index`
* **Manajemen Aset:** `/asset_managements`
* **Produksi (SCM):** `/v3/scm/production`
* **Pemenuhan (Outbound):** `/v3/outbounds`

---

## 2. Live Form Field Inspection: Pesanan Pembelian (OBSERVED)

**URL Aktual:** `https://my.jurnal.id/v3/purchases/new?type=16` (Title: *Pesanan Pembelian | Jurnal*)

### A. Header / Informasi Transaksi (OBSERVED)
1. **Supplier** (`id: person_display_name`): Dropdown pencarian supplier (Wajib / `*`).
2. **Email** (`id: input-person_email`): Otomatis terisi dari kontak supplier.
3. **Alamat Penagihan** (`id: person_billing_address`): Textarea alamat faktur supplier.
4. **Tgl. Transaksi** (`id: transaction_date-input`): Format `DD/MM/YYYY`.
5. **Tgl. Jatuh Tempo** (`id: due_date-input`): Format `DD/MM/YYYY`.
6. **Syarat Pembayaran** (`id: term`): Dropdown syarat pembayaran (Net 30, COD, dll).
7. **No Transaksi** (`id: transaction_no`): Auto-numbering placeholder `[Auto]`.
8. **Nomor Referensi Supplier** (`id: vendor_ref_no`): Input teks nomor PO/referensi pihak supplier.
9. **Gudang** (`id: warehouse`): Dropdown pemilihan lokasi gudang masuknya barang.
10. **Tag** (`id: input-tags`): Tagging transaksi multi-kategori.
11. **Harga Termasuk Pajak** (`id: checkbox_tax`): Checkbox toggle perhitungan pajak inklusif / eksklusif.

### B. Tabel Rincian Barang / Line Items (OBSERVED)
Kolom tabel item transaksi:
* **Produk** (`id: select_product`): Autocomplete pencarian nama / kode barang.
* **Deskripsi**: Penjelasan detail barang/jasa.
* **Kuantitas**: Jumlah fisik barang.
* **Unit**: Satuan (Pcs, Box, dll).
* **Harga Satuan**: Nilai harga per unit barang.
* **Pajak**: Dropdown pilihan pajak (misal PPN).
* **Jumlah**: Total baris (`Kuantitas * Harga Satuan - Diskon + Pajak`).

### C. Footer Transaksi (OBSERVED)
* **Pesan** (`id: message`): Pesan khusus untuk supplier di cetakan PO.
* **Memo** (`id: memo`): Catatan internal perusahaan.

---

## 3. Financial & Accounting Workflow (INFERRED & VERIFIED LOGIC)

* **Operational PO:** Status `DRAFT` / `OPEN`. Belum menghasilkan jurnal buku besar umum sampai barang diterima atau faktur dibuat.
* **Goods Receipt (GRN):**
  * Bertambah ke inventori fisik gudang.
  * Update nilai HPP produk dan pencatatan layer FIFO.
* **Vendor Bill & Payment:**
  * Menghasilkan jurnal Hutang Usaha (AP) vs Kas/Bank.
