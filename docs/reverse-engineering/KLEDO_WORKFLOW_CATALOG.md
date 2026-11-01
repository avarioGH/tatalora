# KLEDO ERP — WORKFLOW CATALOG & ARCHITECTURAL BLUEPRINT
## Complete Business Process Lifecycles & State Transitions

Berikut adalah katalog rekonstruksi alur kerja (*business workflow catalog*) end-to-end yang dianalisis dari praktik ERP modern Indonesia (Kledo) dan dicocokkan dengan arsitektur TATALORA:

---

### 1. SIKLUS PENJUALAN LENGKAP (ORDER-TO-CASH & RETURN)

```mermaid
flowchart TD
    SQ[Sales Quotation / Penawaran] -->|Konfirmasi Pelanggan| SO[Sales Order / Pesanan Penjualan]
    SO -->|Kirim Barang Bertahap| DO[Delivery Order / Surat Jalan]
    DO -->|Potong Stok & Konsumsi FIFO| StockOut[(Pengurangan Fisik Gudang & FIFO Layer)]
    DO -->|Jurnal HPP| GL_COGS[Dr Beban Pokok Penjualan / Cr Persediaan]
    DO -->|Terbitkan Faktur Penagihan| INV[Sales Invoice / Faktur Penjualan]
    INV -->|Jurnal Piutang| GL_AR[Dr Piutang Usaha / Cr Pendapatan Penjualan & PPN]
    INV -->|Pembayaran Pelanggan| PAY[Customer Payment / Penerimaan Kas]
    PAY -->|Jurnal Pelunasan| GL_PAY[Dr Kas-Bank / Cr Piutang Usaha & Uang Muka]
    
    DO -.->|Jika Barang Cacat / Lebih| SR[Sales Return / Retur Penjualan]
    SR -->|Kembalikan Fisik & Pulihkan Layer| StockIn[(Restorasi Stok & FIFO Original Cost)]
    SR -->|Jurnal Restorasi HPP| GL_SR_COGS[Dr Persediaan / Cr HPP]
    SR -->|Terbitkan Dokumen Finansial| CCN[Customer Credit Note / Nota Kredit]
    CCN -->|Jurnal Pengakuan Retur| GL_CCN[Dr Retur Penjualan / Cr Hutang Retur Pelanggan]
    CCN -->|Opsi A: Alokasi ke Faktur Lain| CCN_APP[Alokasi Kredit: Dr Hutang Retur / Cr Piutang Usaha]
    CCN -->|Opsi B: Pengembalian Uang| CCN_REF[Refund Kas: Dr Hutang Retur / Cr Kas-Bank]
```

#### Aturan Bisnis & Batasan:
- **Pemisahan Pengiriman vs Penagihan:** Delivery Order memotong fisik stok dan mencatat HPP tanpa memicu pengakuan piutang (AR). Faktur Penjualan mengakui AR dan Pendapatan tanpa memotong stok kedua kali.
- **Invarian Faktur:** `Kuantitas Difakturkan <= Kuantitas Terkirim (DONE)`.
- **Restorasi FIFO:** Retur Penjualan melacak `CostLayerConsumption` dari surat jalan asal, memulihkan kuantitas kembali ke biaya perolehan asli (*weighted original cost*), dan menerbitkan dedicated `CustomerCreditNote` (tanpa membuat faktur negatif).

---

### 2. SIKLUS PEMBELIAN LENGKAP (PROCURE-TO-PAY & SUPPLIER RETURN)

```mermaid
flowchart TD
    PR[Purchase Request] --> PO[Purchase Order / Pesanan Pembelian]
    PO -->|Penerimaan Fisik di Gudang| GRN[Goods Receipt / Surat Penerimaan Barang]
    GRN -->|Tambah Stok & Buat FIFO Layer| StockIn[(InventoryCostLayer Baru)]
    GRN -->|Jurnal Penerimaan| GL_GRN[Dr Persediaan Barang / Cr Hutang Belum Difaktur - GRNI]
    GRN -->|Tagihan Vendor Diterima| VB[Vendor Bill / Faktur Pembelian]
    VB -->|3-Way Matching| GL_VB[Dr GRNI & PPN Masukan / Cr Hutang Usaha - AP]
    VB -->|Pembayaran ke Supplier| SPAY[Supplier Payment / Kas Keluar]
    SPAY -->|Jurnal Pelunasan AP| GL_SPAY[Dr Hutang Usaha / Cr Kas-Bank]

    GRN -.->|Retur Barang Rusak ke Vendor| PRET[Purchase Return / Retur Pembelian]
    PRET -->|Kurangi Stok & Layer FIFO| PRET_STOCK[(Pengurangan Stok Gudang)]
    PRET -->|Terbitkan Nota Kredit Supplier| SCN[Supplier Credit Note]
    SCN -->|Opsi A: Potong Tagihan Vendor Lain| SCN_APP[Alokasi AP: Dr Hutang Usaha / Cr Piutang Retur]
    SCN -->|Opsi B: Terima Uang Kembali| SCN_REF[Refund Masuk: Dr Kas-Bank / Cr Piutang Retur]
```

#### Aturan Bisnis & Batasan:
- **Model Akun Kliring GRNI (Goods Receipt Not Invoiced / 2-1150):** Mengisolasi perbedaan waktu antara kedatangan fisik barang di gudang dengan tibanya invoice dari vendor.
- **Pemisahan Nota Kredit:** Supplier Credit Note dicatat sebagai aset lancar (Piutang Retur Pembelian / `1-1420`), sehingga saldo histori pembayaran faktur asal tetap aman dan tidak dirusak.

---

### 3. SIKLUS KAS, BANK & MANAJEMEN UANG MUKA (TREASURY)

```mermaid
flowchart LR
    DEP_IN[Terima Uang Muka Tanpa Faktur] -->|Dr Kas / Cr Uang Muka Penjualan| DEPOSIT_BAL[(Saldo Uang Muka Pelanggan)]
    DEPOSIT_BAL -->|Alokasi ke Faktur Masa Depan| DEP_APPLY[Dr Uang Muka Penjualan / Cr Piutang Usaha]
    DEPOSIT_BAL -->|Pelanggan Batal & Minta Uang Kembali| DEP_REFUND[Dr Uang Muka Penjualan / Cr Kas-Bank]
    
    CASH_A[Rekening Bank BCA] -->|Transfer Dana Internal| CASH_B[Kas Kasir Toko]
    CASH_A -->|Dr Kas Toko / Cr Bank BCA| JNL_TRF[Jurnal Pemindahan Kas]
```

#### Aturan Bisnis & Batasan:
- **Pemisahan Uang Muka vs Nota Kredit:** Pengembalian uang muka murni (*Customer Advance Refund*) mengurangi kewajiban Uang Muka Penjualan (`2-1200`), sedangkan pengembalian nota kredit (*Customer Credit Refund*) mengurangi kewajiban Hutang Retur Pelanggan (`2-1210`). Keduanya tidak boleh saling mencemari.
- **Idempotensi & Concurrency:** Penguncian baris `Payment` (`SELECT FOR UPDATE`) menjamin bahwa alokasi faktur dan pengembalian dana yang terjadi bersamaan tidak menghasilkan saldo deposit negatif.
