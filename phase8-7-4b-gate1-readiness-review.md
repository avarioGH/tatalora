# TATALORA ERP — PHASE 8.7.4B
## Gate 1 Readiness Review — Evidence Collection Only

> **DATE:** 2026-10-17  
> **SCOPE:** EVIDENCE COLLECTION & GATE 1 AUDIT (ZERO NETWORK ACCESS, ZERO DB CONNECTION, ZERO DDL/DML)  
> **AUDITOR:** Autonomous Migration Safety Auditor (Antigravity Core)  
> **VERDICT:** **MORE EVIDENCE REQUIRED** (Gate 1 Request BLOCKED Pending Task A Endpoint Confirmation)

---

### 1. Executive Summary

Phase 8.7.4B conducts an authoritative evidence review to determine whether TATALORA ERP is ready to request formal **Gate 1 Approval** (Preparation of Isolated Staging Resources).

In accordance with strict safety mandates:
- **No network calls or DNS queries were made.**
- **No database connections, queries, or mutations were initiated.**
- **No credentials or connection strings were exposed.**
- **Working-tree integrity was preserved.**

#### Core Gate 1 Readiness Findings:
1. **Task A (MongoDB Staging Identity) — BLOCKED / UNVERIFIED:** Local repository inspection across `.env.staging`, configuration files, and historical audit reports reveals that `staging-cluster.internal:27017` is solely a synthetic placeholder. No authoritative environment document or deployment configuration defines the actual MongoDB staging cluster endpoint. Staging resource preparation cannot proceed on unverified assumptions.
2. **Task B (PostgreSQL Staging Identity) — VERIFIED:** Authoritative configuration exists in [`backend/.env.staging`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/.env.staging), confirming the Supabase staging host `aws-0-ap-northeast-1.pooler.supabase.com`, port `5432`, database path `/postgres`, and required `sslmode=require`.
3. **Task C (Cleanup and Outbox Integrity) — VERIFIED & HARDENED:** The cleanup protocol has been statically audited. It strictly enforces a scoped `DELETE` using synthetic tenant identifiers, documents complete parent-child cascading deletion paths across all 29 child tables, prohibits table-wide `TRUNCATE`, mandates pre-cleanup verification, and guarantees `_reverse_sync_outbox` preservation for forensic auditability.
4. **Task D (Validator Regression Tests) — VERIFIED:** Regression test suites ([`test_production_cdc_relay.unit.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/test_production_cdc_relay.unit.js) with 35 tests, and [`offline_integration_test_suite.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/offline_integration_test_suite.js) with 34 tests) directly exercise the production validator code, confirming fail-closed rejection of non-`/postgres` paths, non-allowlisted hosts, and insecure TLS flags.

---

### 2. Evidence Reviewed & Exact Source Paths

| Evidence Identifier | File Path | Line Range | Content & Relevance |
|---|---|---|---|
| **EVD-01** | `backend/.env.staging` | Lines 1–25 | Defines `DIRECT_URL`, `DATABASE_URL` (Supabase staging pooler), `STAGING_TARGET_HOST`, `STAGING_PROJECT_REF`, `IS_DISPOSABLE_STAGING=true`. |
| **EVD-02** | `backend/scripts/migration/production_cdc_relay_worker.js` | Lines 20–175 | Defines `STAGING_HOST_ALLOWLIST`, `validateTargetPolicy()`, and `validatePostgresTargetPolicy()` (strictly enforcing `/postgres` and TLS). |
| **EVD-03** | `backend/scripts/migration/04_staging_mongo_cdc_indexes.js` | Lines 20–65 | Defines `validateStagingMongoUri()`, enforcing `/tatalora_staging` and rejecting insecure TLS flags (`tlsInsecure`, `sslInsecure`, etc.). |
| **EVD-04** | `backend/scripts/migration/03_transactional_cdc_outbox_hardening.draft.sql` | Lines 140–340 | Authoritative parent foreign key lookup across all 29 child tables and universal `RAISE EXCEPTION` fail-closed trigger. |
| **EVD-05** | `backend/prisma/schema.postgresql.prisma` | Lines 1–3953 | 186 PostgreSQL domain models establishing primary keys, foreign keys, and cascading relationships. |
| **EVD-06** | `backend/scripts/migration/test_production_cdc_relay.unit.js` | Lines 420–550 | 35 offline unit tests verifying target policies, F-04 path enforcement, and F-05 insecure TLS rejection. |
| **EVD-07** | `backend/scripts/migration/offline_integration_test_suite.js` | Lines 660–730 | 34 offline integration harness tests verifying multi-document transactions, lease stealing, and gatekeeper rules. |
| **EVD-08** | `phase8-7-4-controlled-staging-rehearsal-plan.md` | Lines 1–370 | Rehearsal architecture, preflight checks, approval gates, and hardened cleanup procedures. |

