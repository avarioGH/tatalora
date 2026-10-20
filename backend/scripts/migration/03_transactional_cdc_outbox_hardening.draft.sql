-- ====================================================================
-- TATALORA ERP — PHASE 8.7.2B: TRANSACTIONAL CDC OUTBOX HARDENING
-- ====================================================================
-- STATUS: DRAFT ARTIFACT — NOT APPLIED TO ANY DATABASE
-- Target: Supabase PostgreSQL (Staging Sandbox Only - Future Phase)
--
-- Features & Remediations:
-- 1. Explicit ALTER TABLE migrations for pre-existing _reverse_sync_outbox
-- 2. Strictly serial entity version ledger (_cdc_entity_lock)
-- 3. Persistent quarantine table (_cdc_quarantine) for isolated error handling
-- 4. Fail-closed parent ownership resolution for child tables
-- 5. Complete trigger installation loop across all 105 operational models
-- 6. Safe search_path and role-based migration bypass
-- ====================================================================

-- 0. Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Entity Version Locking Ledger
-- Ensures strict sequential version increment per entity across concurrent transactions.
CREATE TABLE IF NOT EXISTS public._cdc_entity_lock (
    model_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    current_version BIGINT NOT NULL DEFAULT 0,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (model_name, record_id)
);

-- 2. Backward-Aware Outbox Table Schema Migration
-- If table does not exist, create full baseline:
CREATE TABLE IF NOT EXISTS public._reverse_sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    company_id UUID,
    model_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    entity_version BIGINT NOT NULL DEFAULT 1,
    operation VARCHAR(32) NOT NULL, -- 'INSERT', 'UPDATE', 'SOFT_DELETE', 'HARD_DELETE'
    previous_state JSONB,
    current_state JSONB,
    transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_FLIGHT', 'PROCESSED', 'DEAD_LETTER'
    worker_id VARCHAR(64),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    attempt_count INT NOT NULL DEFAULT 0,
    dead_letter_reason TEXT,
    replay_fingerprint VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Backward-Aware Alterations (ensures pre-existing staging table receives new columns):
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS event_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS entity_version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS worker_id VARCHAR(64);
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS dead_letter_reason TEXT;
ALTER TABLE public._reverse_sync_outbox ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Unique index to guarantee event_id uniqueness in outbox
CREATE UNIQUE INDEX IF NOT EXISTS idx_reverse_outbox_event_id 
ON public._reverse_sync_outbox (event_id);

-- Partial index for high-performance worker batch claiming
CREATE INDEX IF NOT EXISTS idx_reverse_outbox_claim 
ON public._reverse_sync_outbox (transaction_timestamp ASC, id ASC)
WHERE status IN ('PENDING', 'IN_FLIGHT');

-- Entity history lookup index
CREATE INDEX IF NOT EXISTS idx_reverse_outbox_entity 
ON public._reverse_sync_outbox (model_name, record_id, entity_version ASC);

-- Deduplication index
CREATE INDEX IF NOT EXISTS idx_reverse_outbox_fingerprint 
ON public._reverse_sync_outbox (replay_fingerprint);

-- 3. Persistent Entity Quarantine Table
-- Prevents head-of-line blocking by holding stalled entities while independent entities continue.
CREATE TABLE IF NOT EXISTS public._cdc_quarantine (
    model_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT NOT NULL,
    last_event_id UUID NOT NULL,
    unquarantined_at TIMESTAMP WITH TIME ZONE,
    operator_notes TEXT,
    PRIMARY KEY (model_name, record_id)
);

-- 4. Hardened CDC Trigger Function
CREATE OR REPLACE FUNCTION public.capture_reverse_sync_mutation()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
    v_operation VARCHAR(32);
    v_record_id UUID;
    v_company_id UUID := NULL;
    v_prev_json JSONB := NULL;
    v_curr_json JSONB := NULL;
    v_entity_version BIGINT;
    v_fp_content TEXT;
    v_fingerprint VARCHAR(64);
    v_parent_id UUID;
