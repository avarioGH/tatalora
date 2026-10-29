# JURNAL.ID UNVERIFIED & REQUIRES APPROVAL ITEMS

**Date:** 2026-10-30  
**Target:** Mekari Jurnal Live Audit  

---

## 1. Unverified Items (Belum Diuji / Memerlukan Tindakan Nyata)

Berikut adalah aspek-aspek yang **belum diobservasi secara aktif** karena membutuhkan eksekusi transaksi yang mengubah database produksi:

1. **Efek Jurnal Buku Besar Otomatis saat PO dikonversi ke Faktur:**
   * Belum diverifikasi apakah akun Anda menggunakan akun perantara *Goods Received Not Invoiced* atau langsung membebankan ke *Persediaan Barang*.
2. **Posting Pembayaran Nyata & Potongan Retur Pembelian:**
   * Belum diverifikasi alur pembuatan Nota Debit / Retur Pembelian (`Purchase Return`) dan alokasi kreditnya ke faktur yang masih terbuka.
3. **Penyimpanan Transaksi PO Baru:**
   * Belum membuat PO sintetis untuk melihat apakah PO yang disimpan memicu notifikasi email atau webhook eksternal.

---

## 2. Tindakan yang Memerlukan Persetujuan Pengguna (Jika Ingin Diuji):
* **Action:** Membuat 1 transaksi uji coba sintetis (Dummy Purchase Order) dengan nama `[TEST-AUDIT] Produk Uji Coba` dan supplier uji coba `[TEST-AUDIT] Supplier Uji Coba`.
* **Dampak:** Akan menambah 1 baris di daftar PO dengan status `Belum ditagih`. Transaksi ini kemudian dapat dihapus kembali (*Delete*) menggunakan tombol "Hapus" yang sudah terbukti ada.
* **Tujuan:** Mengamati form respon sukses, auto-numbering PO asli dari server Jurnal, dan tombol konversi faktur.
