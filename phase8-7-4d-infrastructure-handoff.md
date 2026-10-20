# TATALORA ERP — PHASE 8.7.4D
## Formal Infrastructure Handoff Request: Isolated Staging MongoDB Cluster

> **DATE:** 2026-10-17  
> **TO:** Cloud Infrastructure Lead / DevOps Lead  
> **FROM:** Autonomous Migration Safety Auditor (Antigravity Core)  
> **SUBJECT:** Prerequisite Infrastructure Confirmation for CDC Staging Sandbox Rehearsal (Gate 1)  
> **CURRENT STATUS:** **BLOCKED — INFRASTRUCTURE CONFIRMATION REQUIRED**  
> **SECURITY DIRECTIVE:** DO NOT TRANSMIT PASSWORDS, PRIVATE KEYS, OR FULL CONNECTION STRINGS IN THIS DOCUMENT OR VIA UNENCRYPTED CHANNELS.

---

### 1. Purpose of Request

To unblock **Gate 1** (Preparation of Isolated Staging Resources) for the TATALORA ERP PostgreSQL CDC migration rehearsal, the database engineering and safety auditing teams require formal, written confirmation of the dedicated MongoDB Staging Cluster parameters.

All local application code, Prisma PostgreSQL schemas (186 models), fail-closed CDC triggers (107 operational tables and 29 child tables), and offline integration test harnesses (37 unit tests and 34 integration harness tests passing at 100%) are fully prepared and hardened. However, the relay worker and MongoDB index provisioning scripts strictly enforce target allowlists and will abort execution until an authoritative endpoint is verified.

---

### 2. Required Infrastructure Specifications

Please review and confirm each of the following 9 technical parameters:

```
+---------------------------------------------------------------------------------------------------+
| PARAMETER SPECIFICATION & CONSTRAINTS                                                             |
+----+----------------------------------+-----------------------------------------------------------+
| #  | Parameter                        | Requirement / Safety Constraint                           |
+----+----------------------------------+-----------------------------------------------------------+
| 1. | Official Hostname & Port         | FQDN or internal cluster host and port (e.g. 27017).      |
|    |                                  | MUST NOT contain production keywords ('prod', 'live').     |
| 2. | Dedicated Database Name          | MUST be strictly 'tatalora_staging'.                      |
|    |                                  | (Validator strictly rejects any other database path).     |
| 3. | Topology & Version               | MongoDB 6.0+ with Replica Set enabled.                    |
|    |                                  | (Required for Multi-Document ACID Transactions).          |
| 4. | Service Account & Least-Privilege Access | - Gunakan service account khusus untuk staging, terpisah dari akun produksi. |
|    |                                  | - Batasi akses ke database tatalora_staging.              |
|    |                                  | - Berikan readWrite hanya jika diperlukan oleh operasi relay. |
|    |                                  | - Berikan hak pembuatan indeks atau administrasi database  |
|    |                                  |   hanya kepada akun migrasi terpisah, jika diperlukan.     |
|    |                                  | - Dilarang memberikan hak cluster-wide, akses ke database  |
|    |                                  |   produksi, atau privilege lintas database.                |
|    |                                  | - Konfirmasikan hak akses aktual melalui dokumentasi      |
|    |                                  |   infrastruktur dan review konfigurasi sebelum Gate 1      |
|    |                                  |   disetujui.                                              |
| 5. | TLS & Certificate Verification   | TLS/SSL wajib diaktifkan (ssl=true/tls=true).              |
|    |                                  | Wajib memverifikasi sertifikat server dan hostname sesuai  |
|    |                                  | kemampuan driver MongoDB, dengan CA tepercaya yang         |
|    |                                  | dikonfigurasi bila diperlukan (menyediakan CA root bundle).|
|    |                                  | Semua opsi yang menonaktifkan validasi sertifikat atau     |
|    |                                  | hostname (tlsInsecure, sslInsecure,                       |
|    |                                  | tlsAllowInvalidCertificates, tlsAllowInvalidHostnames)     |
|    |                                  | secara ketat DITOLAK.                                      |
| 6. | Production Isolation Confirmation| Explicit confirmation of physical or logical air-gap from |
|    |                                  | MongoDB Atlas Production (zero shared disks or VPC leaks).|
| 7. | Customer Data Sanitization       | Confirmation that ZERO live customer or production data   |
|    |                                  | exists on this staging cluster.                           |
| 8. | Secret Management Mechanism      | Mechanism for injecting STAGING_MONGODB_URI (e.g., AWS    |
|    |                                  | Secrets Manager, Doppler, Vault, or CI/CD masked secret). |
| 9. | Operational Ownership            | Designated DevOps / DBA owner responsible for staging     |
|    |                                  | snapshotting, backup restore, and emergency reset.        |
+----+----------------------------------+-----------------------------------------------------------+
```

