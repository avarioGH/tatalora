# TATALORA ERP — PHASE 8.7.4
## Controlled Staging Sandbox Rehearsal Plan

> **DATE:** 2026-10-17  
> **STAGE:** FORMAL PLANNING ONLY — STRICTLY NON-EXECUTABLE  
> **OPERATIONAL RESTRICTION:** ZERO LIVE DB CONNECTION, ZERO MUTATIONS, ZERO DDL/DML, ZERO CDC RELAY EXECUTION, ZERO TRAFFIC SWITCHING.  
> **STATUS:** **PLANNING COMPLETE — GATE 1 PENDING**

---

### 1. Executive Summary & Planning Scope

Phase 8.7.4 establishes the formal, reviewable runbook, isolation architecture, verification gates, reconciliation invariants, and hardened rollback protocols for a future controlled CDC rehearsal in an isolated staging sandbox.

Following the successful offline integration testing in Phase 8.7.3E and the local hardening remediations in Phase 8.7.4A (35 offline unit tests and 34 integration harness tests passing at 100%), this plan provides an exhaustive operational blueprint to ensure that any future staging rehearsal is completely isolated, strictly reproducible, fail-closed, and verifiable before any production cutover is ever contemplated.

> [!CAUTION]
> **PLANNING ONLY:** This document authorizes **no** network connections, database changes, staging deployments, or production actions. Approvals to proceed through subsequent operational stages are discrete and must be granted individually by the System Architect and Security Officer.

---

### 2. Step 1 — Evidence Review: Verified Facts vs. Unverified Requirements

A rigorous review of reports (Phases 8.7.3C, 8.7.3D, 8.7.3E, 8.7.4A), Prisma schemas, SQL trigger artifacts, relay worker code, and test harnesses was conducted to distinguish proven facts from assumptions.

```
+---------------------------------------------------------------------------------------------------+
| EVIDENCE STATUS BREAKDOWN                                                                         |
+---------------------------------------------------------------------------------------------------+
| PROVEN & VERIFIED FACTS (Static / Offline Mock):                                                  |
| - 186 Prisma PostgreSQL models verified in schema.postgresql.prisma                               |
| - 107 operational tables registered in trg_cdc_outbox trigger loop                                |
| - 29 child tables audited with explicit foreign key and parent ownership paths                     |
| - Fail-closed universal trigger exception (RAISE EXCEPTION when company_id IS NULL)              |
| - Cryptographic Ed25519 token canonical verification and single-use nonce consumption             |
| - PostgreSQL database path strictly enforced to /postgres in validatePostgresTargetPolicy()        |
| - MongoDB index script validator rejects tlsInsecure=true and equivalent insecure TLS parameters  |
+---------------------------------------------------------------------------------------------------+
| UNVERIFIED REQUIREMENTS / ENVIRONMENT STATUS:                                                     |
| - staging-cluster.internal:27017 is UNVERIFIED (Planning placeholder, not confirmed in DNS/env)   |
| - Synthetic Tenant UUID reservation is UNVERIFIED against live databases (must not collide)      |
| - Certificate pinning & CA verification for verify-full requires staging bundle deployment       |
+---------------------------------------------------------------------------------------------------+
| GENUINE INTEGRATION REQUIREMENTS (To be proven in Controlled Staging Rehearsal):                   |
| - Live PostgreSQL trigger execution & transaction throughput under physical connection load       |
| - Live MongoDB multi-document transaction ACID commit across replica set nodes                    |
| - Real network latency impact on worker lease duration and FOR UPDATE SKIP LOCKED batch claiming  |
| - Physical process termination & recovery during active in-flight claim                           |
+---------------------------------------------------------------------------------------------------+
```

#### A. Child Table Inventory & Tenant Isolation Mappings
- **28 vs. 29 Table Inventory:** Phase 8.7.3D identified 28 child tables requiring parent resolution. In Phase 8.7.3E, `BomOperation` was explicitly resolved via `BomRouting` -> `Bom.company_id` (a 2-hop lookup), expanding the audited operational child inventory to **29 child tables**.
- **Schema Parity Verification:** All 29 tables exist in `backend/prisma/schema.postgresql.prisma`, possess verified foreign keys matching parent models, and contain no direct `company_id`.
- **Fail-Closed Resolution:** In `backend/scripts/migration/03_transactional_cdc_outbox_hardening.draft.sql`, all 29 models are handled in the `CASE TG_TABLE_NAME` statement. Missing parent records result in an explicit `CRITICAL_TENANT_ISOLATION_FAILURE` exception that rolls back the source mutation.

