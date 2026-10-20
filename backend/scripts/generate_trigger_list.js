const fs = require('fs');
const list = JSON.parse(fs.readFileSync('backend/prisma/full_184_models.json', 'utf8'));

// Operational reverse-sync models list (105 models):
const reverseSync = [
  'Customer', 'Voucher', 'SalesOrder', 'SalesOrderItem', 'Quotation', 'QuotationItem',
  'DeliveryOrder', 'DeliveryOrderItem', 'Invoice', 'InvoiceItem', 'Payment', 'PaymentAllocation',
  'SalesReturn', 'SalesReturnItem',
  'PurchaseOrder', 'PurchaseOrderItem', 'GoodsReceipt', 'GoodsReceiptItem',
  'PurchaseRequest', 'PurchaseRequestItem', 'SupplierProduct', 'ExpenseClaim', 'ExpenseItem',
  'PurchaseReturn', 'PurchaseReturnItem', 'DocumentSequence',
  'JournalEntry', 'JournalEntryItem', 'JournalAdjustment', 'JournalReversal', 'CashAccount',
  'FinanceTransaction', 'FinanceTransactionItem', 'FinanceDocument', 'PettyCash', 'Budget',
  'Reconciliation', 'AccountingPeriod', 'Netting', 'NettingAllocation',
  'Product', 'WarehouseStock', 'StockMovement', 'InventoryTransaction', 'InventoryTransactionItem',
  'InventoryCostLayer', 'CostLayerConsumption', 'StockTransfer', 'StockTransferItem',
  'StockAdjustment', 'StockAdjustmentItem', 'InventoryDisposal', 'InventoryDisposalItem',
  'StockTransformation', 'StockTransformationInput', 'StockTransformationOutput',
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

console.log('Operational count:', reverseSync.length);
const schemaNames = list.map(m => m.modelName);
const missingInSchema = reverseSync.filter(m => !schemaNames.includes(m));
console.log('Missing in schema:', missingInSchema);

const formatted = reverseSync.map(m => `        '${m}'`).join(',\n');
fs.writeFileSync('backend/scripts/migration/operational_tables.sql.txt', formatted);
console.log('Saved formatted operational tables SQL array.');