---

### 3. Formal Infrastructure Confirmation Signoff Form

*(To be completed and signed by the Cloud Infrastructure Lead)*

```
-----------------------------------------------------------------------------------------------------
[ ] 1. Hostname & Port:
       Confirmed Host: _________________________________________________
       Confirmed Port: _________________________________________________

[ ] 2. Staging Database Name:
       Confirmed Database: tatalora_staging

[ ] 3. Topology:
       Replica Set Name: _______________________________________________
       Engine Version:   MongoDB v_______ (v6.0+ Verified: [ ] Yes)

[ ] 4. Service Account & Least-Privilege Access:
       Relay Service Account:
         Username:         _______________________________________________
         Assigned Role:    readWrite (tatalora_staging) ONLY
       Migration Admin Account (if separate):
         Username:         _______________________________________________
         Assigned Roles:   dbAdmin (tatalora_staging) / Index Provisioning
       Cluster Admin Privileges: [ ] None (Strictly Scoped)
       Cross-Database Privileges: [ ] None (Access to admin/production forbidden)

[ ] 5. TLS & Certificate Verification:
       TLS Enforced:     [ ] Yes
       Certificate Validation:
         Server Certificate Validation: [ ] Enabled (Rejection of invalid certs)
         Hostname Validation:           [ ] Enabled (tlsAllowInvalidHostnames forbidden)
       CA Certificate:   [ ] Public Trusted CA  /  [ ] Internal CA (Root bundle provided)
       Insecure TLS Bypass Flags: [ ] Disabled (tlsInsecure/sslInsecure forbidden)

[ ] 6. Production Air-Gap Certification:
       "I hereby certify that the MongoDB staging instance above is completely isolated from 
        the live production MongoDB Atlas cluster, shares no storage volumes, and has no 
        network bridging to production write endpoints."
       Verified: [ ] Yes

[ ] 7. Data Sanitization Certification:
       "I hereby certify that the staging database 'tatalora_staging' contains zero production 
        customer records, and is dedicated exclusively for synthetic seed testing."
       Verified: [ ] Yes

[ ] 8. Secret Management Injection:
       Secret Store / Path: ____________________________________________
       Environment Variable Key: STAGING_MONGODB_URI

[ ] 9. Operational Incident & Recovery Owner:
       Primary Owner:    _______________________________________________
       Contact Channel:  _______________________________________________
       Escalation DBA:   _______________________________________________

Signature:  _____________________________________
Full Name:  _____________________________________
Role/Title: Cloud Infrastructure Lead
Date:       _____________________________________
-----------------------------------------------------------------------------------------------------
```

---

### 4. Target Identity Policy Integration

Once the formal signoff above is received:
1. The confirmed hostname will be added to `STAGING_HOST_ALLOWLIST` in `backend/scripts/migration/production_cdc_relay_worker.js`.
2. The secret path will be populated into `backend/.env.staging` via the designated secret-manager runner.
3. Offline regression tests will be re-run to verify allowlist acceptance.
4. Gate 1 review will be submitted for formal authorization.

> [!WARNING]
> No database connections will be attempted, and Gate 1 will remain **BLOCKED** until this signed handoff is returned.
