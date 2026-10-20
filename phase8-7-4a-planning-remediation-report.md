# TATALORA ERP — PHASE 8.7.4A
## Planning Remediation & Staging Runbook Hardening Report

> **DATE:** 2026-10-17  
> **SCOPE:** LOCAL-ONLY REMEDIATION & PLANNING REVIEW (ZERO NETWORK ACCESS, ZERO DB CONNECTION)  
> **OFFICIAL STATUS:** **PLANNING COMPLETE — GATE 1 PENDING**

---

### 1. Executive Summary

Phase 8.7.4A addresses the specific findings and hardened operational requirements identified during the Phase 8.7.4 planning review:
1. **F-04 (P2) Resolved:** Strict PostgreSQL target database path (`/postgres`) and insecure SSL configuration rejection (`sslmode=disable|allow|prefer`) implemented in [`production_cdc_relay_worker.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/production_cdc_relay_worker.js).
2. **F-05 (P2) Resolved:** Strict rejection of `tlsInsecure=true` and all equivalent insecure TLS parameters (`sslInsecure=true`, `tlsAllowInvalidCertificates=true`, `tlsAllowInvalidHostnames=true`, `ssl=false`) implemented in [`04_staging_mongo_cdc_indexes.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/04_staging_mongo_cdc_indexes.js).
3. **Rollback & Cleanup Hardening:** Proscribed table-wide `TRUNCATE` operations on shared staging tables; mandated pre-cleanup verification and scoped deletion by synthetic tenant identifier; required outbox record preservation for post-failure analysis.
4. **Target Identity & Verification Status:** Audited environment endpoints and classified `staging-cluster.internal:27017` and synthetic tenant ID reservation as `UNVERIFIED` until confirmed via infrastructure documentation prior to Gate 1/2.
5. **Offline Test Verification:** Expanded unit tests from 32 to 35, and integration harness tests from 32 to 34, passing at **100% success rate**.

---

### 2. Files Inspected and Changed

#### Files Inspected:
- `backend/prisma/schema.postgresql.prisma`: Checked model definitions and foreign keys.
- `backend/scripts/migration/03_transactional_cdc_outbox_hardening.draft.sql`: Checked trigger function and fail-closed resolution.
- `backend/scripts/migration/staging_environment_guard.js`: Checked allowlists and production blocklist patterns.