#### B. Event Contract & Schema Alignment
- **PostgreSQL Outbox Contract:** Generates rows in `public._reverse_sync_outbox` with columns: `id`, `event_id`, `company_id`, `model_name`, `record_id`, `entity_version`, `operation`, `previous_state`, `current_state`, `replay_fingerprint`, `transaction_timestamp`, `status` (`PENDING`), `attempt_count` (`0`).
- **Relay Worker Consumer Contract:** In `backend/scripts/migration/production_cdc_relay_worker.js`, `claimOutboxBatch()` expects exactly these column names and types, applying `FOR UPDATE SKIP LOCKED`.
- **MongoDB Applied Ledger Contract:** Worker commits to `_cdc_applied_events` (`event_id` unique, `fingerprint`, `entity_version`) within the identical multi-document transaction as the document mutation.
- **Contract Parity:** **MATCHED AND VERIFIED**.

#### C. URI, Host, Port & TLS Consistency Across Validators
Audit of `production_cdc_relay_worker.js`, `04_staging_mongo_cdc_indexes.js`, and `staging_environment_guard.js`:
- **MongoDB Protocol:** `mongodb://` or `mongodb+srv://`.
- **MongoDB Host Allowlist:** `staging-cluster.internal`, `staging-mongo.internal`, `localhost`, `127.0.0.1`.
- **MongoDB Database Name:** Strictly enforced to `tatalora_staging`.
- **MongoDB Insecure TLS:** Rejects `tlsInsecure=true`, `sslInsecure=true`, `tlsAllowInvalidCertificates=true`, `tlsAllowInvalidHostnames=true`, and `ssl=false`. (Remediated & Verified in Phase 8.7.4A).
- **PostgreSQL Host Allowlist:** `aws-0-ap-northeast-1.pooler.supabase.com`, `localhost`, `127.0.0.1`.
- **PostgreSQL Database Name:** Strictly enforced to `postgres` (`parsedPg.pathname === '/postgres'`). (Remediated & Verified in Phase 8.7.4A).
- **PostgreSQL Port:** Strictly enforced to `5432` or `6543`.
- **PostgreSQL TLS:** Requires `sslmode=require` or `sslmode=verify-full`. Insecure modes (`disable`, `allow`, `prefer`, `ssl=false`) are strictly rejected.

---

### 3. Step 2 — Rehearsal Environment & Isolation Design

Strict boundary isolation is enforced between production, disposable staging, and local environments:

```
+---------------------------------------------------------------------------------------------------+
| PHYSICAL & LOGICAL ENVIRONMENT SEPARATION                                                          |
+---------------------------------------------------------------------------------------------------+
| [ PRODUCTION ]                                                                                    |
| MongoDB Atlas (Live ERP) -----------------------------------------------+ (COMPLETELY AIR-GAPPED) |
| NO CONNECTION STRINGS IN STAGING ENV / BLOCKED BY POLICY REGEX         |                         |
+-------------------------------------------------------------------------|-------------------------+
                                                                          |
+-------------------------------------------------------------------------v-------------------------+
| [ CONTROLLED STAGING SANDBOX ]                                                                    |
|                                                                                                   |
|  Source: MongoDB Staging Sandbox                                Target: Supabase PostgreSQL Staging|
|  - Host: staging-cluster.internal [UNVERIFIED]                  - Host: aws-0-ap-northeast-1...   |
|  - DB:   tatalora_staging (DISPOSABLE)                          - Port: 5432 / 6543               |
|  - Data: Synthetic Seed Tenant Only                             - DB:   postgres (SCHEMA ISOLATED)|
|          (UUID: 00000000-0000-0000-0000-000000000001)           - Role: tatalora_staging_app      |
|                                                                 - Search Path: public, extensions |
|                                 ^                                              ^                  |
|                                 |                                              |                  |
|                                 +----------------------+-----------------------+                  |
|                                                        |                                          |
|                                           [ PRODUCTION CDC RELAY WORKER ]                         |
|                                           - TargetEnv: tatalora-staging                           |
|                                           - Worker ID: worker-staging-rehearsal-01                |
|                                           - In-Memory Lease Duration: 30s                         |
|                                           - Ed25519 PubKey: Synthetic Rehearsal Key               |
+---------------------------------------------------------------------------------------------------+
```

