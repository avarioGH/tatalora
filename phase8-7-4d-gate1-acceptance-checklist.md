# TATALORA ERP — PHASE 8.7.4D
## Gate 1 Acceptance Checklist & Configuration Validator

> **DATE:** 2026-10-17  
> **SCOPE:** GATE 1 VERIFICATION & PRE-APPROVAL AUDIT CHECKLIST  
> **CURRENT GATE 1 STATUS:** **BLOCKED — INFRASTRUCTURE CONFIRMATION REQUIRED**  
> **GOVERNING POLICY:** ZERO PRE-APPROVAL. ALL CRITERIA ARE STRICTLY MANDATORY.

---

### 1. Overview & Policy Objective

This checklist establishes the non-negotiable verification gates that must be satisfied before the System Architect, Security Officer, and Migration Lead can authorize **Gate 1** (Preparation of Isolated Staging Resources).

No hostname, URI, or configuration will be approved merely because it appears internal, looks like staging, or has a valid domain syntax. Every item must be backed by documented evidence and verified against local validator logic.

---

### 2. Part I — Configuration Acceptance Checklist

Before any received infrastructure configuration can be integrated, it must be validated against the technical criteria below:

```
+---------------------------------------------------------------------------------------------------+
| TECHNICAL CONFIGURATION CRITERIA                                                                  |
+----+--------------------------------+---------------------------------------------------+---------+
| #  | Verification Item              | Acceptance Constraint                             | Status  |
+----+--------------------------------+---------------------------------------------------+---------+
| 1. | Protocol Compliance            | Must be 'mongodb://' or 'mongodb+srv://'.         | PENDING |
|    |                                | Any HTTP, plain TCP, or malformed scheme rejected.|         |
+----+--------------------------------+---------------------------------------------------+---------+
| 2. | Production Keyword Blacklist   | Host, path, and credentials must NOT match regex: | PENDING |
|    |                                | /production/i, /prod/i, /tatalora-live/i,         |         |
|    |                                | /atlas-prod/i, or /cluster.mongodb.net\/erp_db/i. |         |
+----+--------------------------------+---------------------------------------------------+---------+
| 3. | Hostname Explicit Allowlisting | Exact hostname must be reviewed, documented, and  | PENDING |
|    |                                | added to STAGING_HOST_ALLOWLIST in worker.        |         |
|    |                                | Subdomain wildcarding forbidden without review.   |         |
+----+--------------------------------+---------------------------------------------------+---------+
| 4. | Exact Database Path Matching   | Pathname must equal strictly 'tatalora_staging'.  | PENDING |
|    |                                | Pathnames such as 'keuangan', 'test', 'erp_prod'  |         |
|    |                                | or empty paths ('/') are strictly rejected.       |         |
+----+--------------------------------+---------------------------------------------------+---------+
| 5. | Port Authorization             | Must use port 27017 or verified replica set port. | PENDING |
+----+--------------------------------+---------------------------------------------------+---------+
| 6. | TLS & Certificate Verification   | TLS must be enabled (ssl=true or tls=true).       | PENDING |
|    |                                  | Full server certificate & hostname verification   |         |
|    |                                  | enforced matching driver capabilities (CA bundle   |         |
|    |                                  | configured if needed). Insecure bypass flags      |         |
|    |                                  | (tlsInsecure, sslInsecure, tlsAllowInvalidCerts,  |         |
|    |                                  | tlsAllowInvalidHostnames, ssl=false) strictly      |         |
|    |                                  | rejected.                                         |         |
+----+--------------------------------+---------------------------------------------------+---------+
| 7. | Multi-Document Transaction Cap.| Replica Set topology confirmed. Driver session    | PENDING |
|    |                                | multi-document transactions supported natively.   |         |
+----+--------------------------------+---------------------------------------------------+---------+
| 8. | Least-Privilege RBAC           | Service account restricted strictly to            | PENDING |
|    |                                | 'tatalora_staging'. Relay account has readWrite   |         |
|    |                                | ONLY. dbAdmin/indexing granted only to separate   |         |
|    |                                | migration account if needed. Zero cluster-wide    |         |
|    |                                | or cross-database privileges.                     |         |
+----+--------------------------------+---------------------------------------------------+---------+
| 9. | Credential Redaction Test      | URI passes sanitizeUri() test without leaking user| PENDING |
|    |                                | or password in logs or stack traces.              |         |
+----+--------------------------------+---------------------------------------------------+---------+
```

