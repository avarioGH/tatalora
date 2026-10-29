# JURNAL.ID FUNCTIONAL WORKFLOW SPECIFICATION & BENCHMARK MAP

**Benchmark Target:** Mekari Jurnal (`my.jurnal.id`)  
**Domain:** Purchasing, Sales, Inventory Valuation, and Financial Double-Entry Accounting  

---

## 1. Purchasing Workflow (Pengadaan & Pembelian)

### Workflow Steps:
1. **Purchase Order (PO) / RFQ:**
   * **Actor:** Purchasing Staff / Manager
   * **Inputs:** Vendor, Warehouse, Order Date, Due Date, Payment Terms, Line Items (Product, Qty, Unit Price, Tax, Discount).
   * **Status Flow:** `DRAFT` $\rightarrow$ `CONFIRMED` (PO Created).
   * **Accounting Impact:** No GL entry posted yet (operational commitment).
2. **Goods Receipt (Penerimaan Barang / GRN):**
   * **Physical Effect:** Warehouse inventory increases by received quantity.
   * **Inventory Layer:** Creates new FIFO cost layer at received unit cost. Product latest HPP is updated.
   * **GL Posting (Perpetual System):**
     * **Debit:** Persediaan Barang (Inventory Asset)
     * **Credit:** Hutang Belum Ditagih (Goods Received Not Invoiced / Unbilled GRN)
3. **Vendor Bill (Faktur Pembelian):**
   * **Inputs:** Match PO items with supplier invoice number.
   * **GL Posting:**
     * **Debit:** Hutang Belum Ditagih (Unbilled GRN)
     * **Debit:** PPN Masukan (VAT In, if applicable)
     * **Credit:** Hutang Usaha (Accounts Payable / AP)
4. **Supplier Payment (Pembayaran Pembelian):**
   * **Inputs:** Cash/Bank account, payment method, date, amount.
   * **GL Posting:**
     * **Debit:** Hutang Usaha (Accounts Payable)
     * **Credit:** Kas / Rekening Bank (Cash / Bank Asset)

---

## 2. Sales Workflow (Penjualan & Pendapatan)

### Workflow Steps:
1. **Sales Order (SO):**
   * **Actor:** Sales Representative / Admin
   * **Inputs:** Customer, Warehouse Origin, Items, Qty, Selling Price, Discount, Tax.
   * **Margin Indicator (Jurnal Standard):** Displays estimated Gross Profit $\text{Margin} = (\text{Selling Price} - \text{HPP}) \times \text{Qty}$.
   * **Status:** `DRAFT` $\rightarrow$ `CONFIRMED`.
2. **Delivery Order (Pengiriman Barang):**
   * **Inventory Effect:** Stock quantity decreases from warehouse. Consumes FIFO layers.
   * **GL Posting (Perpetual Inventory):**
     * **Debit:** Beban Pokok Pendapatan / HPP (Cost of Goods Sold - COGS)
     * **Credit:** Persediaan Barang (Inventory Asset)
3. **Sales Invoice (Faktur Penjualan):**
   * **GL Posting:**
     * **Debit:** Piutang Usaha (Accounts Receivable / AR)
     * **Credit:** Pendapatan Penjualan (Sales Revenue)
     * **Credit:** PPN Keluaran (VAT Out, if applicable)
4. **Customer Payment (Penerimaan Pembayaran):**
   * **GL Posting:**
     * **Debit:** Kas / Rekening Bank (Cash / Bank Asset)
     * **Credit:** Piutang Usaha (Accounts Receivable)

---

## 3. Financial Statements & Executive Reporting (Laporan Keuangan)

1. **Balance Sheet (Neraca):**
   * **Aset Lancar:** Kas & Bank + Piutang Usaha (AR) + Nilai Persediaan Barang (FIFO Inventory Value).
   * **Liabilitas:** Hutang Usaha (AP) + Hutang Pajak.
   * **Ekuitas:** Modal Disetor + Laba Ditahan + Laba Tahun Berjalan.
2. **Profit & Loss (Laba Rugi):**
   * **Pendapatan Bersih (Net Revenue):** Penjualan - Diskon Penjualan.
   * **Beban Pokok Penjualan (HPP / COGS):** Biaya perolehan barang yang terjual.
   * **Laba Kotor (Gross Profit):** Pendapatan Bersih - HPP.
   * **Beban Operasional:** Gaji, Sewa, Utilitas, dll.
   * **Laba Bersih (Net Profit):** Laba Kotor - Beban Operasional.
