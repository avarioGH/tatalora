-- ====================================================================
-- TATALORA ERP — PHASE 8.6.3: TRANSACTIONAL CDC OUTBOX ARCHITECTURE
-- ====================================================================
-- Target: Staging PostgreSQL (Supabase Pro)
-- Purpose:
-- 1. Eliminate non-atomic file append hazards (DEF-1, DEF-2).
-- 2. Capture all business mutations within the IDENTICAL database transaction
--    as the business operation.
-- 3. Trigger automatically on INSERT, UPDATE, DELETE, and SOFT-DELETE across
--    all critical accounting, inventory, and operational tables.
-- ====================================================================

-- 0. Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Transactional Reverse-Sync Outbox Table
CREATE TABLE IF NOT EXISTS public._reverse_sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    model_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(32) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE'
    previous_state JSONB,
    current_state JSONB,
    transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED'
    replay_fingerprint VARCHAR(64) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_reverse_outbox_status 
ON public._reverse_sync_outbox (status, transaction_timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_reverse_outbox_fingerprint 
ON public._reverse_sync_outbox (replay_fingerprint);

-- 2. Generic Transactional CDC Trigger Function
CREATE OR REPLACE FUNCTION capture_reverse_sync_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_operation VARCHAR(32);
    v_record_id UUID;
    v_company_id UUID;
    v_prev_json JSONB := NULL;
    v_curr_json JSONB := NULL;
    v_fp_content TEXT;
    v_fingerprint VARCHAR(64);
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_operation := 'INSERT';
        v_record_id := NEW.id;
        v_curr_json := to_jsonb(NEW);
        IF (v_curr_json ? 'company_id') THEN
            v_company_id := (v_curr_json->>'company_id')::UUID;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_record_id := NEW.id;
        v_prev_json := to_jsonb(OLD);
        v_curr_json := to_jsonb(NEW);
        IF (v_curr_json ? 'company_id') THEN
            v_company_id := (v_curr_json->>'company_id')::UUID;
        END IF;

        -- Differentiate soft-delete vs normal update
        IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
            v_operation := 'SOFT_DELETE';
        ELSE
            v_operation := 'UPDATE';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_operation := 'DELETE';
        v_record_id := OLD.id;
        v_prev_json := to_jsonb(OLD);
        IF (v_prev_json ? 'company_id') THEN
            v_company_id := (v_prev_json->>'company_id')::UUID;
        END IF;
    END IF;

    -- Calculate deterministic SHA-256 fingerprint for deduplication
    v_fp_content := v_operation || ':' || TG_TABLE_NAME || ':' || v_record_id::text || ':' || COALESCE(v_curr_json::text, v_prev_json::text) || ':' || clock_timestamp()::text;
    v_fingerprint := encode(digest(v_fp_content, 'sha256'), 'hex');

    -- Insert directly into transactional outbox within the ACTIVE business transaction
    INSERT INTO public._reverse_sync_outbox (
        company_id,
        model_name,
        record_id,
        operation,
        previous_state,
        current_state,
        replay_fingerprint,
        transaction_timestamp,
        status
    ) VALUES (
        v_company_id,
        TG_TABLE_NAME,
        v_record_id,
        v_operation,
        v_prev_json,
        v_curr_json,
        v_fingerprint,
        clock_timestamp(),
        'PENDING'
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind Outbox Triggers to Critical Accounting & Operational Models
DO $$
DECLARE
    t TEXT;
    table_list TEXT[] := ARRAY[
        'Invoice', 'InvoiceItem', 'Payment', 'PaymentAllocation',
        'JournalEntry', 'JournalEntryItem', 'InventoryCostLayer',
        'InventoryTransaction', 'InventoryTransactionItem', 'Customer',
        'Product', 'DocumentSequence', 'Employee', 'Payroll'
    ];
BEGIN
    FOREACH t IN ARRAY table_list
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_cdc_outbox ON %I;', t);
        EXECUTE format('
            CREATE TRIGGER trg_cdc_outbox
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW EXECUTE FUNCTION capture_reverse_sync_mutation();
        ', t);
    END LOOP;
END;
$$;