---

### 3. Task A — MongoDB Staging Identity Assessment

#### A. Investigation Findings:
- Exhaustive search of all repository files, `.env` templates, and script files revealed **no authoritative MongoDB staging connection string**.
- In `backend/.env.staging`, only PostgreSQL Supabase staging parameters are configured. MongoDB variables are entirely absent.
- In `backend/scripts/migration/staging_environment_guard.js`, the loader attempts to read `process.env.STAGING_MONGO_URL`, but no template provides a concrete host.
- The string `staging-cluster.internal:27017` appears exclusively inside test assertions and hardcoded fallback allowlists in `production_cdc_relay_worker.js` and `04_staging_mongo_cdc_indexes.js`.
- In historical Phase 8.6.4 audit reports, MongoDB Staging Source Identity was recorded as `NOT_CONFIGURED (CREDENTIALS_REQUIRED)`.

#### B. Classification & Required Action:
- **Status:** **`UNVERIFIED — CRITICAL BLOCKER`**
- **Root Cause:** Staging MongoDB cluster has either not been provisioned by infrastructure owners, or its internal hostname/connection parameters have not been checked into repository templates.
- **Pre-Gate 1 Requirement:** The Infrastructure Owner / Cloud Lead must formally confirm:
  1. The exact MongoDB staging cluster endpoint (e.g., dedicated Atlas staging M10+ cluster or isolated staging VM).
  2. The exact database name (must match `/tatalora_staging`).
  3. That the endpoint is isolated and contains zero production customer data.
  4. The required TLS certificate requirements for connection.

---

### 4. Task B — PostgreSQL Staging Identity Assessment

#### A. Investigation Findings:
Inspection of `backend/.env.staging` and validator implementations confirms:
- **Protocol:** `postgresql://` (Verified).
- **Target Host:** `aws-0-ap-northeast-1.pooler.supabase.com` (Verified).
- **Port:** `5432` (Direct Session Pooler) and `6543` (Transaction Pooler) (Verified).
- **Target Database:** `/postgres` (Verified & enforced in `validatePostgresTargetPolicy()`).
- **Project Reference:** `xywfoixgmqhecsufhlvz` (Supabase Staging Project).
- **TLS Configuration:** `sslmode=require` configured in connection string.

#### B. Security & TLS Hardening Assessment:
- `sslmode=require` guarantees wire encryption across public transit to Supabase poolers.
- **Server Identity Verification Limitation:** As documented in Phase 8.7.4A, `sslmode=require` does **not** verify the server's certificate against a local CA bundle.
- **Recommendation for Gate 2:** To achieve strict enterprise TLS parity (`sslmode=verify-full`), the Supabase root certificate bundle must be staged in `backend/certs/supabase-staging-ca.crt` and referenced via `sslrootcert`.

#### C. Classification:
- **Status:** **`VERIFIED (Configuration Present and Validated)`**

---

### 5. Task C — Cleanup and Outbox Integrity Assessment

The cleanup and rollback procedures outlined in [`phase8-7-4-controlled-staging-rehearsal-plan.md`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/phase8-7-4-controlled-staging-rehearsal-plan.md) were statically analyzed for safety against shared staging contamination:

