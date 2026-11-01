# KLEDO UI & DESIGN PATTERN REFERENCE
## Architecture, Layout & Interaction Specification

**Date:** 2026-11-01  
**Target:** Kledo (`https://app.kledo.com`) vs. TATALORA ERP  
**Auditor:** Senior ERP Product Architect & UI/UX Specialist  

---

## 1. Architectural Philosophy

The objective of functional alignment with Kledo is to achieve **workflow parity** while strictly preserving TATALORA's bespoke design identity:
- **Kledo Design DNA:** Dense, traditional enterprise layout, heavy use of modals, blue accent primary palette, compact tables with right-aligned action kebab menus.
- **TATALORA Design DNA:** Modern Tailwind CSS / shadcn-ui, clean spacing, high contrast badges, accessible dialog modals, full keyboard navigability, and responsive dual sidebar/drawer layouts.

---

## 2. Layout Structure & Navigation Patterns

```
+-----------------------------------------------------------------------------------+
|  [TATALORA LOGO]   [Global Search...]    [Quick Add +]   [Notif]   [User Profile] |
+------------------+----------------------------------------------------------------+
|  Sidebar         |  Breadcrumbs / Entity Status Header                            |
|  - Dashboard     |  [Action Buttons: + Catat Pembayaran | Kirim WA | Cetak PDF]   |
|  - Penjualan     +----------------------------------------------------------------+
|    * Penawaran   |  Main Content Workspace                                        |
|    * Pesanan     |  +-----------------------------------+ +---------------------+ |
|    * Pengiriman  |  | Primary Document Details          | | Side Summary Card   | |
|    * Tagihan     |  | - Customer Info                   | | - Subtotal          | |
|    * Retur       |  | - Line Items Table (Qty, Price)   | | - PPN / Tax (11%)   | |
|  - Pembelian     |  | - Delivery & Terms                | | - Total Due         | |
|  - Kas & Bank    |  +-----------------------------------+ +---------------------+ |
|  - Akuntansi     |  Audit Trail / Activity Log & Communication History            |
+------------------+----------------------------------------------------------------+
```

---

## 3. Interaction & Form Conventions

### A. Number & Currency Formatting
- Standard Indonesian Rupiah formatting (`Rp 1.500.000,00` or `Rp 1.500.000` integer display).
- Right-aligned tabular numeric inputs in data tables.
- Automatic zero-padding and thousand-separator handling in input masks.

### B. Status Badges & Color Semantics
- **Draft:** Neutral gray (`bg-muted text-muted-foreground`).
- **Posted / Confirmed / Approved:** Blue or Indigo (`bg-blue-500/10 text-blue-600`).
- **Partially Paid / Delivered:** Amber (`bg-amber-500/10 text-amber-600`).
- **Fully Paid / Completed:** Emerald Green (`bg-emerald-500/10 text-emerald-600`).
- **Voided / Cancelled / Overdue:** Rose / Red (`bg-rose-500/10 text-rose-600`).

### C. Modal Dialog Standards
- All non-destructive modals have explicit `Batal` (Cancel) and `Simpan` / `Kirim` (Submit) actions.
- Async submit actions show spinning indicator and disable double-clicking.
- Form inputs autofocus on first relevant field upon modal mount.

---

## 4. Communication & Document Sharing Conventions
- **WhatsApp Integration:**
  - Automated message generation pre-formatted with Customer Name, Invoice Number, Total Amount, Due Date, and Bank Account payment instructions.
  - One-click trigger opens `https://wa.me/{phone}?text={encoded_message}` in a new tab without requiring third-party gateway keys for manual dispatch.
- **PDF Generation:**
  - Direct printable HTML/PDF layout with company header, NPWP tax identifiers, terms, and digital stamp/signature placeholder.
