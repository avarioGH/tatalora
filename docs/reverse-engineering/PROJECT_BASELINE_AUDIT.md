# TATALORA ERP — PROJECT BASELINE AUDIT
## Phase 0: System Architecture, Existing Modules & Technical Debt Inventory

**Date:** 2026-11-01  
**Target Application:** TATALORA ERP  
**Reference Benchmark:** Kledo (https://app.kledo.com)  
**Branch:** `feature/purchasing-separation-4a`  

---

### 1. Repository & Tech Stack Overview
- **Frontend:** Next.js 16.2.10 (Turbopack, App Router, React 19, Tailwind CSS, Radix UI, Lucide Icons). Total 285 route pages already mapped in `frontend/src/app`.
- **Backend:** NestJS ^11.0.1 (TypeScript, Express platform, `@nestjs/event-emitter`, Passport JWT).
- **ORM & Data Layer:** Prisma ORM 6.0.0 with PostgreSQL datasource provider (`postgresql://...`).
- **Prisma Schema:** 193 models covering Core, Finance, Accounting (GL/COA), Sales, Purchasing, Inventory (FIFO cost layers), Manufacturing (BOM/MRP), Fixed Assets, HR, CRM, POS, and Timber Industry customizations.
- **Authentication & Multi-Tenant:**
  - JWT Bearer Authentication (`JwtAuthGuard`, `@Permissions()`).
  - Company-scoped tenant model (`Company`, `company_id`).
  - Query-level tenant filtering (`where: { company_id }`).

---

### 2. Implementation Status of Existing Modules
1. **Sales & Accounts Receivable (Phases 5A.1–5E.3.1):**
   - **Sales Quotation (`/sales/quotations`):** DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, conversion to SO with GL isolation.
   - **Sales Order (`/sales/orders`):** Order lines, pricing, customer credit exposure policy enforcement (WARNING, BLOCK, OVERRIDE).
   - **Delivery Order (`/sales/deliveries`):** Partial fulfillment, FIFO stock deduction, COGS journal creation.
   - **Sales Invoicing (`/sales/invoices`):** Delivery-based billing (`Invoiced Qty <= Delivered Qty`), AR & Revenue journals.
   - **Customer Payment (`/finance/payments`):** Full/partial payment, multi-invoice allocation, unapplied customer deposits (Uang Muka).
   - **Sales Return & Customer Credit Note (`/sales/returns`, `/sales/credit-notes`):** FIFO cost layer restoration, dedicated `CustomerCreditNote`, credit applications to invoices, and credit note refunds.
   - **Customer Advance Refund (`/finance/payments`):** Dedicated refund of unallocated customer advances via Cash Out and GL liability deduction.
2. **Purchasing & Accounts Payable (Phases 4A–4E):**
   - Purchase Requests, RFQs, Purchase Orders, Goods Receipts (GRN / GRNI clearing), Vendor Bills, Supplier Payments, Purchase Returns, and dedicated Supplier Credit Notes (`SupplierCreditNote`).
3. **Inventory & FIFO Engine:**
   - Multi-warehouse stock tracking, `InventoryCostLayer`, `CostLayerConsumption`, Stock Movements, Transfers, Adjustments, and Stock Opname.
4. **General Ledger & Accounting:**
   - Chart of Accounts, Journal Entries (`JournalEntry`, `JournalEntryItem`), Financial Statements (Balance Sheet, Profit & Loss, Cash Flow), and Cash/Bank accounts.
5. **Fixed Assets & Expenses:**
   - Fixed asset registration, depreciation schedules, expense categorization.
6. **Manufacturing (MRP):**
   - Bill of Materials (BOM), Work Orders, Production planning.
7. **CRM & HR:**
   - Leads, Opportunities, Pipelines, Employee directory, Attendance, Shift management, Payroll.

---

### 3. Baseline Verification & Active Technical Debt
- **Total Test Suites Executed:** 201/201 passing scenarios across Purchasing Phase 4D.2 through Sales Phase 5E.3.1.
- **FIFO Forensic Realignment:** Validated authoritative ending inventory at **65 units / Rp 7.500.000** (report transcription error resolved in 5E.3.1).
- **Credential Security:** Hardcoded passwords removed from `docker-compose.yml`; database ports bound to `127.0.0.1`.
- **Identified Production Blockers:**
  - Local host lacks Docker/PostgreSQL native daemon (`ECONNREFUSED` on 5432). Concurrency tested via deterministic serialization emulation.
  - 110 monetary `Float` fields require planned migration to `@db.Decimal(18, 2)` / `@db.Decimal(18, 4)`.
  - Transactional Outbox pattern (`_reverse_sync_outbox`) drafted in schema but awaits full background worker integration.
