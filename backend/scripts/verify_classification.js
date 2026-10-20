const fs = require('fs');
const list = JSON.parse(fs.readFileSync('backend/prisma/models_inventory.json', 'utf8'));

// 1. REVERSE_SYNC (Operational writes post-cutover)
const reverseSync = [
  // Sales & AR (16)
  'Customer', 'Voucher', 'SalesOrder', 'SalesOrderItem', 'Quotation', 'QuotationItem',
  'DeliveryOrder', 'DeliveryOrderItem', 'Invoice', 'InvoiceItem', 'Payment', 'PaymentAllocation',
  'CreditNote', 'DebitNote', 'SalesReturn', 'SalesReturnItem',

  // Purchasing & AP (12)
  'Vendor', 'PurchaseOrder', 'PurchaseOrderItem', 'GoodsReceipt', 'GoodsReceiptItem',
  'PurchaseRequest', 'PurchaseRequestItem', 'SupplierProduct', 'ExpenseClaim', 'ExpenseItem',
  'PurchaseReturn', 'PurchaseReturnItem',

  // General Ledger & Cash (14)
  'JournalEntry', 'JournalEntryItem', 'JournalAdjustment', 'JournalReversal', 'CashAccount',
  'FinanceTransaction', 'FinanceTransactionItem', 'FinanceDocument', 'PettyCash', 'Budget',
  'Reconciliation', 'AccountingPeriod', 'Netting', 'NettingAllocation',

  // Inventory & FIFO (16)
  'Product', 'WarehouseStock', 'StockMovement', 'InventoryTransaction', 'InventoryTransactionItem',
  'InventoryCostLayer', 'CostLayerConsumption', 'StockTransfer', 'StockTransferItem',
  'StockAdjustment', 'StockAdjustmentItem', 'InventoryDisposal', 'InventoryDisposalItem',
  'StockTransformation', 'StockTransformationInput', 'StockTransformationOutput',

  // Sawmill & Timber (30)
  'TimberPurchase', 'TimberPurchaseItem', 'TimberPurchaseLogItem', 'TimberShipment', 'TimberShipmentItem',
  'TimberStock', 'TimberStockMovement', 'TimberStockReservation', 'RawLog', 'TrimmedLog',
  'InputLog', 'InputLogItem', 'SawnTimberOutput', 'SawnTimberOutputItem', 'SawmillProductionRun',
  'SawmillProductionConsumption', 'SawmillOutputItem', 'TimberSalesOrder', 'TimberSalesOrderItem',
  'TimberDeliveryNote', 'TimberDeliveryNoteItem', 'TimberStockOpname', 'TimberStockOpnameItem',
  'ExportShipment', 'ExportShipmentItem', 'StockInTally', 'StockInTallyItem', 'TimberPartai',
  'SalesReturnCostAllocation', 'ProductionProcess',

  // Manufacturing & BOM (10)
  'Bom', 'BomItem', 'ManufacturingOrder', 'ManufacturingOrderItem', 'ManufacturingWorkOrder',
  'WorkCenter', 'MaterialReservation', 'BomRouting', 'BomOperation', 'QualityDisposition',

  // HR & Payroll (7)
  'Department', 'Employee', 'Attendance', 'Payroll', 'PayrollItem', 'LeaveRequest', 'Shift'
];

// 2. IMMUTABLE / REFERENCE (44)
const immutable = [
  // Org & Security (14)
  'Company', 'CompanySetting', 'Role', 'Permission', 'RolePermission', 'User', 'Warehouse',
  'UserWarehouseAccess', 'Tenant', 'SubscriptionPlan', 'TenantSubscription', 'BillingInvoice',
  'ApiToken', 'InstalledPlugin',

  // Reference Masters (15)
  'Unit', 'Brand', 'ProductImage', 'ProductDocument', 'AccountType', 'FiscalYear',
  'TimberSpecies', 'TimberGrade', 'TimberSource', 'Location', 'Vehicle', 'Driver',
  'TimberVariant', 'NotificationTemplate', 'CommunicationSetting',

  // EAM & Workflows (15)
  'AssetMaster', 'AssetLocation', 'AssetAssignment', 'AssetBorrowing', 'MaintenanceSchedule',
  'WorkOrder', 'AssetDocument', 'QualityControlPoint', 'QualityCheck', 'DocumentMaster',
  'DocumentVersion', 'DocumentShareLink', 'WorkflowMaster', 'WorkflowEdge', 'ApprovalRequest'
];

// 3. EPHEMERAL / VOLATILE (24)
const ephemeral = [
  // Session & UI (6)
  'PosShift', 'AiChatHistory', 'DashboardLayout', 'DashboardWidget', 'InternalInbox', 'UserTask',

  // Logs & Audit (12)
  'AuditLog', 'AssetHistory', 'MaintenanceLog', 'DepreciationLog', 'AssetDepreciation',
  'BusinessInsight', 'ReportSchedule', 'ReportExportLog', 'ApprovalLog', 'CommunicationLog',
  'AutomationLog', 'ImportSession',

  // Caches & Idempotency (6)
  'EcommerceCart', 'EcommerceCartItem', 'CheckoutIdempotency', 'IntegrationIdempotency',
  'IntegrationWebhookEvent', 'MarketplaceIntegration'
];

// 4. SPECIALIZED / HIERARCHY & GRAPH (11)
const specialized = [
  // Self-referential trees (5)
  'Category', 'AssetCategory', 'FinanceCategory', 'ChartOfAccount', 'SawmillBundle',
  // Dynamic JSON & Workflows (4)
  'WorkflowNode', 'Lead', 'Opportunity', 'CrmActivity',
  // Integration & Ext Ref (2)
  'Integration', 'ExternalReference'
];

console.log('Counts:');
console.log('Reverse-Sync:', reverseSync.length);
console.log('Immutable/Ref:', immutable.length);
console.log('Ephemeral:', ephemeral.length);
console.log('Specialized:', specialized.length);
const total = reverseSync.length + immutable.length + ephemeral.length + specialized.length;
console.log('Sum:', total);

const allClassified = [...reverseSync, ...immutable, ...ephemeral, ...specialized];
const allModelNames = list.map(m => m.modelName);

// Check duplicates
const counts = {};
allClassified.forEach(n => counts[n] = (counts[n] || 0) + 1);
const dups = Object.keys(counts).filter(k => counts[k] > 1);
console.log('Duplicates in classification:', dups);

// Check missing
const missing = allModelNames.filter(m => !allClassified.includes(m));
console.log('Missing from classification:', missing);

// Check extra
const extra = allClassified.filter(c => !allModelNames.includes(c));
console.log('Extra not in schema:', extra);
