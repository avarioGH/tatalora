# TATALORA ERP — PHASE 8.7.3E
## Offline Integration Test Preparation & Execution Report

> **DATE:** 2026-10-17  
> **SCOPE:** OFFLINE INTEGRATION HARNESS & EXECUTION (ZERO DB CONNECTION, ZERO NETWORK ACCESS, ZERO STAGING MUTATION)  
> **OFFICIAL STATUS:** **OFFLINE INTEGRATION TESTS COMPLETED — READY FOR CONTROLLED STAGING REHEARSAL PLANNING**

---

### 1. Environment & Safety Boundary Confirmation

In strict compliance with non-negotiable safety rules:

- [x] **No MongoDB Atlas Production Connection:** Verified that no connection was opened to production MongoDB Atlas.
- [x] **No Supabase Staging Connection:** Verified that no TCP connections were initiated to Supabase poolers or remote staging.
- [x] **No Production/Staging Credentials Used:** Synthetic credentials and test secrets only; real connection strings were not loaded or printed.
- [x] **No Production Migrations or Cutover:** DDL/DML was strictly prohibited and not executed against any external database.
- [x] **No Modification to Production Environment Files:** No `.env` or production files were modified.
- [x] **No Uncontrolled Index Provisioning:** Script `backend/scripts/migration/04_staging_mongo_cdc_indexes.js` was kept dormant and exercised only via offline parameter unit tests.
- [x] **Local Infrastructure Audit:** Verified that no local PostgreSQL daemon, local MongoDB daemon, or Docker engine was running on localhost ports (5432, 27017, 6543). Real database integration tests requiring running database daemons were marked as `NOT EXECUTED`, and offline transaction simulators were used without falsely claiming live database execution.

---

### 2. Files Inspected and Changed

#### Files Inspected:
1. `backend/scripts/migration/03_transactional_cdc_outbox_hardening.draft.sql`: PostgreSQL CDC trigger function, version ledger (`_cdc_entity_lock`), quarantine ledger (`_cdc_quarantine`), and outbox migration.
2. `backend/scripts/migration/production_cdc_relay_worker.js`: Production-grade CDC relay worker implementation, multi-document transactions, Ed25519 token verification, and URI safety policies.
3. `backend/scripts/migration/04_staging_mongo_cdc_indexes.js`: Staging MongoDB CDC idempotency and nonce index provisioning script.
4. `backend/scripts/migration/test_production_cdc_relay.unit.js`: Unit test suite covering worker dormancy, target policies, cryptographic tokens, and tombstone state machines.
5. `backend/prisma/schema.postgresql.prisma`: Authoritative PostgreSQL Prisma schema containing 186 domain models.
6. `backend/scripts/migration/verified_trigger_tables.json`: 107 operational tables audited for CDC capture.

#### Files Created / Changed:
1. `backend/scripts/migration/offline_integration_test_suite.js`: Comprehensive offline integration test harness covering E1, E2, E3, and E4.
2. `phase8-7-3e-offline-integration-test-report.md`: Official Phase 8.7.3E verification report.

---

### 3. Test Cases Executed and Actual Output

Two test suites were executed offline:

#### A. Comprehensive Offline Integration Harness
```text
Command: node backend/scripts/migration/offline_integration_test_suite.js
Exit Code: 0
```
```text
====================================================================
TATALORA ERP — PHASE 8.7.3E: OFFLINE INTEGRATION & HARNESS TEST SUITE
====================================================================

--- SECTION E1: TENANT ISOLATION & FAIL-CLOSED PARENT RESOLUTION ---
[PASS] E1.1: All 29 child tables successfully resolve tenant via parent FK
[PASS] E1.2: All 29 child tables fail-closed when parent record is missing
[PASS] E1.3: Cross-tenant parent/child ID mismatch strictly rejected
[PASS] E1.4: Universal fail-closed check present in 03 draft SQL

--- SECTION E2: CDC EVENT LIFECYCLE, CANONICAL FINGERPRINTS & IDEMPOTENCY ---
[PASS] E2.1: Progressive INSERT applied successfully
[PASS] E2.1b: Document fields correctly written
[PASS] E2.2: Progressive UPDATE version 2 applied successfully
[PASS] E2.2b: Document updated to version 2 state
[PASS] E2.3: Stale version 1 cannot overwrite version 2
[PASS] E2.3b: Active state preserved without corruption
[PASS] E2.4: Duplicate delivery converges via applied_events ledger
[PASS] E2.5: Fingerprint collision / payload tampering strictly rejected
[PASS] E2.6: HARD_DELETE transitions document to tombstone
[PASS] E2.6b: _is_deleted flag set to true
[PASS] E2.7: Mutation against tombstone without token is rejected
[PASS] E2.8: Authorized RECREATE successfully resurrects entity
[PASS] E2.8b: Document is active again
[PASS] E2.8c: Nonce recorded as consumed
[PASS] E2.9: Deterministic fingerprints for equivalent payloads

--- SECTION E3: TRANSACTION ROLLBACK, CONCURRENCY & WORKER LEASES ---
[PASS] E3.1: Transaction failure propagated properly
[PASS] E3.1b: Atomic rollback guaranteed: nonce was NOT consumed when mutation failed
[PASS] E3.2: Stale worker attempting ACK after lease loss affects 0 rows (rejected)
[PASS] E3.2b: SQL query explicitly enforces worker_id lease ownership
[PASS] E3.3: Active worker with valid lease successfully acknowledges
[PASS] E3.4: Dead-letter transition records entity into _cdc_quarantine and outbox

--- SECTION E4: STRICT STAGING URI POLICY & GATEKEEPER ---
[PASS] E4.1: MongoDB production URI rejected
[PASS] E4.2: Non-allowlisted host rejected
[PASS] E4.3: MongoDB path not matching tatalora_staging rejected
[PASS] E4.4: Insecure TLS parameter rejected
[PASS] E4.5: PostgreSQL URI without sslmode=require rejected
[PASS] E4.6: Index provisioning gatekeeper accepts approved staging URI
[PASS] E4.7: Index provisioning gatekeeper rejects unapproved database path

====================================================================
INTEGRATION HARNESS SUMMARY: 32 PASSED, 0 FAILED
====================================================================
```

