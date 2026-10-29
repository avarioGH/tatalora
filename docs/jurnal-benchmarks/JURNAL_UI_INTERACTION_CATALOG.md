# JURNAL.ID UI INTERACTION & BEHAVIOR CATALOG (OBSERVED)

**Audit Target:** Mekari Jurnal (`my.jurnal.id`)  
**Method:** Live Chrome DevTools Protocol (CDP) Interaction  
**Environment:** Live Company (*BOOSTUP INDONESIA*)  
**Audit Date:** 2026-10-30  

---

## 1. Purchase Order Form Controls & Safe Interactions (OBSERVED)

### URL: `https://my.jurnal.id/v3/purchases/new?type=16`
* **Form Action Buttons:**
  * **"Buat"**: Tombol submit utama untuk menyimpan Pesanan Pembelian.
  * **"Buat dan baru"**: Submit dan langsung membuka form baru bersih.
  * **"Batalkan"**: Menutup form dan kembali ke daftar pembelian.
  * **"Tambah kontak"**: Quick-add kontak/supplier baru langsung dari form PO.
  * **"Tambah term"**: Quick-add termin pembayaran baru.
  * **"Tambah produk"**: Quick-add produk baru langsung di baris item.
  * **"Choose file"**: Upload lampiran dokumen pendukung (PDF, gambar faktur/penawaran).

### Validasi Form (OBSERVED):
* Saat tombol **"Buat"** diklik tanpa mengisi supplier:
  * Field `person_display_name` (Supplier) langsung memicu validasi native HTML5 / Form: *"Please fill out this field."*.
  * Transaksi **tidak disubmit ke server** (Client-side validation stop), mencegah pembuatan data sampah.

---

## 2. Purchase Order List Page (OBSERVED)

### URL: `https://my.jurnal.id/v3/purchases/order`
* **Kolom Tabel Data:**
  1. `Tanggal` (Order Date)
  2. `No.` (Nomor Purchase Order, e.g. *Purchase Order #10004*)
  3. `Supplier` (Nama Supplier / Vendor, e.g. *DUDIOHOUSE*)
  4. `Tgl. jatuh tempo` (Due Date)
  5. `Status` (Badge Status: *Belum ditagih*, *Dikirim sebagian*, *Selesai*, *Membutuhkan persetujuan*, *Ditolak*)
  6. `Jumlah DP` (Down Payment Amount)
  7. `Total` (Nilai Total Transaksi PO)
  8. `Tag` (Label pengelompokan transaksi)
* **Tab Navigasi / Filter Status:**
  * *Semua status*
  * *Membutuhkan persetujuan*
  * *Ditolak*
  * *Belum ditagih*
  * *Dikirim sebagian*
  * *Selesai*

---

## 3. Purchase Order Detail Page (OBSERVED)

### Record Teramati: `Purchase Order #10004` (Status: `Belum ditagih`)
* **URL:** `https://my.jurnal.id/v3/purchases/2026714010`
* **Field Ringkasan Finansial:**
  * `Sisa tagihan`: Menampilkan sisa nilai yang belum difakturkan.
  * `Subtotal`: Total nilai produk sebelum pajak/diskon.
  * `Total`: Total nilai akhir pesanan.
* **Tombol Aksi Utama (OBSERVED):**
  * **"Ubah"**: Membuka `/purchase_orders/[id]/edit` untuk mengedit PO yang belum ditagih.
  * **"Hapus"**: Menghapus PO draft/belum ditagih.
  * **"Cetak & bagikan"**:
    * *Lihat template pesanan* (Preview PDF)
    * *Kirim via email*
    * *Dapatkan link pesanan*
  * **"Tindakan" (Dropdown Menu):**
    * *Duplikat transaksi*
    * *Atur transaksi berulang*
    * *Kirim ke Pemenuhan* (Outbound / SCM)
    * *Tutup pesanan* (Close PO secara manual jika tidak ingin dilanjutkan)

---

## 4. Vendor Bill Form (Faktur Pembelian) (OBSERVED)

### URL: `https://my.jurnal.id/v3/purchases/new?type=9`
* Memiliki struktur field yang identik dengan PO namun memiliki tambahan:
  * Field **"Pemotongan"** (Withholding Tax / PPh 23 / PPh pasal lain yang dipotong dari tagihan).
  * Menghasilkan pencatatan hutang dagang (Accounts Payable / AP) langsung pada saat faktur dibuat.