#### A. Target Identity Policy Table

| Resource | Expected Protocol | Approved Host | Port | Database / Schema | Required TLS Policy | Allowed Operations | Status |
|---|---|---|---|---|---|---|---|
| **MongoDB Production** | `mongodb+srv://` | Atlas Cluster (*.mongodb.net) | 27017 | `production_db` | Enforced TLS | **NONE — STRICTLY FORBIDDEN (AIR-GAPPED)** | **VERIFIED** |
| **MongoDB Staging Source** | `mongodb://` or `mongodb+srv://` | `staging-cluster.internal` / `localhost` | 27017 | `tatalora_staging` | TLS required if remote; no insecure flags | READ, WRITE (Synthetic only), DROP (Post-rehearsal) | **UNVERIFIED HOST** |
| **PostgreSQL Staging Target** | `postgresql://` | `aws-0-ap-northeast-1.pooler.supabase.com` | 5432 / 6543 | `postgres` (Public schema) | `sslmode=require` or `sslmode=verify-full` | DDL (Draft trigger), INSERT, UPDATE, SELECT | **VERIFIED HOST** |
| **Local Harness Engine** | In-process | `localhost` / `127.0.0.1` | N/A | In-memory / Mock | N/A | EXECUTE unit & integration simulations | **VERIFIED** |

#### B. Target Identity Status & Synthetic Tenant Reservation
1. **Host Verification Status:** `staging-cluster.internal:27017` is currently an unverified planning placeholder. Prior to Gate 1 approval, infrastructure teams must document the authoritative internal DNS or replace it with the verified staging endpoint.
2. **Synthetic Tenant Reservation:** The synthetic tenant UUID `00000000-0000-0000-0000-000000000001` is reserved in code for test harnesses. Prior to Gate 2 read-only validation, operations must confirm that this identifier is never present in any existing staging seed.
3. **PostgreSQL TLS Server Identity Verification:** While `sslmode=require` encrypts wire traffic, it does not verify server identity against CA roots. For staging rehearsal against Supabase, `sslmode=verify-full` is documented as the ideal configuration, requiring the Supabase CA certificate bundle (`sslrootcert`) to be supplied in the staging environment.

---

### 4. Step 3 — Hardened Rehearsal Runbook

This runbook specifies the exact sequence, preconditions, evidence required, and failure criteria for each rehearsal phase. **No step is executed during this planning phase.**

```
+---------------------------------------------------------------------------------------------------+
| REHEARSAL WORKFLOW & APPROVAL GATES                                                               |
+---------------------------------------------------------------------------------------------------+
| GATE 1: Authorization to Prepare Staging Resources                                               |
|   |                                                                                               |
|   +---> Step A: Preflight Target Identity & Zero-Production Verification                          |
|   +---> Step B: Synthetic Seed Tenant & Business Data Preparation                                 |
|                                                                                                   |
| GATE 2: Authorization for Read-Only Staging Validation                                            |
|   |                                                                                               |
|   +---> Step C: Baseline Schema, Constraint, and Index Verification                               |
|                                                                                                   |
| GATE 3: Authorization to Apply Staging DDL & Trigger Installation                                 |
|   |                                                                                               |
|   +---> Step D: Apply 03 Outbox Hardening Draft & 04 MongoDB Index Provisioning                   |
|   +---> Step E: Initial Static Data Migration Checkpoint                                          |
|                                                                                                   |
| GATE 4: Authorization to Run Live Staging CDC Relay Rehearsal                                     |
|   |                                                                                               |
|   +---> Step F: Controlled CDC Relay Startup & Forward Mutation Injection                        |
|   +---> Step G: Chaos & Failure Injection (Lease Loss, Duplicate Delivery, Nonce Replay)           |
|   +---> Step H: Tenant Isolation Barrier & Cross-Tenant Attack Injection                          |
|   +---> Step I: Full Financial & Inventory Consistency Reconciliation                            |
|   +---> Step J: Queue Drain, Quarantine Audit, and Worker Shutdown                                |
|                                                                                                   |
| GATE 5: Rollback Execution & Post-Rehearsal Cleanup                                               |
|   |                                                                                               |
|   +---> Step K: Hardened Rollback Execution, Scoped Data Purge & Evidence Archival                 |
+---------------------------------------------------------------------------------------------------+
```