#### B. Pre-Existing Expanded Unit Test Suite
```text
Command: node backend/scripts/migration/test_production_cdc_relay.unit.js
Exit Code: 0
Output Summary: 32 PASSED, 0 FAILED (100% Success)
```

---

### 4. Test Cases Prepared But Not Executed

In accordance with Section 2 (Safety Boundaries), live database integration tests requiring running local daemons were prepared but marked **NOT EXECUTED**:

| Test ID | Description | Reason Not Executed | Required Environment for Execution |
|---|---|---|---|
| **INT-PG-01** | Live PostgreSQL trigger execution & `_reverse_sync_outbox` row creation | No local PostgreSQL daemon running on port 5432 | Disposable local Docker PostgreSQL instance |
| **INT-PG-02** | Live PostgreSQL concurrency lock test on `_cdc_entity_lock` table | No local PostgreSQL daemon | Disposable local Docker PostgreSQL instance |
| **INT-MGO-01** | Live MongoDB multi-document transaction commit with Replica Set | No local MongoDB replica set daemon running on port 27017 | Disposable local single-node Replica Set |
| **INT-MGO-02** | Live MongoDB native TTL index cleanup verification | Requires MongoDB storage engine running over time | Disposable local MongoDB instance |
| **INT-REL-01** | End-to-end polling loop with network latency and physical process kill | Production worker is dormant and must not connect to remote staging | Staging sandbox environment with active worker process |

---

### 5. Tenant Isolation Coverage Across Child Tables (E1)

Every child table was cross-verified against `schema.postgresql.prisma` and the trigger code in `03_transactional_cdc_outbox_hardening.draft.sql`:

