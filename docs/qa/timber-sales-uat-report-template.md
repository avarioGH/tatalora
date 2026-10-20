# TIMBER SALES UAT REPORT (CONNECTED QA)

## Tester: _________________
## Date: ___________________
## Environment: ____________

| TEST | EXPECTED | ACTUAL | EXECUTION TYPE | STATUS | EVIDENCE |
|------|----------|--------|----------------|--------|----------|
| DB Check | Pass | | | | |
| Seed UAT Data | 100 PCS Stock | | | | |
| Create Order | Order Created | | | | |
| Confirm Order | Status Confirmed | | | | |
| Partial Delivery | 20 PCS Deducted | | | | |
| Full Delivery | 100% Fulfilled | | | | |
| Duplicate POST | Blocked | | | | |
| Rollback | Atomic Rejection | | | | |
| Concurrency | Safe, no double spend | | | | |
| Insufficient Stock | Blocked | | | | |
| Over Fulfillment | Blocked | | | | |
| Cancellation | Reversal Movement | | | | |
| Negative Stock | Blocked | | | | |
| Stock Card | Correct sequence | | | | |
| Traceability | Provenance linked | | | | |
| Excel Parity | Matches monitor (2) | | | | |
| M3 Calculation | Exact precision | | | | |
| Authorization | Protected routes | | | | |
| AuditLog | Immutable tracking | | | | |
| Performance | Loaded < 2s | | | | |

*Execution types allowed: ACTUALLY EXECUTED, STATICALLY VERIFIED, NOT TESTED — ENVIRONMENT LIMITATION, NOT TESTED — FEATURE INCOMPLETE, NOT MEASURED — INSUFFICIENT DATASET*