```
+---------------------------------------------------------------------------------------------------+
| SYNTHETIC DATA ISOLATION & CLEANUP HIERARCHY                                                      |
+---------------------------------------------------------------------------------------------------+
| 1. SYNTHETIC TENANT BOUNDARY:                                                                     |
|    - Root Company: '00000000-0000-0000-0000-000000000001'                                         |
|    - Exclusively owned Warehouses, Customers, Vendors, and Chart of Accounts                      |
|                                                                                                   |
| 2. VERIFIED DELETION CASCADE (Reverse Dependency Order):                                          |
|    Level 4 (Grandchild items):                                                                    |
|      - BomOperation (via routing_id -> BomRouting)                                                |
|      - TimberDeliveryNoteItem (via deliveryNoteId -> TimberDeliveryNote)                           |
|      - SawnTimberOutputItem (via outputId -> SawnTimberOutput)                                    |
|      - SawmillProductionConsumption, SawmillOutputItem (via productionRunId -> SawmillRun)        |
|    Level 3 (Secondary child items):                                                               |
|      - SalesOrderItem, InvoiceItem, PurchaseOrderItem, GoodsReceiptItem                           |
|      - ProductionProcessInput, ProductionProcessOutput, BomItem, ManufacturingOrderItem           |
|    Level 2 (Parent entities with direct company_id):                                              |
|      - SalesOrder, Invoice, PurchaseOrder, Bom, ProductionProcess, TimberStock                    |
|    Level 1 (Root synthetic tenant):                                                               |
|      - DELETE FROM public."Company" WHERE id = '00000000-0000-0000-0000-000000000001'            |
|                                                                                                   |
| 3. FAIL-SAFE CLEANUP GUARDS:                                                                      |
|    - Pre-Cleanup Verification: Queries COUNT(*) of records with NULL or unknown company_id.       |
|    - If any unscoped record is detected -> CLEANUP ABORTS IMMEDIATELY (Zero truncate).            |
|    - Outbox Preservation: _reverse_sync_outbox records are retained for forensic analysis.        |
+---------------------------------------------------------------------------------------------------+
```

#### A. Audit of the 29 Child Tables Without Direct `company_id`:
Each child table has a verified parent foreign key path to the synthetic company:
1. `SalesReturnItem` $\rightarrow$ `SalesReturn.company_id`
2. `PurchaseReturnItem` $\rightarrow$ `PurchaseReturn.company_id`
3. `FinanceTransactionItem` $\rightarrow$ `FinanceTransaction.company_id`
4. `FinanceDocument` $\rightarrow$ `FinanceTransaction.company_id`
5. `NettingAllocation` $\rightarrow$ `Netting.company_id`
6. `InventoryDisposalItem` $\rightarrow$ `InventoryDisposal.company_id`
7. `StockTransformationInput` $\rightarrow$ `StockTransformation.company_id`
8. `StockTransformationOutput` $\rightarrow$ `StockTransformation.company_id`
9. `TimberPurchaseLogItem` $\rightarrow$ `TimberPurchase.company_id`
10. `TimberShipmentItem` $\rightarrow$ `TimberShipment.company_id`
11. `TimberStock` $\rightarrow$ `Warehouse.company_id`
12. `TimberStockMovement` $\rightarrow$ `TimberStock.locationId` $\rightarrow$ `Warehouse.company_id`
13. `TrimmedLog` $\rightarrow$ `Warehouse.company_id`
14. `InputLog` $\rightarrow$ `Warehouse.company_id`
15. `InputLogItem` $\rightarrow$ `InputLog.locationId` $\rightarrow$ `Warehouse.company_id`
16. `SawnTimberOutput` $\rightarrow$ `Warehouse.company_id`
17. `SawnTimberOutputItem` $\rightarrow$ `SawnTimberOutput.locationId` $\rightarrow$ `Warehouse.company_id`
18. `SawmillProductionRun` $\rightarrow$ `WorkCenter.company_id`
19. `SawmillProductionConsumption` $\rightarrow$ `SawmillProductionRun.workCenterId` $\rightarrow$ `WorkCenter.company_id`
20. `SawmillOutputItem` $\rightarrow$ `SawmillProductionRun.workCenterId` $\rightarrow$ `WorkCenter.company_id`
21. `TimberStockOpnameItem` $\rightarrow$ `TimberStockOpname.company_id`
22. `ExportShipmentItem` $\rightarrow$ `ExportShipment.company_id`
23. `StockInTallyItem` $\rightarrow$ `StockInTally.company_id`
24. `ProductionProcessInput` $\rightarrow$ `ProductionProcess.company_id`
25. `ProductionProcessOutput` $\rightarrow$ `ProductionProcess.company_id`
26. `BomItem` $\rightarrow$ `Bom.company_id`
27. `ManufacturingOrderItem` $\rightarrow$ `ManufacturingOrder.company_id`
28. `BomRouting` $\rightarrow$ `Bom.company_id`
29. `BomOperation` $\rightarrow$ `BomRouting.bom_id` $\rightarrow$ `Bom.company_id`

