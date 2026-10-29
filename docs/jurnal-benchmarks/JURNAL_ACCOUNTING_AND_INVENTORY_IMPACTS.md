# JURNAL.ID ACCOUNTING & INVENTORY IMPACTS (VERIFIED LOGIC & INFERENCES)

**Benchmark Target:** Mekari Jurnal (`my.jurnal.id`)  
**Scope:** Siklus Pembelian, Persediaan Barang, Hutang Usaha, dan Jurnal Akuntansi  

---

## 1. Purchase Order (Pesanan Pembelian)
* **Status Teramati:** `Belum ditagih` (Unbilled), `Dikirim sebagian`, `Selesai` (Closed).
* **Efek Inventori (INFERRED):** Tidak menambah stok fisik gudang. Berfungsi murni sebagai komitmen operasional (*Operational Commitment*).
* **Efek Finansial (INFERRED):** Tidak memposting jurnal buku besar (No GL entries posted). Belum diakui sebagai beban maupun hutang usaha.

---

## 2. Goods Receipt / Penerimaan Barang (GRN)
* **Status Teramati di Navigasi:** Tab *Pengiriman* di Pembelian & Modul *Pemenuhan* (`/v3/outbounds`).
* **Efek Inventori (INFERRED):**
  * Kuantitas stok gudang bertambah sebesar barang yang diterima.
  * Layer biaya FIFO terbentuk pada unit cost pembelian. HPP produk diperbarui.
* **Efek Akuntansi (Perpetual Inventory):**
  * **Debit:** Persediaan Barang (Aset Lancar)
  * **Kredit:** Barang Diterima Belum Ditagih (Unbilled Goods Received / Liabilitas Akrual)

---

## 3. Vendor Bill (Faktur Pembelian)
* **Status Teramati:** Menghasilkan nomor transaksi faktur dan status *Menunggu Pembayaran*.
* **Efek Finansial (INFERRED):**
  * **Debit:** Barang Diterima Belum Ditagih (atau Persediaan jika tidak melewati GRN)
  * **Debit:** PPN Masukan (Jika ada PPN)
  * **Kredit:** Hutang Usaha / Accounts Payable (Liabilitas)
  * **Kredit:** Hutang Pajak / PPh Pemotongan (Jika ada field Pemotongan)

---

## 4. Supplier Payment (Pembayaran Pembelian)
* **Efek Finansial (INFERRED):**
  * **Debit:** Hutang Usaha (AP)
  * **Kredit:** Kas / Bank
  * Status faktur berubah menjadi *Lunas* (*Paid*).