| # | Child Table | Parent Model | Foreign Key | Resolution Path in Trigger | Missing Parent / Null Result | Cross-Tenant Test Result | Evidence Type | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `SalesReturnItem` | `SalesReturn` | `sales_return_id` | `SalesReturn.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 2 | `PurchaseReturnItem` | `PurchaseReturn` | `purchase_return_id` | `PurchaseReturn.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 3 | `FinanceTransactionItem` | `FinanceTransaction` | `transaction_id` | `FinanceTransaction.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 4 | `FinanceDocument` | `FinanceTransaction` | `transaction_id` | `FinanceTransaction.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 5 | `NettingAllocation` | `Netting` | `netting_id` | `Netting.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 6 | `InventoryDisposalItem` | `InventoryDisposal` | `disposal_id` | `InventoryDisposal.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 7 | `StockTransformationInput` | `StockTransformation` | `transformation_id` | `StockTransformation.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 8 | `StockTransformationOutput` | `StockTransformation` | `transformation_id` | `StockTransformation.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 9 | `TimberPurchaseLogItem` | `TimberPurchase` | `timberPurchaseId` | `TimberPurchase.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 10 | `TimberShipmentItem` | `TimberShipment` | `timberShipmentId` | `TimberShipment.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 11 | `TimberStock` | `Warehouse` | `locationId` | `Warehouse.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 12 | `TimberStockMovement` | `TimberStock` -> `Warehouse` | `timberStockId` | `TimberStock.locationId -> Warehouse.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 13 | `TrimmedLog` | `Warehouse` / `TimberPartai` | `locationId` / `partaiId` | `Warehouse.company_id` (fallback: `TimberPartai`) | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 14 | `InputLog` | `Warehouse` / `TimberPartai` | `locationId` / `partaiId` | `Warehouse.company_id` (fallback: `TimberPartai`) | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 15 | `InputLogItem` | `InputLog` | `inputLogId` | `InputLog -> Warehouse/Partai.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 16 | `SawnTimberOutput` | `Warehouse` | `locationId` | `Warehouse.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 17 | `SawnTimberOutputItem` | `SawnTimberOutput` | `outputId` | `SawnTimberOutput.locationId -> Warehouse.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 18 | `SawmillProductionRun` | `WorkCenter` / `Employee` | `workCenterId` / `operatorId` | `WorkCenter.company_id` (fallback: `Employee`) | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 19 | `SawmillProductionConsumption` | `SawmillProductionRun` | `productionRunId` | `SawmillProductionRun -> WorkCenter/Employee` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 20 | `SawmillOutputItem` | `SawmillProductionRun` | `productionRunId` | `SawmillProductionRun -> WorkCenter/Employee` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 21 | `TimberStockOpnameItem` | `TimberStockOpname` | `stockOpnameId` | `TimberStockOpname.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 22 | `ExportShipmentItem` | `ExportShipment` | `exportId` | `ExportShipment.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 23 | `StockInTallyItem` | `StockInTally` | `tally_id` | `StockInTally.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 24 | `ProductionProcessInput` | `ProductionProcess` | `productionProcessId` | `ProductionProcess.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 25 | `ProductionProcessOutput` | `ProductionProcess` | `productionProcessId` | `ProductionProcess.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 26 | `BomItem` | `Bom` | `bom_id` | `Bom.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 27 | `ManufacturingOrderItem` | `ManufacturingOrder` | `manufacturing_order_id` | `ManufacturingOrder.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 28 | `BomRouting` | `Bom` | `bom_id` | `Bom.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |
| 29 | `BomOperation` | `BomRouting` -> `Bom` | `routing_id` | `BomRouting.bom_id -> Bom.company_id` | Fail-Closed Exception | Rejected | Static & Harness Mock | **PASS** |

---

### 6. CDC Event Lifecycle and Idempotency Results (E2)

1. **INSERT & UPDATE Transitions:** Progressive version increments (v1 -> v2) write state correctly (`MUTATION_APPLIED`).
2. **Stale Overwrite Protection:** Out-of-order events (e.g. v1 arriving after v2) are rejected with `REJECTED_STALE_VERSION`. Document maintains newer state.
3. **Duplicate Delivery:** Exact duplicate events converge via `_cdc_applied_events` lookup (`ALREADY_COMMITTED_IN_LEDGER`), producing zero duplicate mutations.
4. **Tombstone Lifecycle:** `HARD_DELETE` marks `_is_deleted: true`, sets `_tombstone_version`, and rejects subsequent standard mutations (`REJECTED_STALE_AGAINST_TOMBSTONE`).
5. **Cryptographic RECREATE:** Resurrecting a tombstoned entity requires an asymmetric Ed25519 signature matching canonical claims (`action`, `model_name`, `record_id`, `tombstone_version_to_supersede`, `nonce`). Successfully tested in offline simulation (`AUTHORIZED_RECREATE_APPLIED`).
6. **Deterministic Canonical Fingerprints:** Payload fingerprints are generated using deterministic SHA-256 (`v_operation:table:id:version:payload`). Conflicting fingerprints under identical event IDs throw `CRITICAL_FINGERPRINT_MISMATCH`.

---

### 7. Failure Injection, Rollback, Concurrency, and Lease Results (E3)

1. **Rollback on Destination Mutation Failure:** When MongoDB document mutation fails inside `withTransaction()`, the transaction aborts and rolls back all operations in that session. Test E3.1 proved that the cryptographic nonce was **not** consumed and remained available for clean retry.
2. **Worker Lease Enforced ACK:** In PostgreSQL outbox updates, `acknowledgePostgres` executes:
   ```sql
   UPDATE public._reverse_sync_outbox
   SET status = 'PROCESSED', processed_at = NOW()
   WHERE event_id = $1 AND worker_id = $2;
   ```
   If a worker's lease expired and was claimed by another worker, `$2` does not match, returning 0 rows affected and preventing stale workers from overwriting lease status.
3. **Dead-Letter & Entity Quarantine:** Entities encountering terminal errors transition to `DEAD_LETTER` in outbox and are recorded in `_cdc_quarantine` with `quarantined_at` timestamp and error reason, preventing head-of-line blocking for unrelated records.

---

### 8. URI Safety Policy Results (E4)