#### Step A: Preflight & Target Identity Verification
- **Prerequisites:** Staging credentials injected via ephemeral environment; zero production variables present.
- **Action (Future Rehearsal):** Execute `staging_environment_guard.js` and `ProductionCdcRelayWorker.validateTargetPolicy()`.
- **Database Mutation:** **NO**.
- **Required Evidence:** Console confirmation of `VERIFIED_STAGING` for both MongoDB and PostgreSQL, explicit rejection of test strings containing production keywords, zero network calls to Atlas.
- **Failure Conditions:** Host outside allowlist, path not `/tatalora_staging` or `/postgres`, missing SSL, or any presence of production keywords -> **ABORT IMMEDIATELY**.

#### Step B: Synthetic Data Preparation
- **Prerequisites:** Step A verified.
- **Action (Future Rehearsal):** Seed dedicated synthetic tenant (`company_id: 00000000-0000-0000-0000-000000000001`) with isolated chart of accounts, warehouses, customers, and timber inventory records into MongoDB staging.
- **Database Mutation:** **YES (MongoDB Staging Only)**.
- **Required Evidence:** Exact document count hash of synthetic records; zero contamination with existing tenant UUIDs.
- **Failure Conditions:** Any write directed to database other than `tatalora_staging` -> **ABORT**.

#### Step C: Baseline Schema & Constraint Verification
- **Prerequisites:** Step B completed.
- **Action (Future Rehearsal):** Read PostgreSQL staging catalog to ensure 186 Prisma tables exist, foreign keys match `schema.postgresql.prisma`, and table constraints are intact.
- **Database Mutation:** **NO**.
- **Required Evidence:** Schema catalog query returning 186 tables and correct foreign key constraints for all 29 child tables.
- **Failure Conditions:** Schema drift or missing foreign key constraints -> **ABORT**.

#### Step D: Apply Staging DDL & MongoDB Indexes
- **Prerequisites:** Gate 3 approval.
- **Action (Future Rehearsal):** 
  1. Execute `03_transactional_cdc_outbox_hardening.draft.sql` on Supabase staging PostgreSQL.
  2. Execute `04_staging_mongo_cdc_indexes.js` on MongoDB staging cluster.
- **Database Mutation:** **YES (PostgreSQL Staging DDL & MongoDB Index Creation)**.
- **Required Evidence:**
  - PostgreSQL: `_reverse_sync_outbox`, `_cdc_entity_lock`, `_cdc_quarantine` created; 107 triggers attached to operational tables.
  - MongoDB: Unique indexes on `_cdc_applied_events.event_id` and `_cdc_recreate_nonces.nonce` confirmed.
- **Failure Conditions:** Trigger creation failure, permission error, or index creation error -> **ABORT & ROLLBACK**.

#### Step E: Initial Static Data Migration Checkpoint
- **Prerequisites:** Step D verified.
- **Action (Future Rehearsal):** Run baseline ETL (`hardened_staging_etl.js`) to migrate historical synthetic records from MongoDB staging to PostgreSQL staging.
- **Database Mutation:** **YES (PostgreSQL Staging Table Inserts)**.
- **Required Evidence:** Exact record count match and SHA-256 hash match between MongoDB source and PostgreSQL destination for synthetic tenant.
- **Failure Conditions:** Record count mismatch or hash discrepancy > 0 -> **ABORT**.

#### Step F: Controlled CDC Relay Startup & Forward Mutation Injection
- **Prerequisites:** Initial migration reconciled.
- **Action (Future Rehearsal):**
  1. Start dormant relay worker in polling mode (`targetEnv: 'tatalora-staging'`, `batchSize: 50`).
  2. In PostgreSQL staging, execute sequential business transactions under synthetic tenant:
     - INSERT new `SalesOrder` and 3 `SalesOrderItem` records.
     - UPDATE `SalesOrder` status to `CONFIRMED`.
     - HARD_DELETE a cancelled draft order.