#### Files Changed:
1. [`production_cdc_relay_worker.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/production_cdc_relay_worker.js): Added strict `/postgres` path check and insecure SSL parameter rejection in `validatePostgresTargetPolicy()`.
2. [`04_staging_mongo_cdc_indexes.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/04_staging_mongo_cdc_indexes.js): Added insecure TLS query parameter rejection in `validateStagingMongoUri()`.
3. [`test_production_cdc_relay.unit.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/test_production_cdc_relay.unit.js): Added Tests 26, 27, and 28 covering F-04 and F-05 negative cases.
4. [`offline_integration_test_suite.js`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/backend/scripts/migration/offline_integration_test_suite.js): Added Tests E4.8 and E4.9 covering F-04 and F-05 in the integration harness.
5. [`phase8-7-4-controlled-staging-rehearsal-plan.md`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/phase8-7-4-controlled-staging-rehearsal-plan.md): Updated with hardened rollback rules, endpoint classifications, and gate prerequisites.
6. [`phase8-7-4a-planning-remediation-report.md`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/phase8-7-4a-planning-remediation-report.md): Official Phase 8.7.4A remediation report.

---

### 3. F-04 & F-05 Remediation Details

#### A. F-04 — PostgreSQL Target Path & SSL Validation
In `backend/scripts/migration/production_cdc_relay_worker.js`:
```javascript
// Strict Database Path Check for PostgreSQL (/postgres)
const pgPath = parsedPg.pathname ? parsedPg.pathname.replace(/^\//, '').split('?')[0] : '';
if (pgPath !== 'postgres') {
  throw new Error(`CRITICAL_SAFETY_ABORT: PostgreSQL database path must be 'postgres'. Got: '${pgPath}'`);
}

// Require TLS (sslmode=require or verify-full) on remote staging & reject insecure/disable
const sslmode = parsedPg.searchParams.get('sslmode');
if (pgHost !== 'localhost' && pgHost !== '127.0.0.1') {
  if (sslmode !== 'require' && sslmode !== 'verify-full') {
    throw new Error(`CRITICAL_SAFETY_ABORT: Remote staging PostgreSQL requires sslmode=require or sslmode=verify-full.`);
  }
}
if (sslmode === 'disable' || sslmode === 'allow' || sslmode === 'prefer' || parsedPg.searchParams.get('ssl') === 'false') {
  throw new Error(`CRITICAL_SAFETY_ABORT: Insecure SSL configuration rejected in PostgreSQL target URI.`);
}
```
*TLS Evaluation Note:* While `sslmode=require` encrypts traffic, it does not verify server identity against CA roots. In production-like staging, `sslmode=verify-full` is the target standard, requiring the Supabase CA certificate bundle (`sslrootcert`) to be supplied.

#### B. F-05 — MongoDB Insecure TLS Policy in Index Script
In `backend/scripts/migration/04_staging_mongo_cdc_indexes.js`:
```javascript
// Reject Insecure TLS / SSL Parameters in MongoDB URI
const searchParams = parsed.searchParams;
if (
  searchParams.get('tlsInsecure') === 'true' ||
  searchParams.get('sslInsecure') === 'true' ||
  searchParams.get('tlsAllowInvalidCertificates') === 'true' ||
  searchParams.get('tlsAllowInvalidHostnames') === 'true' ||
  searchParams.get('ssl') === 'false'
) {
  throw new Error('CRITICAL_SAFETY_ABORT: Insecure TLS parameter detected in MongoDB target URI.');
}
```

---

### 4. Rollback Safety Hardening

The rehearsal runbook was updated to eliminate table-level truncation risks:
1. **Universal Proscription Against TRUNCATE:** `TRUNCATE TABLE` is strictly prohibited on shared staging tables. Cleanup operations must execute scoped `DELETE FROM ... WHERE company_id = '00000000-0000-0000-0000-000000000001'`.
2. **Pre-Cleanup Verification Gate:** Prior to deleting records, the cleanup script must verify that all target records possess the synthetic tenant ID. If any record with `company_id IS NULL` or an untracked tenant ID is found, cleanup halts immediately with `CLEANUP_BLOCKED_UNSCOPED_DATA_RISK`.
3. **Outbox Preservation:** `_reverse_sync_outbox` rows generated during rehearsal must not be purged until reconciliation and forensic audits are completed and signed off.
4. **Failure State Recovery:** In-flight events are allowed 30 seconds to drain or expire; stale workers are prevented from updating outbox status via lease checks (`worker_id = $2`); MongoDB tombstones generated during test runs are explicitly pruned via scoped ledger queries.

---

### 5. Target Identity & Environment Status Review

| Target Resource / Identifier | Documented Value | Classification | Review Finding & Pre-Gate Action |
|---|---|---|---|
| **MongoDB Staging Host** | `staging-cluster.internal:27017` | **UNVERIFIED** | Planning placeholder. No live DNS resolution was attempted. Infrastructure team must document authoritative internal DNS before Gate 1. |
| **PostgreSQL Staging Host** | `aws-0-ap-northeast-1.pooler.supabase.com` | **VERIFIED** | Matches documented Supabase staging pooler endpoint. |
| **PostgreSQL Staging DB** | `/postgres` | **VERIFIED** | Matches documented Supabase staging database path; enforced in code. |
| **MongoDB Staging DB** | `/tatalora_staging` | **VERIFIED** | Strictly enforced in relay worker and index script. |
| **Synthetic Tenant UUID** | `00000000-0000-0000-0000-000000000001` | **UNVERIFIED** | Reserved in test code. Must be verified against live staging catalog prior to Gate 2 to ensure zero collision. |
| **Ed25519 Recreate Key** | Ephemeral Keypair | **VERIFIED** | Generated ephemerally per test run; zero shared secrets. |

---

### 6. Offline Regression Test Output

Two test suites were executed offline:

#### A. Expanded Unit Test Suite (`test_production_cdc_relay.unit.js`)
```text
Command: node backend/scripts/migration/test_production_cdc_relay.unit.js
Exit Code: 0
```
```text
====================================================================
TATALORA ERP — PHASE 8.7.3B: OFFLINE CDC RELAY UNIT TESTS
====================================================================

[PASS] Test 1a: Worker is initially disconnected
[PASS] Test 1b: Worker is initially dormant (not polling)
[PASS] Test 2: Rejects targetEnv="production" with safety abort
[PASS] Test 3: Rejects empty URI configuration
[PASS] Test 4: Rejects host outside approved allowlist
[PASS] Test 5: All production URI signatures rejected by target policy
[PASS] Test 6: URI passwords are redacted cleanly
[PASS] Test 7a: Identical inputs produce identical fingerprints
[PASS] Test 7b: Different entity versions produce distinct fingerprints
[PASS] Test 8: Valid canonical Ed25519 token verifies successfully
[PASS] Test 9: Forged signature is strictly rejected
[PASS] Test 10: Replay against different record ID rejected
[PASS] Test 11: Replay against different model rejected
[PASS] Test 12: Environment mismatch rejected
[PASS] Test 13: Expired token is rejected
[PASS] Test 14: Token attempting to supersede newer tombstone is rejected
[PASS] Test 15: Missing nonce is rejected as malformed
[PASS] Test 16: Acknowledge verifies worker lease ownership ($2 = worker_id)
[PASS] Test 17a: HARD_DELETE marks document as tombstone
[PASS] Test 17b: Mutation against tombstone is rejected
[PASS] Test 17c: Authorized RECREATE successfully resurrects entity
[PASS] Test 17d: Entity is active again (_is_deleted === false)
[PASS] Test 17e: First use of tokenV2 succeeds
[PASS] Test 17f: Reused nonce correctly rejected with NONCE_REPLAY_REJECTED
[PASS] Test 18: Rejects database name other than tatalora_staging
[PASS] Test 19: Rejects tlsInsecure parameter
[PASS] Test 20: Rejects HTTP protocol for MongoDB
[PASS] Test 21: Valid Supabase pooler PostgreSQL URI accepted
[PASS] Test 22: Rejects sslmode=disable
[PASS] Test 23: Rejects unapproved PostgreSQL host
[PASS] Test 24: Index script validator accepts valid staging URI
[PASS] Test 25: Index script validator rejects wrong DB, unknown host, and production signature
[PASS] Test 26: Rejects PostgreSQL database path other than /postgres
[PASS] Test 27: Rejects all insecure PostgreSQL sslmode settings (disable, allow, prefer)
[PASS] Test 28: Index script validator rejects all insecure MongoDB TLS parameters

====================================================================
TEST SUMMARY: 35 PASSED, 0 FAILED
====================================================================
```

#### B. Comprehensive Offline Integration Harness (`offline_integration_test_suite.js`)
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
[PASS] E4.8: PostgreSQL URI with non-/postgres database path rejected
[PASS] E4.9: Index provisioning gatekeeper rejects insecure TLS parameters

====================================================================
INTEGRATION HARNESS SUMMARY: 34 PASSED, 0 FAILED
====================================================================
```

---

### 7. Findings & Status Classification Matrix

| Item | Classification | Notes |
|---|---|---|
| **F-01: Child Table Tenant Resolution (29 tables)** | **VERIFIED** | All 29 tables mapped; universal exception in 03 draft SQL verified. |
| **F-02: Relay Worker Host Allowlist & Production Regex** | **VERIFIED** | Tested via unit & integration suites. |
| **F-03: Index Script Allowlist Enforcement** | **VERIFIED** | Tested via unit & integration suites. |
| **F-04: PostgreSQL Database Path Enforcement (/postgres)** | **FIXED** | Implemented and verified via Unit Test 26 & Harness E4.8. |
| **F-05: MongoDB Index Script Insecure TLS Parameter Rejection** | **FIXED** | Implemented and verified via Unit Test 28 & Harness E4.9. |
| **ENV-01: Staging MongoDB Host Identity (`staging-cluster.internal`)** | **UNVERIFIED** | Planning placeholder. Must be confirmed prior to Gate 1. |
| **ENV-02: Synthetic Tenant ID Collision Check** | **UNVERIFIED** | Reserved in code; must be confirmed against staging DB prior to Gate 2. |
| **RUNBOOK-01: Scoped Cleanup Protocol** | **VERIFIED** | TRUNCATE prohibited; scoped DELETE and pre-cleanup verification enforced. |

---

### 8. Official Recommendation & Next Actions

1. **Gate Status:**
   - **STATUS:** **`PLANNING COMPLETE — GATE 1 PENDING`**
   - No rehearsal execution, database modification, or network requests are permitted.
2. **Action Prior to Gate 1 Authorization:**
   - Infrastructure engineering must provide authoritative internal DNS configuration to resolve `ENV-01`.
   - Security team must verify CA certificate bundling to support `sslmode=verify-full`.
