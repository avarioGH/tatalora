# TATALORA PURCHASING GAP ANALYSIS & IMPLEMENTATION PLAN (PHASE 4)

**Audit Target:** TATALORA ERP Purchasing Lifecycle vs. Mekari Jurnal Reference  
**Author:** Principal ERP Product Architect & Full-Stack Engineer  
**Date:** 2026-10-30  
**Evidence Baseline:** Live Chrome CDP Read-Only Observations (`my.jurnal.id`) & TATALORA Codebase Inspection  

---

## 1. Audit Evidence Classification Matrix

| Finding / Area | Jurnal Reference Status | Description & Evidence Details |
| :--- | :--- | :--- |
| **PO Form Fields** | **OBSERVED** | Supplier, Email, Billing Address, Dates (Tx & Due), Term, Auto Tx No, Vendor Ref No, Warehouse, Tag, Tax-inclusive checkbox, Memo, Message. |
| **PO Client Validation** | **TESTED** | Clicking *"Buat"* without supplier triggers browser validation: *"Please fill out this field."*. Zero payload emitted. |
| **PO List & Statuses** | **OBSERVED** | Table headers: Tanggal, No., Supplier, Tgl jatuh tempo, Status, Jumlah DP, Total, Tag. Statuses: *Belum ditagih*, *Dikirim sebagian*, *Selesai*, *Membutuhkan persetujuan*, *Ditolak*. |
| **PO Detail & Actions** | **OBSERVED** | Record `PO #10004` (DUDIOHOUSE). Available actions: *Ubah*, *Hapus*, *Cetak & bagikan* (Email, PDF template, Link), *Tindakan* (Duplikat, Berulang, Tutup). |
| **Vendor Bill Form** | **OBSERVED** | URL `/v3/purchases/new?type=9`. Fields identical to PO with added *"Pemotongan"* (Withholding Tax PPh). |
| **PO Direct Inventory Posting** | **INFERRED** | PO alone has status *Belum ditagih* and does NOT increase inventory or post GL entries. |
| **Unbilled GRN GL Entry** | **UNVERIFIED** | Whether Jurnal posts a clearing entry (*Goods Received Not Invoiced*) or defers GL posting strictly to Bill creation. |

---

## 2. TATALORA vs. Jurnal Purchasing Gap Matrix

| Feature / Workflow | Jurnal Reference | TATALORA Current State | Gap / Defect Classification | Architecture Files & DB Models | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. PO Creation & Form Controls** | Dropdown with inline quick-add (Supplier, Product, Term), tag picker, tax-inclusive toggle. | Has PO creation form, updated with clean UI, quick-modals, photo upload. | **PARTIAL** | `frontend/src/app/purchasing/orders/create/page.tsx` | Ensure complete field parity (Vendor Ref No, Terms, Tax-inclusive). Keep operational PO separate from instant stock-in by default. |
| **B. PO Document Lifecycle & Numbering** | `Purchase Order #10004`, status *Belum ditagih*, *Dikirim sebagian*, *Selesai*. | Uses `RFQ-[timestamp]` auto-converted to `PO-[timestamp]`. | **PARTIAL** | `backend/src/purchasing/purchasing.service.ts`, `backend/prisma/schema.prisma` (`PurchaseOrder`) | Standardize PO sequence numbering format via `SequenceService` (e.g. `PO-YYYYMM-XXXX`). |
| **C. Goods Receipt (GRN) Separation** | Physical arrival is distinct from ordering. Supports partial receiving. | Backend has `receiveGoods()` with `GoodsReceipt` & `allFullyReceived` check. Supports partial receipt. | **COMPLETE (Backend) / PARTIAL (Frontend UI)** | `backend/src/purchasing/purchasing.service.ts` (`receiveGoods`), `frontend/src/app/purchasing/receipts` | Ensure PO Detail page has an explicit *"Terima Barang (Receive Goods)"* modal allowing custom partial item quantities. |
| **D. Vendor Bill & Invoicing** | Billed independently of PO or converted from PO. Tracks unbilled amounts. | Backend has `createVendorBill()` calculating `billed_qty`, `bill_status: BILLED/PARTIAL`. | **COMPLETE (Backend) / PARTIAL (Frontend UI)** | `backend/src/purchasing/purchasing.service.ts` (`createVendorBill`), `frontend/src/app/purchasing/invoices` | Provide clear conversion action on PO Detail to generate Vendor Bill without auto-forcing it on PO creation. |
| **E. Supplier Payments & AP** | Records partial / full payment, allocates cash/bank account. | Backend has `payVendorBill()` updating invoice `paid_amount`, `remaining_amount`, `PAID/PARTIAL PAID`. | **COMPLETE** | `backend/src/purchasing/purchasing.service.ts` (`payVendorBill`), `backend/prisma/schema.prisma` (`Payment`) | Fully verified in backend transaction. |
| **F. Inventory Valuation & FIFO Layering** | GRN physically enters stock, creates FIFO layer at unit cost, updates product HPP. | `receiveStock()` in `inventory.service.ts` creates FIFO layer, updates `warehouseStock`, and now updates `product.purchase_price`. | **COMPLETE** | `backend/src/inventory/inventory.service.ts` (`receiveStock`, `createFifoLayer`) | FIFO layers and stock movement balances are mathematically consistent. |
| **G. General Ledger Integration** | Balanced double-entry posting on invoice/payment events. | `accounting.listener.ts` listens to `invoice.posted` with idempotency check, posts Debit Persediaan / Kredit Hutang Usaha. | **COMPLETE** | `backend/src/accounting/accounting.listener.ts` (`handleInvoicePosted`) | $\sum \text{Debits} = \sum \text{Credits}$ is enforced in `createJournalEntryWithinTx`. |

---

## 3. Implementation Phasing Strategy

### Phase A: Purchase Order Standard Lifecycle & UI Decoupling (Priority 1)
* **Goal:** Re-align TATALORA Purchasing UI to strictly follow professional ERP standards:
  1. Default behavior of creating a PO is **Operational Commitment** (Status `CONFIRMED` / `OPEN`, receipt status `PENDING`, bill status `PENDING`).
  2. The *"Instant Masuk Stok & Lunas"* toggle remains available only as an explicit optional shortcut for small retail transactions, but the standard workflow is decoupled.
  3. Standard sequential numbering: `PO-YYYY-MM-XXXX`.
* **Deliverables:** Updated `create/page.tsx` and PO detail conversion buttons (*"Terima Barang"*, *"Buat Tagihan"*).

### Phase B: Receiving & Invoicing Modals on PO Detail
* **Goal:** On PO Detail page (`frontend/src/app/purchasing/orders/[id]/page.tsx`), add:
  * Modal **"Terima Barang"** allowing warehouse staff to enter received quantities (supports partial deliveries).
  * Modal **"Buat Faktur Tagihan"** allowing finance to generate Vendor Bill.

### Phase C: Automated Regression & Unit Testing
* **Goal:** Run isolated backend unit & integration tests validating:
  * 1 PO $\rightarrow$ 2 Partial GRNs $\rightarrow$ correct FIFO cost layers.
  * 1 PO $\rightarrow$ Partial Vendor Bill $\rightarrow$ correct Accounts Payable balance.