---

### 3. Part II — Gate 1 Evidence Package Checklist

The complete approval package must contain both existing verified evidence and pending external confirmations:

```
+---------------------------------------------------------------------------------------------------+
| GATE 1 EVIDENCE AUDIT PACKAGE                                                                     |
+----+------------------------------------------+-----------------------------------------+---------+
| #  | Evidence Artifact                        | Location / Document Reference           | Status  |
+----+------------------------------------------+-----------------------------------------+---------+
| A. | Authoritative Infrastructure Doc         | Signed phase8-7-4d-infrastructure-      | PENDING |
|    |                                          | handoff.md from Cloud Lead              |         |
+----+------------------------------------------+-----------------------------------------+---------+
| B. | Production Isolation Certification       | Signed air-gap statement in handoff doc | PENDING |
+----+------------------------------------------+-----------------------------------------+---------+
| C. | Staging Access & RBAC Documentation      | Scoped service account definition       | PENDING |
+----+------------------------------------------+-----------------------------------------+---------+
| D. | Secret Injection Runner Design           | backend/.env.staging.template schema    | EXIST   |
|    |                                          | (Secret-manager placeholder pattern)    |         |
+----+------------------------------------------+-----------------------------------------+---------+
| E. | Target Allowlist Change Proposal         | Documented git diff adding confirmed    | PENDING |
|    |                                          | host to STAGING_HOST_ALLOWLIST          |         |
+----+------------------------------------------+-----------------------------------------+---------+
| F. | Offline Regression Test Output           | 37 Unit Tests & 34 Harness Tests passing| EXIST   |
|    |                                          | (test_production_cdc_relay.unit.js)     |         |
+----+------------------------------------------+-----------------------------------------+---------+
| G. | Cascading Cleanup & Recovery Plan        | phase8-7-4-controlled-staging-          | EXIST   |
|    |                                          | rehearsal-plan.md (Section 5)           |         |
+----+------------------------------------------+-----------------------------------------+---------+
| H. | Formal Gate 1 Authorization Record       | Final approval record signed by         | PENDING |
|    |                                          | Architect, Security, and QA Lead        |         |
+----+------------------------------------------+-----------------------------------------+---------+
```

---

### 4. Part III — Decision Matrix & Next Decision Workflow

```
+---------------------------------------------------------------------------------------------------+
| GATE 1 DECISION LOGIC                                                                             |
+---------------------------------------------------------------------------------------------------+
| IF all Part I Criteria (1-9) are VERIFIED:                                                        |
|   AND all Part II Evidence Artifacts (A-H) are COMPLETE:                                          |
|   THEN:                                                                                           |
|     Migration Lead issues formal GATE 1 APPROVAL.                                                 |
|     Infrastructure team provisions isolated staging databases.                                    |
|                                                                                                   |
| ELSE:                                                                                             |
|   CURRENT OFFICIAL STATUS REMAINS:                                                                |
|   >>> BLOCKED — INFRASTRUCTURE CONFIRMATION REQUIRED <<<                                         |
|                                                                                                   |
| FORBIDDEN ACTIONS WHILE BLOCKED:                                                                  |
| - DO NOT open network sockets or issue DNS lookups.                                               |
| - DO NOT execute staging connection tests.                                                        |
| - DO NOT execute DDL/DML, triggers, or index scripts.                                             |
| - DO NOT seed synthetic data.                                                                     |
| - DO NOT start the CDC relay worker.                                                              |
+---------------------------------------------------------------------------------------------------+
```

---

### 5. Responsible Stakeholder Roles

| Role | Assigned Responsibilities |
|---|---|
| **Cloud Infrastructure Lead** | Fill and sign [`phase8-7-4d-infrastructure-handoff.md`](file:///c:/Users/Billion/Downloads/workspace/TATALORA/phase8-7-4d-infrastructure-handoff.md); provision staging cluster. |
| **Security Officer** | Verify TLS configuration, secret-management runner, and production air-gap isolation. |
| **Lead Database Architect** | Verify schema parity, DDL triggers, allowlist diff, and sign Gate 1 authorization. |
| **Migration Safety Auditor** | Maintain dormancy, run offline regression suites, and verify checklist compliance. |
