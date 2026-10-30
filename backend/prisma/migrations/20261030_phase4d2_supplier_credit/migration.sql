-- Migration: 20261030_phase4d2_supplier_credit
-- Module: Purchasing & Accounts Payable
-- Description: Dedicated Supplier Credit Note, Credit Application, and Supplier Refund schemas

-- 1. Create SupplierCreditNote Table
CREATE TABLE IF NOT EXISTS "SupplierCreditNote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "purchase_return_id" UUID,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining_credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCreditNote_pkey" PRIMARY KEY ("id")
);

-- Unique & Index constraints for SupplierCreditNote
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierCreditNote_company_id_credit_note_number_key" 
ON "SupplierCreditNote"("company_id", "credit_note_number");

CREATE INDEX IF NOT EXISTS "SupplierCreditNote_company_id_supplier_id_idx" 
ON "SupplierCreditNote"("company_id", "supplier_id");

-- Foreign key constraints for SupplierCreditNote
ALTER TABLE "SupplierCreditNote" 
DROP CONSTRAINT IF EXISTS "SupplierCreditNote_purchase_return_id_fkey";

ALTER TABLE "SupplierCreditNote" 
ADD CONSTRAINT "SupplierCreditNote_purchase_return_id_fkey" 
FOREIGN KEY ("purchase_return_id") REFERENCES "PurchaseReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- 2. Create SupplierCreditApplication Table
CREATE TABLE IF NOT EXISTS "SupplierCreditApplication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "vendor_bill_id" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "idempotency_key" TEXT,
    "reversal_reason" TEXT,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" UUID,
    "applied_by" UUID,

    CONSTRAINT "SupplierCreditApplication_pkey" PRIMARY KEY ("id")
);

-- Index constraints for SupplierCreditApplication
CREATE INDEX IF NOT EXISTS "SupplierCreditApplication_company_id_credit_note_id_idx" 
ON "SupplierCreditApplication"("company_id", "credit_note_id");

CREATE INDEX IF NOT EXISTS "SupplierCreditApplication_company_id_vendor_bill_id_idx" 
ON "SupplierCreditApplication"("company_id", "vendor_bill_id");

-- Foreign key constraints for SupplierCreditApplication
ALTER TABLE "SupplierCreditApplication" 
DROP CONSTRAINT IF EXISTS "SupplierCreditApplication_credit_note_id_fkey";

ALTER TABLE "SupplierCreditApplication" 
ADD CONSTRAINT "SupplierCreditApplication_credit_note_id_fkey" 
FOREIGN KEY ("credit_note_id") REFERENCES "SupplierCreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 3. Create SupplierCreditRefund Table
CREATE TABLE IF NOT EXISTS "SupplierCreditRefund" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "refund_number" TEXT NOT NULL,
    "cash_account_id" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "refund_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "notes" TEXT,
    "idempotency_key" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCreditRefund_pkey" PRIMARY KEY ("id")
);

-- Unique & Index constraints for SupplierCreditRefund
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierCreditRefund_company_id_refund_number_key" 
ON "SupplierCreditRefund"("company_id", "refund_number");

CREATE INDEX IF NOT EXISTS "SupplierCreditRefund_company_id_credit_note_id_idx" 
ON "SupplierCreditRefund"("company_id", "credit_note_id");

-- Foreign key constraints for SupplierCreditRefund
ALTER TABLE "SupplierCreditRefund" 
DROP CONSTRAINT IF EXISTS "SupplierCreditRefund_credit_note_id_fkey";

ALTER TABLE "SupplierCreditRefund" 
ADD CONSTRAINT "SupplierCreditRefund_credit_note_id_fkey" 
FOREIGN KEY ("credit_note_id") REFERENCES "SupplierCreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
