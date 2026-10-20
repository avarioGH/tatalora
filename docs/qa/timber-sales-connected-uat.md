# TIMBER SALES CONNECTED QA RUNBOOK

## A. Environment Prerequisites
1. Node.js v18+ installed.
2. A safe, connected **Staging** or **UAT** environment.
3. Network access to the Staging MongoDB cluster.

## B. Required Environment Variables
Ensure your `.env` file contains:
- `DATABASE_URL` pointing to the staging database.
- `JWT_SECRET` (matching staging auth).
- No production credentials.

## C. Database Connectivity Check
Run:
`npx ts-node scripts/qa/check-staging-db.ts`
Expected: `✅ DB CONNECTION: PASS`

## D. Authentication Requirements
You must have a user account with permissions for Sales, Inventory, and Ledger operations.

## E. Test Customer Setup
Find a test customer with code `UAT-CUST-*` or create one manually via the UI. Do not mutate historical company customers.

## F. Test Stock Setup
Execute the seed script to safely inject 100 PCS of UAT stock via the `InventoryLedgerService`.
`npx ts-node scripts/qa/seed-timber-sales-uat.ts`

## Automated API Tests
Run the automated test suite against the live staging API:
`npx jest tests/uat/timber-sales/`

The suite covers:
- H. Sales Order test
- I. Confirmation test
- J. Partial delivery test
- K. Full delivery test
- L. Duplicate POST test
- M. Rollback test
- N. Concurrency test
- O. Insufficient stock test
- P. Over-fulfillment test
- Q. Negative stock test
- R. Cancellation/reversal

## Manual / Frontend Tests
Login to the frontend UI.
1. Navigate to `/sales/timber/orders`
2. Perform visually: S. Stock Card verification, T. Traceability verification, U. Excel parity against `monitor update (2)`.
3. V. M3 Verification: Ensure frontend displays match the exact calculation: `Thickness * Width * Length * Qty / 1,000,000,000`.
4. W. Authorization: Log in as an unauthorized user and attempt to create an order (Expected: 403 Forbidden).
5. X. AuditLog: Verify all actions created logs in `/monitoring/audit-log`.
6. Y. Performance: Note loading times for the lists.

## Z. Cleanup
Remove or isolate records prefixed with `UAT-TS-*`. Do NOT drop collections. Do NOT reset the database.