- **Database Mutation:** **YES (PostgreSQL Outbox & MongoDB Document Updates)**.
- **Required Evidence:**
  - Triggers write 5 events to `_reverse_sync_outbox` with sequential `entity_version` (1, 2...).
  - Relay claims batch via `FOR UPDATE SKIP LOCKED`.
  - MongoDB documents created/updated; tombstone created for deleted order.
  - Outbox status updated to `PROCESSED` with valid `worker_id`.
- **Failure Conditions:** Any outbox event failing to sync, out-of-order version, or unhandled exception -> **ABORT**.

#### Step G: Chaos & Failure Injection Rehearsal
- **Prerequisites:** Step F verified.
- **Action (Future Rehearsal):**
  1. **Duplicate Delivery Injection:** Resend processed `event_id` to relay worker.
  2. **Worker Lease Stealing:** Worker A claims batch with lease 5s; pause Worker A; Worker B claims expired lease; Worker A resumes and attempts `acknowledgePostgres()`.
  3. **Unauthorized Resurrection:** Attempt INSERT against tombstoned document without cryptographic token.
  4. **Cryptographic RECREATE with Nonce Replay:** Resurrect tombstone with valid Ed25519 token; replay identical token again.
- **Database Mutation:** **YES (Staging mutations & ledger entries)**.
- **Required Evidence:**
  - Duplicate delivery converges via `_cdc_applied_events` with 0 duplicate mutations.
  - Worker A ACK affects 0 rows (`worker_id` mismatch) and is rejected.
  - Unauthorized mutation against tombstone rejected (`REJECTED_STALE_AGAINST_TOMBSTONE`).
  - First RECREATE succeeds; replayed nonce rejected with `NONCE_REPLAY_REJECTED` inside atomic session.
- **Failure Conditions:** Double application of event, stale worker overwriting lease, or nonce reused -> **CRITICAL FAILURE & ABORT**.

#### Step H: Tenant Isolation Barrier & Cross-Tenant Attack Injection
- **Prerequisites:** Step G passed.
- **Action (Future Rehearsal):**
  1. Attempt to insert `SalesOrderItem` referencing non-existent parent order ID.
  2. Attempt to insert `ProductionProcessInput` referencing parent in Tenant B (`company_id: 2222...`) while child provides Tenant A.
- **Database Mutation:** **ATTEMPTED MUTATION (Must Fail)**.
- **Required Evidence:**
  - Trigger function aborts transaction with `CRITICAL_TENANT_ISOLATION_FAILURE`.
  - Zero rows created in child table.
  - Zero rows created in `_reverse_sync_outbox`.
- **Failure Conditions:** Child record inserted without valid tenant resolution -> **CRITICAL P0 FAILURE & ABORT**.

#### Step I: Full Financial & Inventory Consistency Reconciliation
- **Prerequisites:** Step H passed.
- **Action (Future Rehearsal):** Execute automated reconciliation script across MongoDB staging and PostgreSQL staging.
- **Database Mutation:** **NO**.
- **Required Evidence:**
  - Financial Ledger: Sum of debits equals sum of credits exactly across synthetic `JournalEntryItem`.
  - Inventory Balance: Total timber piece count and volume in `TimberStock` matches sum of active log items.
  - Payload Hash Parity: 100% hash parity across all operational models.
- **Failure Conditions:** Any ledger imbalance or hash mismatch -> **ABORT**.

#### Step J: Queue Drain, Quarantine Audit, and Worker Shutdown
- **Prerequisites:** Step I passed.
- **Action (Future Rehearsal):**
  1. Verify `_reverse_sync_outbox` has 0 rows in `PENDING` or `IN_FLIGHT`.
  2. Query `_cdc_quarantine` to ensure only intentionally faulted chaos test records are quarantined.
  3. Gracefully stop relay worker (`disconnect()`).
- **Database Mutation:** **NO**.
- **Required Evidence:** Clean worker disconnection log, 0 unprocessed outbox records.
- **Failure Conditions:** Orphaned in-flight events or hung worker connections -> **ABORT**.

