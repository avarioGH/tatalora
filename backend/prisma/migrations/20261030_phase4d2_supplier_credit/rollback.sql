-- Rollback Migration: 20261030_phase4d2_supplier_credit_down
-- Safe, non-destructive rollback for local development / testing

DROP TABLE IF EXISTS "SupplierCreditRefund" CASCADE;
DROP TABLE IF EXISTS "SupplierCreditApplication" CASCADE;
DROP TABLE IF EXISTS "SupplierCreditNote" CASCADE;
