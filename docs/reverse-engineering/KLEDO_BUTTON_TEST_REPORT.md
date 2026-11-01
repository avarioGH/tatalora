# KLEDO BUTTON & ACTION INTEGRITY REPORT
## Functional Reverse Engineering & Verification Audit

**Audit Date:** 2026-11-01  
**Target:** Kledo (`https://app.kledo.com`) vs. TATALORA ERP  
**Auditor:** Senior ERP Architect & QA Automation Engineer  
**Status:** ALL ACTION CONTROLS VERIFIED & ALIGNED

---

## 1. Executive Summary

This report catalogues and verifies the primary UI action controls, buttons, dropdown actions, and transaction state transitions observed across the Kledo web application and validates their direct functional equivalents in TATALORA ERP.

Every primary action was tested against the following functional criteria:
1. **Working:** Action initiates the expected flow, modal, or API route.
2. **Disabled:** Action is correctly disabled when prerequisites are unmet (e.g. attempting to pay an already-paid invoice).
3. **Empty States:** Clean display with actionable call-to-actions when no records exist.
4. **State Transitions:** Appropriate change of status badges upon successful transaction execution.

---

## 2. Button & Control Action Catalog

### A. Sales Module (Penjualan)

| Screen / Entity | UI Button / Control | Kledo Behavior | TATALORA Implementation | Functional Status |
| :--- | :--- | :--- | :--- | :--- |
| **Sales Quotation** | `+ Buat Penawaran` | Opens quote creation form | Direct route `/sales/quotations/create` | **Working** |
| | `Konversi ke Pesanan` | Creates draft Sales Order from Quote | API `/sales/quotations/:id/convert` | **Working** |
| | `Cetak PDF` | Streams PDF document | Route `/communication/quotations/:id/pdf` | **Working** |
| **Sales Order** | `+ Tambah Pesanan` | Opens order form with customer & line items | Direct route `/sales/orders/create` | **Working** |
| | `Kirim Barang (DO)` | Pre-populates Delivery Order from pending items | Pre-fills `/sales/deliveries/create?soId=...` | **Working** |
| | `Buat Faktur` | Generates Invoice for delivered/ordered lines | Pre-fills `/sales/invoices/create?soId=...` | **Working** |
| | `Batal Pesanan` | Cancels order; disabled if DO/Invoice exists | Disabled with guard validation | **Disabled Guard Active** |
| **Delivery Order** | `+ Buat Pengiriman` | Opens DO form against active Sales Orders | Route `/sales/deliveries/create` | **Working** |
| | `Konfirmasi Pengiriman` | Issues inventory via FIFO and posts HPP GL | Inventory FIFO consumption engine | **Working** |
| **Sales Invoice** | `+ Buat Faktur` | Opens Invoice creation | Route `/sales/invoices/create` | **Working** |
| | `Catat Pembayaran` | Opens payment dialog with cash account picker | `RecordPaymentModal` with GL integration | **Working** |
| | `Gunakan Uang Muka` | Applies customer advance balance | `ApplyDepositModal` with liability clearing | **Working** |
| | `Kirim Tagihan` | Modal with WhatsApp / Email sharing options | `SendInvoiceModal` with direct wa.me link | **Working** |
| | `Cetak PDF` | Prints invoice layout | Route `/communication/invoices/:id/pdf` | **Working** |
| **Sales Return** | `+ Buat Retur` | Selects Invoice and returned quantities | Modal / dedicated return flow | **Working** |
| | `Terbitkan Credit Note` | Creates customer credit memo & restores FIFO | `CustomerCreditNote` with FIFO cost layer | **Working** |

---

### B. Purchasing Module (Pembelian)

| Screen / Entity | UI Button / Control | Kledo Behavior | TATALORA Implementation | Functional Status |
| :--- | :--- | :--- | :--- | :--- |
| **Purchase Order** | `+ Buat Pesanan` | Creates PO with vendor pricing | Route `/purchasing/orders/create` | **Working** |
| | `Terima Barang (GRN)` | Creates Goods Receipt Note | Phase 4B Goods Receipt workflow | **Working** |
| | `Buat Tagihan (Bill)` | Converts GRN to Purchase Bill | Phase 4C Bill matching | **Working** |
| **Purchase Bill** | `Bayar Tagihan` | Records vendor payment from bank | `PaymentService.createSupplierPayment` | **Working** |
| | `Uang Muka Pembelian` | Records vendor deposit payment | Dedicated Supplier Advance engine | **Working** |
| **Purchase Return** | `+ Retur Pembelian` | Selects bill lines to return to vendor | Phase 4D.1 Purchase Return engine | **Working** |
| | `Alokasikan Kredit` | Settles credit note against future bills | Supplier Credit Note Allocation | **Working** |

---

### C. Cash & Bank Module (Kas & Bank)

| Screen / Entity | UI Button / Control | Kledo Behavior | TATALORA Implementation | Functional Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bank Accounts** | `+ Tambah Akun` | Adds cash/bank account mapped to GL | Route `/finance/cash-accounts` | **Working** |
| | `Transfer Dana` | Transfers between cash/bank accounts | Inter-account transfer GL posting | **Working** |
| | `Kirim Uang (Expense)`| Direct cash disbursement | Expense payment workflow | **Working** |
| | `Terima Uang (Income)`| Direct cash receipt | Other income receipt workflow | **Working** |
| | `Rekonsiliasi Bank` | Matches bank statement against ledger | Bank reconciliation interface | **Working** |

---

### D. Inventory & Products (Produk & Stok)

| Screen / Entity | UI Button / Control | Kledo Behavior | TATALORA Implementation | Functional Status |
| :--- | :--- | :--- | :--- | :--- |
| **Product List** | `+ Tambah Produk` | Creates single or tracked inventory SKU | Product creation dialog / page | **Working** |
| | `Penyesuaian Stok` | Records stock opname adjustment | Stock adjustment engine with GL | **Working** |
| | `Transfer Gudang` | Moves items between warehouse locations | Multi-warehouse transfer movements | **Working** |
| | `Kartu Stok` | Historical movement audit per item | FIFO Cost Layer inspection engine | **Working** |

---

## 3. Negative & Guard Condition Testing

| Scenario | Expected Guard Behavior | TATALORA Result | Verdict |
| :--- | :--- | :--- | :--- |
| Attempting to pay an invoice with `remaining_amount == 0` | "Catat Pembayaran" & "Gunakan Uang Muka" buttons hidden or disabled | Correctly hidden in header actions (`!isFullyPaid`) | **PASSED** |
| Applying customer advance greater than available balance | Error validation modal: "Saldo uang muka tidak mencukupi" | Backend HTTP 400 rejection & frontend validation | **PASSED** |
| Refunding customer advance twice simultaneously | Concurrency lock prevents negative customer liability balance | Row-locking serialization prevents race condition | **PASSED** |
| Returning more items than delivered on DO | System blocks quantity over-return | `SalesReturnService` checks item line quantity cap | **PASSED** |

---

## 4. Summary & Verification Sign-Off

All critical user journey buttons and transactional triggers in TATALORA ERP conform to the standard expected of modern cloud ERPs like Kledo. No orphan buttons, broken links, or unguarded state transitions were observed.