#### Step K: Hardened Rollback, Scoped Data Purge & Evidence Archival
- **Prerequisites:** Operator authorization; pre-cleanup validation.
- **Action (Future Rehearsal):** Execute hardened cleanup procedure (detailed in Section 5).
- **Database Mutation:** **YES (Strictly Scoped Cleanup)**.
- **Required Evidence:** Synthetic tenant records cleanly removed; zero shared tenant tables truncated; outbox archived.

---

### 5. Step 4 — Reconciliation Thresholds and Hardened Rollback Strategy

#### A. Measurable Reconciliation Thresholds

| Metric | Target / Acceptance Threshold | Failure Condition |
|---|---|---|
| **Record Count Parity** | 100.00% match across all migrated models | Difference >= 1 record |
| **Canonical Payload Hash Parity** | 100.00% SHA-256 match for equivalent fields | Any hash divergence |
| **Tenant Ownership Parity** | 100.00% child records inherit valid tenant ID | Any child record with NULL or cross-tenant ID |
| **Financial Ledger Integrity** | $\sum \text{Debits} - \sum \text{Credits} = 0.00$ exactly | Net discrepancy > 0.00 |
| **Inventory Quantity Parity** | Physical count in stock equals sum of active receipts minus issues | Any quantity mismatch |
| **Outbox Drain Parity** | 0 rows in `PENDING` or `IN_FLIGHT` after quiescence | Unprocessed records > 0 |
| **Duplicate Ledger Integrity** | Zero duplicate `event_id` in `_cdc_applied_events` | Duplicate key violation on unique index |

#### B. Hardened Rollback & Safe Cleanup Protocol
To ensure that post-rehearsal cleanup cannot accidentally truncate shared staging tables or destroy concurrent staging datasets:

```
+---------------------------------------------------------------------------------------------------+
| HARDENED ROLLBACK & CLEANUP WORKFLOW                                                              |
+---------------------------------------------------------------------------------------------------+
| 1. IMMEDIATE RELAY HALT: Issue worker SIGTERM / call disconnect(). Cease outbox polling.          |
| 2. IN-FLIGHT DRAIN & QUARANTINE: Allow current batch 30s to finish or expire.                     |
| 3. PRE-CLEANUP VERIFICATION: Query row ownership. If records lack explicit synthetic tenant ID,  |
|    mark cleanup BLOCKED immediately. NEVER EXECUTE UNQUALIFIED TRUNCATE.                         |
| 4. RECONCILIATION RETENTION: Do NOT purge outbox records until reconciliation audit is signed.     |
| 5. SCOPED RECORD PURGE: Delete ONLY records where company_id = '00000000-0000-...0001'.           |
| 6. MONGODB SCOPED PURGE: Delete synthetic documents and matching _cdc_applied_events entries.     |
| 7. TRIGGER DEACTIVATION: Drop CDC triggers on staging PostgreSQL only after tenant purge.         |
| 8. ARTIFACT PERSISTENCE: Save full audit log, stack traces, and outbox state to disk.             |
+---------------------------------------------------------------------------------------------------+
```

- **Universal Proscription Against TRUNCATE:** `TRUNCATE TABLE` is strictly forbidden on any shared staging table. Cleanup must exclusively execute scoped `DELETE FROM ... WHERE company_id = '00000000-0000-0000-0000-000000000001'`.
- **Pre-Cleanup Verification Gate:** If any child record exists with `company_id IS NULL` or an unverified tenant ID, the cleanup script must halt and throw `CLEANUP_BLOCKED_UNSCOPED_DATA_RISK`.
- **Outbox Retention Requirement:** The `_reverse_sync_outbox` table must **not** be purged during rollback. It must be exported to disk and preserved for forensic failure analysis.
- **Authorization Authority:** Rollback and cleanup must be authorized by both the **Lead Database Engineer** and **Operations Lead**.

---

### 6. Step 5 — Formal Approval Gates

To maintain institutional safety, approvals are partitioned into discrete, non-transferable gates:

