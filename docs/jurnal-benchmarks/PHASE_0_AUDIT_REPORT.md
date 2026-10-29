# PHASE 0: TATALORA ERP ARCHITECTURE & ENVIRONMENT AUDIT REPORT

**Audit Date:** 2026-10-30  
**Target:** TATALORA ERP (Full-Stack Enterprise & SaaS Distribution)  
**Standard Reference Benchmark:** Mekari Jurnal (`my.jurnal.id`)  

---

## 1. System Overview & Technology Stack

| Layer | Technology | Primary Directory |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI, Lucide Icons | `/frontend` |
| **Backend** | NestJS (Modular Architecture, Guards, Interceptors, Pipes) | `/backend` |
| **Database & ORM** | PostgreSQL, Prisma ORM (`schema.prisma` with ~4,000 lines of comprehensive models) | `/backend/prisma` |
| **Authentication & AuthZ** | JWT, Role-Based Access Control (`@Permissions()`), Multi-Tenancy (`company_id`) | `/backend/src/auth` |
| **Architecture Style** | Domain-Driven Service Modules, ACID Database Transactions, FIFO Inventory Layers | `/backend/src/` |

---

## 2. Core Functional Domains & Audit Status

### A. Purchasing (Pengadaan & Pembelian)
* **Backend:** `/backend/src/purchasing` (RFQ, Purchase Order, Goods Receipt / GRN, Vendor Bills, AP Payments).
* **Frontend:** `/frontend/src/app/purchasing` (Orders, Invoices, Receipts, Requests).
* **Audit Finding:**
  * Auto-reception & auto-bill generation integrated with FIFO inventory valuation.
  * Form UI updated to Mekari Jurnal standard with image capture and instant inline master-data creation.

### B. Sales (Penjualan & Piutang Dagang)
* **Backend:** `/backend/src/crm`, `/backend/src/sales` (Customer Quotations, Sales Orders, Deliveries, Invoices, AR Payments).
* **Frontend:** `/frontend/src/app/sales` (Orders, Invoices, Deliveries, Quotations, Customers).
* **Audit Finding:**
  * Sales Order has support for QuickAddCustomer and QuickAddProduct.
  * Need real-time Gross Margin (HPP vs Selling Price) calculation preview in the Sales Order creation UI.

### C. Inventory & Warehouses (Persediaan & Pergudangan)
* **Backend:** `/backend/src/inventory` (Warehouse Stock, FIFO Engine, Stock Movements, Adjustments, Transfers).
* **Database Models:** `Warehouse`, `WarehouseStock`, `StockMovement`, `InventoryCostLayer`, `StockAdjustment`.
* **Audit Finding:**
  * Supports strict FIFO costing layers (`InventoryCostLayer`).
  * Updated to synchronize `purchase_price` (latest HPP) on Product whenever Goods Receipt is confirmed.

### D. General Ledger & Accounting (Buku Besar & Akuntansi)
* **Backend:** `/backend/src/gl`, `/backend/src/finance`, `/backend/src/accounting`.
* **Database Models:** `Account` (COA), `JournalEntry`, `JournalEntryItem`, `Invoice`, `Payment`, `PaymentAllocation`.
* **Financial Invariant:** $\text{Assets} = \text{Liabilities} + \text{Equity}$ with double-entry balanced validations ($\sum \text{Debits} = \sum \text{Credits}$).

---

## 3. Immediate Implementation Priorities
1. **Cataloging & Benchmarking Jurnal.id Workflows:** Map end-to-end data flow (PO -> GRN -> Bill -> Payment -> GL Entry -> P&L/Balance Sheet).
2. **Sales Order Real-Time Margin & Tracking:** Embed instant profit indicator ($P - \text{HPP}$) directly on line items.
3. **Customer & Vendor 360 Financial Profiling:** Ensure real-time AR/AP and transaction histories are directly viewable on customer and supplier detail pages.