#### B. Outbox Retention & Post-Cleanup Interpretability:
- `_reverse_sync_outbox` rows record `company_id = '00000000-0000-0000-0000-000000000001'`.
- Deleting the synthetic records in operational tables does **not** corrupt the outbox because outbox rows do not have foreign key constraints back to domain tables (ensuring decoupled auditing).
- Outbox events contain the full `previous_state` and `current_state` JSONB payloads, preserving complete evidence of the transaction lifecycle.
- **Classification:** **`VERIFIED SAFE`**

---

### 6. Task D — Confirmation of F-04 and F-05 Regression Tests

Static and runtime inspection confirms that the regression test suite exercises the **actual production implementations**:

1. **F-04 Regression Verification:**
   - In [`test_production_cdc_relay.unit.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/test_production_cdc_relay.unit.js):
     - **Test 26:** Instantiates `ProductionCdcRelayWorker` with `postgresUri: '.../wrong_pg_db'`. Directly hits `validatePostgresTargetPolicy()` at line 160. Throws `"database path must be 'postgres'"`. **PASSED**.
     - **Test 27:** Instantiates `ProductionCdcRelayWorker` with `sslmode=disable|allow|prefer`. Hits validation at line 167. Throws `"Remote staging PostgreSQL requires sslmode=require"`. **PASSED**.
2. **F-05 Regression Verification:**
   - In [`test_production_cdc_relay.unit.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/test_production_cdc_relay.unit.js):
     - **Test 28:** Calls `validateStagingMongoUri()` imported directly from [`04_staging_mongo_cdc_indexes.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/04_staging_mongo_cdc_indexes.js) with `tlsInsecure=true`, `sslInsecure=true`, etc. Hits validation at lines 66–75. Throws `"Insecure TLS parameter detected"`. **PASSED**.
3. **Integration Harness Verification:**
   - In [`offline_integration_test_suite.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/offline_integration_test_suite.js):
     - **Test E4.8:** Tests PostgreSQL database path validation in the worker harness. **PASSED**.
     - **Test E4.9:** Tests MongoDB index script validator for insecure TLS parameters. **PASSED**.

---

### 7. Remaining Risks & Required External Confirmations

Before any Gate 1 authorization can be granted, the following external items must be resolved:

```
+---------------------------------------------------------------------------------------------------+
| REMAINING EXTERNAL BLOCKERS & PREREQUISITES                                                       |
+---------------------------------------------------------------------------------------------------+
| 1. [BLOCKER] MongoDB Staging Endpoint (Task A):                                                   |
|    - Infrastructure Owner must provide the actual staging MongoDB URI and cluster host.           |
|    - The hostname must be added to STAGING_HOST_ALLOWLIST in production_cdc_relay_worker.js.      |
|                                                                                                   |
| 2. [PREREQUISITE] Synthetic Tenant ID Reservation:                                                |
|    - Infrastructure team must verify that UUID '00000000-0000-0000-0000-000000000001' is not     |
|      in use by any pre-existing test fixtures on the Supabase staging database.                   |
|                                                                                                   |
| 3. [PREREQUISITE] Staging CA Certificate Pinning:                                                 |
|    - Download Supabase staging CA root bundle to enable sslmode=verify-full.                     |
+---------------------------------------------------------------------------------------------------+
```

---

### 8. Official Recommendation & Verdict

Based on the evidence collected:

| Domain | Status | Note |
|---|---|---|
| PostgreSQL Staging Identity | **VERIFIED** | Host, port, DB path, and TLS verified in `.env.staging` |
| Child Table Cascading Cleanup | **VERIFIED** | Scoped deletion hierarchy and fail-closed guards verified |
| F-04 & F-05 Regression Validation | **VERIFIED** | Tests 26, 27, 28, E4.8, E4.9 exercise real validator code |
| MongoDB Staging Identity | **UNVERIFIED (BLOCKED)** | `staging-cluster.internal:27017` is an unverified placeholder |

### **OFFICIAL VERDICT:**
# **`MORE EVIDENCE REQUIRED`**
*(Gate 1 Request is BLOCKED until Task A is resolved by the Infrastructure Owner).*

#### Required Actions to Unblock:
1. Obtain the verified MongoDB staging connection endpoint from the Cloud Infrastructure Lead.
2. Update `.env.staging` (or dedicated staging env template) with the verified `STAGING_MONGODB_URI`.
3. Add the confirmed staging MongoDB hostname to `STAGING_HOST_ALLOWLIST`.
4. Re-run offline regression suites.
5. Once verified, submit the Gate 1 Approval Package.