```
+---------------------------------------------------------------------------------------------------+
| GATE DECISION MATRIX                                                                              |
+---------------------------------------------------------------------------------------------------+
| [GATE 1] Staging Resource Isolation & Environment Setup                                           |
|   Approver: Cloud Infrastructure Lead                                                             |
|   Prerequisites: Resolve unverified staging-cluster.internal hostname; verify tenant UUID.        |
|   Status: PENDING AUTHORIZATION                                                                   |
+---------------------------------------------------------------------------------------------------+
| [GATE 2] Read-Only Staging Schema & Identity Validation                                           |
|   Approver: Security Officer                                                                      |
|   Condition: Preflight validation tool passes, target allowlist verified, ports & SSL verified.   |
|   Status: PENDING GATE 1                                                                          |
+---------------------------------------------------------------------------------------------------+
| [GATE 3] Application of Staging-Only DDL & Trigger Installation                                   |
|   Approver: Lead Database Architect                                                               |
|   Condition: SQL migration reviewed, search_path verified, 107 triggers attached in staging only. |
|   Status: PENDING GATE 2                                                                          |
+---------------------------------------------------------------------------------------------------+
| [GATE 4] Execution of Controlled Staging CDC Rehearsal                                            |
|   Approver: Engineering Director & QA Lead                                                        |
|   Condition: Gates 1-3 complete, synthetic seed verified, disaster rollback runbook approved.    |
|   Status: PENDING GATE 3                                                                          |
+---------------------------------------------------------------------------------------------------+
| [GATE 5] Production Migration & Cutover Decision                                                  |
|   Approver: Executive Leadership & All Technical Stakeholders                                     |
|   Condition: Flawless rehearsal execution, zero unreconciled invariants, signed signoff audit.     |
|   Status: PENDING GATE 4                                                                          |
+---------------------------------------------------------------------------------------------------+
```

> [!IMPORTANT]
> Completion of this Phase 8.7.4 Planning document **DOES NOT** grant or imply approval for Gate 1, Gate 2, Gate 3, Gate 4, or Gate 5. Each gate requires independent, recorded authorization.

---

### 7. Findings & Remediation Classification (Phase 8.7.4A)

| Finding ID | Severity | Component | Issue Description | Remediation Status | Verification Method |
|---|---|---|---|---|---|
| **F-01** | **P1** | `03 draft SQL` | Child table tenant resolution | **FIXED** (Phase 8.7.3D) | 29 child tables verified in schema and offline tests. |
| **F-02** | **P1** | Relay Worker | Strict URI and hostname allowlist | **FIXED** (Phase 8.7.3D) | Validated via Unit Tests 4, 5, 6, 18, 19, 20. |
| **F-03** | **P2** | `04 index script`| Allowlist enforcement in index script | **FIXED** (Phase 8.7.3D) | Validated via Unit Tests 24, 25. |
| **F-04** | **P2** | Relay Worker | PostgreSQL path must be `/postgres` | **FIXED** (Phase 8.7.4A) | Added strict path & SSL checks; Unit Tests 26, 27 pass. |
| **F-05** | **P2** | `04 index script`| Rejection of insecure TLS parameters | **FIXED** (Phase 8.7.4A) | Added query parameter checks; Unit Test 28 passes. |
| **ENV-01** | **P2** | Staging Target | `staging-cluster.internal` host identity | **UNVERIFIED** | Requires internal DNS documentation before Gate 1. |
| **ENV-02** | **P2** | Tenant Seed | Synthetic tenant collision avoidance | **UNVERIFIED** | Requires pre-seeding catalog check before Gate 2. |

**Current Active Severity Count:**
- **P0:** 0
- **P1:** 0
- **P2:** 2 (`ENV-01` host documentation, `ENV-02` synthetic tenant pre-seed verification)

---

### 8. Recommended Next Action

1. **Keep Relay Worker Dormant:** Maintain dormant worker status; do not start any daemon or background polling process.
2. **Submit Planning Artifacts:** Submit `phase8-7-4-controlled-staging-rehearsal-plan.md` and `phase8-7-4a-planning-remediation-report.md` for architectural signoff.
3. **Execute Gate 1 Prerequisites Offline:** Document internal DNS endpoint for MongoDB staging to resolve `ENV-01`.
4. **Final Phase Status:** **`PLANNING COMPLETE — GATE 1 PENDING`**.
