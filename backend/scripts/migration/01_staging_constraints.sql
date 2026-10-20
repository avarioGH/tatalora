-- ====================================================================
-- TATALORA ERP — PHASE 8.2: STAGING POSTGRESQL CONSTRAINTS & MIGRATION SQL
-- ====================================================================
-- Target: Supabase Pro Managed PostgreSQL Staging Database
-- Execution Mode: Version-Controlled, Idempotent DDL & Constraints
-- ====================================================================

-- 1. Persistent Resumable ID Mapping Table
CREATE TABLE IF NOT EXISTS public._migration_id_map (
    source_model VARCHAR(64) NOT NULL,
    source_object_id VARCHAR(24) NOT NULL,
    destination_uuid UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED', 
    -- Status progression: 'RESERVED' -> 'INSERTED' -> 'VALIDATED' -> 'COMPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pk_migration_id_map PRIMARY KEY (source_model, source_object_id),
    CONSTRAINT uq_migration_dest_uuid UNIQUE (destination_uuid)
);

CREATE INDEX IF NOT EXISTS idx_migration_status_lookup 
ON public._migration_id_map (source_model, status);

CREATE INDEX IF NOT EXISTS idx_migration_dest_lookup 
ON public._migration_id_map (destination_uuid);

-- 2. Deferred Journal Balance Constraint Trigger Function
CREATE OR REPLACE FUNCTION verify_journal_balance_at_commit()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_debit_total NUMERIC(18, 2);
    v_credit_total NUMERIC(18, 2);
    v_target_journals UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Track affected journal IDs based on DML action
    IF (TG_OP = 'INSERT') THEN
        v_target_journals := ARRAY[NEW.journal_entry_id];
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.journal_entry_id = NEW.journal_entry_id) THEN
            v_target_journals := ARRAY[NEW.journal_entry_id];
        ELSE
            -- Line transfer between journals: validate BOTH journals
            v_target_journals := ARRAY[OLD.journal_entry_id, NEW.journal_entry_id];
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_target_journals := ARRAY[OLD.journal_entry_id];
    END IF;

    -- Evaluate balance for each affected journal within the transaction commit snapshot
    FOREACH v_journal_id IN ARRAY v_target_journals
    LOOP
        IF EXISTS (SELECT 1 FROM "JournalEntry" WHERE id = v_journal_id) THEN
            SELECT 
                COALESCE(SUM(debit), 0),
                COALESCE(SUM(credit), 0)
            INTO v_debit_total, v_credit_total
            FROM "JournalEntryItem"
            WHERE journal_entry_id = v_journal_id;

            IF v_debit_total != v_credit_total THEN
                RAISE EXCEPTION 'Double-entry balance violation on Journal %: Total Debits (Rp %) != Total Credits (Rp %)', 
                    v_journal_id, v_debit_total, v_credit_total;
            END IF;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Bind as Constraint Trigger on JournalEntryItem
DROP TRIGGER IF EXISTS trg_defer_journal_balance ON "JournalEntryItem";
CREATE CONSTRAINT TRIGGER trg_defer_journal_balance
AFTER INSERT OR UPDATE OR DELETE ON "JournalEntryItem"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verify_journal_balance_at_commit();

-- 3. Partial Unique Indexes for Soft-Deleted Records
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_invoice_number 
ON "Invoice" (company_id, invoice_number) 
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_payment_number 
ON "Payment" (company_id, payment_number) 
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cash_account_code 
ON "CashAccount" (company_id, code) 
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_customer_email 
ON "Customer" (company_id, email) 
WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_sales_order_number 
ON "SalesOrder" (company_id, order_number) 
WHERE deleted_at IS NULL;

-- 4. Composite Foreign Keys for Tenant-Level Engine Integrity
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS uq_customer_tenant;
ALTER TABLE "Customer" ADD CONSTRAINT uq_customer_tenant UNIQUE (company_id, id);

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS fk_invoice_customer_tenant;
ALTER TABLE "Invoice" ADD CONSTRAINT fk_invoice_customer_tenant 
FOREIGN KEY (company_id, customer_id) REFERENCES "Customer"(company_id, id) ON DELETE RESTRICT;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS uq_invoice_tenant;
ALTER TABLE "Invoice" ADD CONSTRAINT uq_invoice_tenant UNIQUE (company_id, id);

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS fk_payment_invoice_tenant;
ALTER TABLE "Payment" ADD CONSTRAINT fk_payment_invoice_tenant 
FOREIGN KEY (company_id, invoice_id) REFERENCES "Invoice"(company_id, id) ON DELETE RESTRICT;

ALTER TABLE "CashAccount" DROP CONSTRAINT IF EXISTS uq_cash_account_tenant;
ALTER TABLE "CashAccount" ADD CONSTRAINT uq_cash_account_tenant UNIQUE (company_id, id);

ALTER TABLE "FinanceTransaction" DROP CONSTRAINT IF EXISTS fk_ft_cash_account_tenant;
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT fk_ft_cash_account_tenant 
FOREIGN KEY (company_id, cash_account_id) REFERENCES "CashAccount"(company_id, id) ON DELETE RESTRICT;

ALTER TABLE "Warehouse" DROP CONSTRAINT IF EXISTS uq_warehouse_tenant;
ALTER TABLE "Warehouse" ADD CONSTRAINT uq_warehouse_tenant UNIQUE (company_id, id);

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS uq_product_tenant;
ALTER TABLE "Product" ADD CONSTRAINT uq_product_tenant UNIQUE (company_id, id);

ALTER TABLE "WarehouseStock" DROP CONSTRAINT IF EXISTS fk_stock_warehouse_tenant;
ALTER TABLE "WarehouseStock" ADD CONSTRAINT fk_stock_warehouse_tenant 
FOREIGN KEY (company_id, warehouse_id) REFERENCES "Warehouse"(company_id, id) ON DELETE RESTRICT;

ALTER TABLE "WarehouseStock" DROP CONSTRAINT IF EXISTS fk_stock_product_tenant;
ALTER TABLE "WarehouseStock" ADD CONSTRAINT fk_stock_product_tenant 
FOREIGN KEY (company_id, product_id) REFERENCES "Product"(company_id, id) ON DELETE RESTRICT;