Verified entirely offline without network I/O:
1. **Production Rejection:** Reject URIs matching `/production/i`, `/prod/i`, `/atlas-prod/i`, and `/tatalora-live/i`.
2. **Hostname Allowlist:** Strictly enforces `staging-cluster.internal`, `staging-mongo.internal`, `localhost`, and `127.0.0.1`.
3. **Database Path:** Rejects any MongoDB URI not having `/tatalora_staging` as its exact pathname.
4. **TLS Hardening:** Rejects `tlsInsecure=true`, `sslInsecure=true`, and `tlsAllowInvalidCertificates=true`.
5. **PostgreSQL Staging Policy:** Requires `sslmode=require` or `sslmode=verify-full` for non-localhost endpoints; validates host against approved Supabase pooler allowlist.
6. **Index Script Gatekeeper:** Script `backend/scripts/migration/04_staging_mongo_cdc_indexes.js` executes `validateStagingMongoUri()` before initiating client connection.

---

### 9. Findings Classification (P0 / P1 / P2)

| Finding ID | Severity | Description | Current Status | Closure Verification |
|---|---|---|---|---|
| **F-01** | **P1** | Parent company resolution for operational child tables in CDC trigger | **RESOLVED** | All 29 child tables have explicit CASE branches and fail-closed universal exception check. |
| **F-02** | **P1** | Strict URI policy enforcement (protocol, host, db path `/tatalora_staging`, TLS) | **RESOLVED** | Integrated in relay worker constructor and pre-connect hooks; 100% offline tests pass. |
| **F-03** | **P2** | Allowlist enforcement in MongoDB index provisioning script | **RESOLVED** | Unified `validateStagingMongoUri()` applied to gatekeeper; 100% offline tests pass. |

**Current Active Severity Count:**
- **P0:** 0
- **P1:** 0
- **P2:** 0

---

### 10. Remaining Blockers & Exact Closure Criteria

While all code-level and offline design issues are resolved, moving to staging rehearsal requires satisfying strict operational prerequisites:

1. **Staging Environment Pre-requisite:**
   - Active Supabase Staging PostgreSQL instance accessible with synthetic test tenant.
   - Dedicated MongoDB Staging cluster (`tatalora_staging`) provisioned.
2. **Controlled Execution Runbook:**
   - Approval of DDL application script `backend/scripts/migration/03_transactional_cdc_outbox_hardening.draft.sql` in staging sandbox.
   - Controlled execution of `backend/scripts/migration/04_staging_mongo_cdc_indexes.js` on staging MongoDB.
3. **Synthetic Tenant Boundary:**
   - Pre-cutover test runs must use designated synthetic tenant IDs (`00000000-0000-...` or dedicated sandbox UUIDs), never existing tenant production data.

---

### 11. Explicit Distinction of Evidence Types

In accordance with Section 2 and Section 5 of the Phase 8.7.3E specifications:

| Verification Area | Real Local DB Integration | Mock / In-Memory Simulation | Static Code Inspection |
|---|---|---|---|
| **Tenant Parent Resolution (E1)** | NOT EXECUTED (No local PostgreSQL daemon) | **PROVEN** (All 29 tables simulated against foreign key lookup engine) | **PROVEN** (Prisma PostgreSQL schema and trigger SQL verified) |
| **CDC Event Lifecycle (E2)** | NOT EXECUTED (No local MongoDB daemon) | **PROVEN** (Offline multi-document session & ledger harness) | **PROVEN** (Class methods in `ProductionCdcRelayWorker` verified) |
| **Transaction Rollback (E3)** | NOT EXECUTED (No live multi-node replica set) | **PROVEN** (Memory session abort rollback verified) | **PROVEN** (`session.withTransaction` structure verified) |
| **Worker Lease Stealing (E3)** | NOT EXECUTED (No multi-process worker pool) | **PROVEN** (Prisma `$executeRawUnsafe` lease parameter verified) | **PROVEN** (SQL parameterized WHERE clause verified) |
| **URI Policy & Gatekeeper (E4)**| N/A (Does not require database) | **PROVEN** (Direct Node.js URL parser and regex evaluation) | **PROVEN** (Code inspected and verified) |

---

### 12. Final Recommendation for Next Phase

1. **Gate Acceptance:**
   - Zero P0, P1, or P2 blockers remain in the local implementation.
   - All tenant-scoped child tables fail-closed on missing or mismatched parent ownership.
   - Event idempotency, stale-worker rejection, and tombstone lifecycle are verified.
   - URI validation strictly rejects all production and unapproved destinations.
2. **Next Phase Recommendation:**
   - **RECOMMENDATION:** Proceed to **Phase 8.7.4: Controlled Staging Sandbox Rehearsal**.
   - Offline integration tests are fully satisfied. Live execution must occur strictly within the designated staging sandbox with synthetic tenant data under explicit operator supervision.