BEGIN
    -- 4.1 Strict Role-Based Migration Mode Bypass
    IF current_setting('tatalora.migration_mode', true) = 'true' THEN
        IF NOT pg_has_role(SESSION_USER, 'tatalora_etl', 'MEMBER') THEN
            RAISE EXCEPTION 'SECURITY ALERT: Unauthorized attempt to bypass CDC outbox by user %', SESSION_USER
            USING ERRCODE = 'insufficient_privilege';
        END IF;
        IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 4.2 Determine Operation and JSON State
    IF (TG_OP = 'INSERT') THEN
        v_operation := 'INSERT';
        v_record_id := NEW.id;
        v_curr_json := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_record_id := NEW.id;
        v_prev_json := to_jsonb(OLD);
        v_curr_json := to_jsonb(NEW);
        
        -- Differentiate soft-delete vs normal update
        IF (v_prev_json ? 'deleted_at' AND (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)) THEN
            v_operation := 'SOFT_DELETE';
        ELSE
            v_operation := 'UPDATE';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_operation := 'HARD_DELETE';
        v_record_id := OLD.id;
        v_prev_json := to_jsonb(OLD);
    END IF;

    -- 4.3 Fail-Closed Tenant & Company Ownership Resolution
    IF (v_curr_json ? 'company_id' AND v_curr_json->>'company_id' IS NOT NULL) THEN
        v_company_id := (v_curr_json->>'company_id')::UUID;
    ELSIF (v_prev_json ? 'company_id' AND v_prev_json->>'company_id' IS NOT NULL) THEN
        v_company_id := (v_prev_json->>'company_id')::UUID;
    ELSIF (v_curr_json ? 'tenant_id' AND v_curr_json->>'tenant_id' IS NOT NULL) THEN
        v_company_id := (v_curr_json->>'tenant_id')::UUID;
    ELSIF (v_prev_json ? 'tenant_id' AND v_prev_json->>'tenant_id' IS NOT NULL) THEN
        v_company_id := (v_prev_json->>'tenant_id')::UUID;
    ELSE
        -- Authoritative Parent Foreign Key Lookup for Child Tables
        CASE TG_TABLE_NAME
            WHEN 'InvoiceItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'invoice_id', v_prev_json->>'invoice_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Invoice" WHERE id = v_parent_id;
            WHEN 'SalesOrderItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'sales_order_id', v_prev_json->>'sales_order_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."SalesOrder" WHERE id = v_parent_id;
            WHEN 'QuotationItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'quotation_id', v_prev_json->>'quotation_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Quotation" WHERE id = v_parent_id;
            WHEN 'DeliveryOrderItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'delivery_order_id', v_prev_json->>'delivery_order_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."DeliveryOrder" WHERE id = v_parent_id;
            WHEN 'PurchaseOrderItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'purchase_order_id', v_prev_json->>'purchase_order_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."PurchaseOrder" WHERE id = v_parent_id;
            WHEN 'GoodsReceiptItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'goods_receipt_id', v_prev_json->>'goods_receipt_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."GoodsReceipt" WHERE id = v_parent_id;
            WHEN 'ExpenseItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'expense_claim_id', v_prev_json->>'expense_claim_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."ExpenseClaim" WHERE id = v_parent_id;
            WHEN 'PurchaseRequestItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'purchase_request_id', v_prev_json->>'purchase_request_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."PurchaseRequest" WHERE id = v_parent_id;
            WHEN 'PayrollItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'payroll_id', v_prev_json->>'payroll_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Payroll" WHERE id = v_parent_id;
            WHEN 'PaymentAllocation' THEN
                v_parent_id := COALESCE(v_curr_json->>'payment_id', v_prev_json->>'payment_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Payment" WHERE id = v_parent_id;
            WHEN 'JournalEntryItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'journal_entry_id', v_prev_json->>'journal_entry_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."JournalEntry" WHERE id = v_parent_id;
            WHEN 'InventoryTransactionItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'transaction_id', v_prev_json->>'transaction_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."InventoryTransaction" WHERE id = v_parent_id;
            WHEN 'CostLayerConsumption' THEN
                v_parent_id := COALESCE(v_curr_json->>'cost_layer_id', v_prev_json->>'cost_layer_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."InventoryCostLayer" WHERE id = v_parent_id;
            WHEN 'StockTransfer' THEN
                v_parent_id := COALESCE(v_curr_json->>'fromLocationId', v_prev_json->>'fromLocationId')::UUID;
                SELECT company_id INTO v_company_id FROM public."Warehouse" WHERE id = v_parent_id;
            WHEN 'StockTransferItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'transferId', v_prev_json->>'transferId')::UUID;
                SELECT w.company_id INTO v_company_id 
                FROM public."StockTransfer" st 
                JOIN public."Warehouse" w ON st."fromLocationId" = w.id 
                WHERE st.id = v_parent_id;
            WHEN 'StockAdjustment' THEN
                v_parent_id := COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId')::UUID;
                SELECT company_id INTO v_company_id FROM public."Warehouse" WHERE id = v_parent_id;
            WHEN 'StockAdjustmentItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'adjustmentId', v_prev_json->>'adjustmentId')::UUID;
                SELECT w.company_id INTO v_company_id 
                FROM public."StockAdjustment" sa 
                JOIN public."Warehouse" w ON sa."locationId" = w.id 
                WHERE sa.id = v_parent_id;
            WHEN 'TimberPurchaseItem', 'TimberPurchaseLogItem', 'RawLog' THEN
                v_parent_id := COALESCE(v_curr_json->>'timberPurchaseId', v_curr_json->>'purchaseId', v_prev_json->>'timberPurchaseId', v_prev_json->>'purchaseId')::UUID;
                SELECT company_id INTO v_company_id FROM public."TimberPurchase" WHERE id = v_parent_id;
            WHEN 'TimberSalesOrder' THEN
                v_parent_id := COALESCE(v_curr_json->>'customerId', v_prev_json->>'customerId')::UUID;
                SELECT company_id INTO v_company_id FROM public."Customer" WHERE id = v_parent_id;
            WHEN 'TimberSalesOrderItem', 'TimberDeliveryNote' THEN
                v_parent_id := COALESCE(v_curr_json->>'salesOrderId', v_prev_json->>'salesOrderId')::UUID;
                SELECT c.company_id INTO v_company_id 
                FROM public."TimberSalesOrder" tso 
                JOIN public."Customer" c ON tso."customerId" = c.id 
                WHERE tso.id = v_parent_id;
            WHEN 'TimberDeliveryNoteItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'deliveryNoteId', v_prev_json->>'deliveryNoteId')::UUID;
                SELECT c.company_id INTO v_company_id 
                FROM public."TimberDeliveryNote" tdn 
                JOIN public."TimberSalesOrder" tso ON tdn."salesOrderId" = tso.id 
                JOIN public."Customer" c ON tso."customerId" = c.id 
                WHERE tdn.id = v_parent_id;
            WHEN 'InvoiceExchangeItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'exchange_id', v_prev_json->>'exchange_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."InvoiceExchange" WHERE id = v_parent_id;
            WHEN 'SalesReturnItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'sales_return_id', v_prev_json->>'sales_return_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."SalesReturn" WHERE id = v_parent_id;
            WHEN 'PurchaseReturnItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'purchase_return_id', v_prev_json->>'purchase_return_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."PurchaseReturn" WHERE id = v_parent_id;
            WHEN 'FinanceTransactionItem', 'FinanceDocument' THEN
                v_parent_id := COALESCE(v_curr_json->>'transaction_id', v_prev_json->>'transaction_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."FinanceTransaction" WHERE id = v_parent_id;
            WHEN 'NettingAllocation' THEN
                v_parent_id := COALESCE(v_curr_json->>'netting_id', v_prev_json->>'netting_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Netting" WHERE id = v_parent_id;
            WHEN 'InventoryDisposalItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'disposal_id', v_prev_json->>'disposal_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."InventoryDisposal" WHERE id = v_parent_id;
            WHEN 'StockTransformationInput', 'StockTransformationOutput' THEN
                v_parent_id := COALESCE(v_curr_json->>'transformation_id', v_prev_json->>'transformation_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."StockTransformation" WHERE id = v_parent_id;
            WHEN 'TimberShipmentItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'timberShipmentId', v_prev_json->>'timberShipmentId')::UUID;
                SELECT company_id INTO v_company_id FROM public."TimberShipment" WHERE id = v_parent_id;
            WHEN 'TimberStock' THEN
                v_parent_id := COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId')::UUID;
                SELECT company_id INTO v_company_id FROM public."Warehouse" WHERE id = v_parent_id;
            WHEN 'TimberStockMovement' THEN
                v_parent_id := COALESCE(v_curr_json->>'timberStockId', v_prev_json->>'timberStockId')::UUID;
                SELECT w.company_id INTO v_company_id 
                FROM public."TimberStock" ts 
                JOIN public."Warehouse" w ON ts."locationId" = w.id 
                WHERE ts.id = v_parent_id;
            WHEN 'TrimmedLog' THEN
                v_parent_id := COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId', v_curr_json->>'partaiId', v_prev_json->>'partaiId')::UUID;
                IF (COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId') IS NOT NULL) THEN
                    SELECT company_id INTO v_company_id FROM public."Warehouse" WHERE id = v_parent_id;
                ELSE
                    SELECT company_id INTO v_company_id FROM public."TimberPartai" WHERE id = v_parent_id;
                END IF;
            WHEN 'InputLog' THEN
                v_parent_id := COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId', v_curr_json->>'partaiId', v_prev_json->>'partaiId')::UUID;
                IF (COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId') IS NOT NULL) THEN
                    SELECT company_id INTO v_company_id FROM public."Warehouse" WHERE id = v_parent_id;
                ELSE
                    SELECT company_id INTO v_company_id FROM public."TimberPartai" WHERE id = v_parent_id;
                END IF;
            WHEN 'InputLogItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'inputLogId', v_prev_json->>'inputLogId')::UUID;
                SELECT COALESCE(w.company_id, tp.company_id) INTO v_company_id 
                FROM public."InputLog" il 
                LEFT JOIN public."Warehouse" w ON il."locationId" = w.id 
                LEFT JOIN public."TimberPartai" tp ON il."partaiId" = tp.id 
                WHERE il.id = v_parent_id;
            WHEN 'SawnTimberOutput' THEN
                v_parent_id := COALESCE(v_curr_json->>'locationId', v_prev_json->>'locationId')::UUID;
                SELECT company_id INTO v_company_id FROM public."Warehouse" WHERE id = v_parent_id;
            WHEN 'SawnTimberOutputItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'outputId', v_prev_json->>'outputId')::UUID;
                SELECT w.company_id INTO v_company_id 
                FROM public."SawnTimberOutput" sto 
                JOIN public."Warehouse" w ON sto."locationId" = w.id 
                WHERE sto.id = v_parent_id;
            WHEN 'SawmillProductionRun' THEN
                v_parent_id := COALESCE(v_curr_json->>'workCenterId', v_curr_json->>'operatorId', v_prev_json->>'workCenterId', v_prev_json->>'operatorId')::UUID;
                IF (COALESCE(v_curr_json->>'workCenterId', v_prev_json->>'workCenterId') IS NOT NULL) THEN
                    SELECT company_id INTO v_company_id FROM public."WorkCenter" WHERE id = v_parent_id;
                ELSE
                    SELECT company_id INTO v_company_id FROM public."Employee" WHERE id = v_parent_id;
                END IF;
            WHEN 'SawmillProductionConsumption', 'SawmillOutputItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'productionRunId', v_prev_json->>'productionRunId')::UUID;
                SELECT COALESCE(wc.company_id, e.company_id) INTO v_company_id 
                FROM public."SawmillProductionRun" spr 
                LEFT JOIN public."WorkCenter" wc ON spr."workCenterId" = wc.id 
                LEFT JOIN public."Employee" e ON spr."operatorId" = e.id 
                WHERE spr.id = v_parent_id;
            WHEN 'TimberStockOpnameItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'stockOpnameId', v_prev_json->>'stockOpnameId')::UUID;
                SELECT company_id INTO v_company_id FROM public."TimberStockOpname" WHERE id = v_parent_id;
            WHEN 'ExportShipmentItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'exportId', v_prev_json->>'exportId')::UUID;
                SELECT company_id INTO v_company_id FROM public."ExportShipment" WHERE id = v_parent_id;
            WHEN 'StockInTallyItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'tally_id', v_prev_json->>'tally_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."StockInTally" WHERE id = v_parent_id;
            WHEN 'ProductionProcessInput', 'ProductionProcessOutput' THEN
                v_parent_id := COALESCE(v_curr_json->>'productionProcessId', v_prev_json->>'productionProcessId')::UUID;
                SELECT company_id INTO v_company_id FROM public."ProductionProcess" WHERE id = v_parent_id;
            WHEN 'BomItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'bom_id', v_prev_json->>'bom_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Bom" WHERE id = v_parent_id;
            WHEN 'ManufacturingOrderItem' THEN
                v_parent_id := COALESCE(v_curr_json->>'manufacturing_order_id', v_prev_json->>'manufacturing_order_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."ManufacturingOrder" WHERE id = v_parent_id;
            WHEN 'BomRouting' THEN
                v_parent_id := COALESCE(v_curr_json->>'bom_id', v_prev_json->>'bom_id')::UUID;
                SELECT company_id INTO v_company_id FROM public."Bom" WHERE id = v_parent_id;
            WHEN 'BomOperation' THEN
                v_parent_id := COALESCE(v_curr_json->>'routing_id', v_prev_json->>'routing_id')::UUID;
                SELECT b.company_id INTO v_company_id 
                FROM public."BomRouting" br 
                JOIN public."Bom" b ON br."bom_id" = b.id 
                WHERE br.id = v_parent_id;
            ELSE
                v_company_id := NULL;
        END CASE;
    END IF;

    -- Fail-closed check: For all operational tables, company_id MUST be resolved
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL_TENANT_ISOLATION_FAILURE: Parent company could not be resolved for table %, record %', TG_TABLE_NAME, v_record_id;
    END IF;

    -- 4.4 Atomic Entity Version Allocation via _cdc_entity_lock
    INSERT INTO public._cdc_entity_lock (model_name, record_id, current_version, locked_at)
    VALUES (TG_TABLE_NAME, v_record_id, 1, clock_timestamp())
    ON CONFLICT (model_name, record_id) DO UPDATE
    SET current_version = public._cdc_entity_lock.current_version + 1,
        locked_at = clock_timestamp()
    RETURNING current_version INTO v_entity_version;

    -- 4.5 Deterministic SHA-256 Fingerprint
    -- Uses schema-safe digest call (checks extensions schema first, standard in Supabase)
    v_fp_content := v_operation || ':' || TG_TABLE_NAME || ':' || v_record_id::text || ':' || v_entity_version::text || ':' || COALESCE(v_curr_json::text, v_prev_json::text, '');
    BEGIN
        v_fingerprint := encode(extensions.digest(v_fp_content, 'sha256'), 'hex');
    EXCEPTION WHEN undefined_function THEN
        v_fingerprint := encode(public.digest(v_fp_content, 'sha256'), 'hex');
    END;

    -- 4.6 Insert into Transactional Outbox
    INSERT INTO public._reverse_sync_outbox (
        company_id,
        model_name,
        record_id,
        entity_version,
        operation,
        previous_state,
        current_state,
        replay_fingerprint,
        transaction_timestamp,
        status,
        attempt_count
    ) VALUES (
        v_company_id,
        TG_TABLE_NAME,
        v_record_id,
        v_entity_version,
        v_operation,
        v_prev_json,
        v_curr_json,
        v_fingerprint,
        clock_timestamp(),
        'PENDING',
        0
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Restrict execution from PUBLIC
REVOKE EXECUTE ON FUNCTION public.capture_reverse_sync_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_reverse_sync_mutation() TO authenticated, service_role;

-- 5. Complete Trigger Installation Across All 107 Operational Models
DO $$
DECLARE
    t TEXT;
    table_list TEXT[] := ARRAY[
        'Customer', 'Voucher', 'SalesOrder', 'SalesOrderItem', 'Quotation', 'QuotationItem',
        'DeliveryOrder', 'DeliveryOrderItem', 'Invoice', 'InvoiceItem', 'InvoiceExchange', 'InvoiceExchangeItem',
        'Payment', 'PaymentAllocation',
        'SalesReturn', 'SalesReturnItem', 'PurchaseOrder', 'PurchaseOrderItem', 'GoodsReceipt', 'GoodsReceiptItem',
        'PurchaseRequest', 'PurchaseRequestItem', 'SupplierProduct', 'ExpenseClaim', 'ExpenseItem',
        'PurchaseReturn', 'PurchaseReturnItem', 'DocumentSequence', 'JournalEntry', 'JournalEntryItem',
        'JournalAdjustment', 'JournalReversal', 'CashAccount', 'FinanceTransaction', 'FinanceTransactionItem',
        'FinanceDocument', 'PettyCash', 'Budget', 'Reconciliation', 'AccountingPeriod', 'Netting',
        'NettingAllocation', 'Product', 'WarehouseStock', 'StockMovement', 'InventoryTransaction',
        'InventoryTransactionItem', 'InventoryCostLayer', 'CostLayerConsumption', 'StockTransfer',
        'StockTransferItem', 'StockAdjustment', 'StockAdjustmentItem', 'InventoryDisposal',
        'InventoryDisposalItem', 'StockTransformation', 'StockTransformationInput', 'StockTransformationOutput',
        'TimberPurchase', 'TimberPurchaseItem', 'TimberPurchaseLogItem', 'TimberShipment', 'TimberShipmentItem',
        'TimberStock', 'TimberStockMovement', 'TimberStockReservation', 'RawLog', 'TrimmedLog',
        'InputLog', 'InputLogItem', 'SawnTimberOutput', 'SawnTimberOutputItem', 'SawmillProductionRun',
        'SawmillProductionConsumption', 'SawmillOutputItem', 'TimberSalesOrder', 'TimberSalesOrderItem',
        'TimberDeliveryNote', 'TimberDeliveryNoteItem', 'TimberStockOpname', 'TimberStockOpnameItem',
        'ExportShipment', 'ExportShipmentItem', 'StockInTally', 'StockInTallyItem', 'TimberPartai',
        'SalesReturnCostAllocation', 'ProductionProcess', 'ProductionProcessInput', 'ProductionProcessOutput',
        'Bom', 'BomItem', 'ManufacturingOrder', 'ManufacturingOrderItem', 'ManufacturingWorkOrder',
        'WorkCenter', 'MaterialReservation', 'BomRouting', 'BomOperation', 'QualityDisposition',
        'Department', 'Employee', 'Attendance', 'Payroll', 'PayrollItem', 'LeaveRequest', 'Shift'
    ];
BEGIN
    FOREACH t IN ARRAY table_list
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_cdc_outbox ON public.%I;', t);
        EXECUTE format('
            CREATE TRIGGER trg_cdc_outbox
            AFTER INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.capture_reverse_sync_mutation();
        ', t);
    END LOOP;
END;
$$;

-- End of DRAFT SQL Artifact
