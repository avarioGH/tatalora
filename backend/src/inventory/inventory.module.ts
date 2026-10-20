import { StockInTallyController } from './stock-in-tally.controller';
import { StockInTallyService } from './stock-in-tally.service';
import { BatchAuditService } from './reconciliation/batch-audit.service';
import { BatchAuditController } from './reconciliation/batch-audit.controller';
import { AdjustmentAuditService } from './reconciliation/adjustment-audit.service';
import { AdjustmentAuditController } from './reconciliation/adjustment-audit.controller';
import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { RawLogController } from './raw-log.controller';
import { RawLogService } from './raw-log.service';
import { TrimmedLogController } from './trimmed-log.controller';
import { TrimmedLogService } from './trimmed-log.service';
import { InputLogController } from './input-log.controller';
import { InputLogService } from './input-log.service';
import { SawnTimberController } from './sawn-timber.controller';
import { SawnTimberService } from './sawn-timber.service';
import { TimberLedgerController } from './timber-ledger.controller';
import { InventoryLedgerService } from './inventory-ledger.service';
import { StockTransferService } from './stock-transfer.service';
import { StockAdjustmentService } from './stock-adjustment.service';
import { ImportController } from './import/import.controller';
import { ImportService } from './import/import.service';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TimberCalculationService } from './timber-calculation.service';
import { SawmillProductionController } from './sawmill-production.controller';
import { SawmillProductionService } from './sawmill-production.service';
import { ProductionReportController } from './production-reports/production-report.controller';
import { ProductionReportService } from './production-reports/production-report.service';
import { ReservationReconciliationService } from './reconciliation/reservation-reconciliation.service';
import { ReservationReconciliationController } from './reconciliation/reservation-reconciliation.controller';
import { ReportsModule } from '../reports/reports.module';

import { DisposalController } from './disposal/disposal.controller';
import { DisposalService } from './disposal/disposal.service';
import { FishPurchaseModule } from './fish-purchase/fish-purchase.module';
import { FishProcessingModule } from './fish-processing/fish-processing.module';

@Module({
  imports: [ReportsModule, FishPurchaseModule, FishProcessingModule],
  controllers: [
    StockInTallyController,
    BatchAuditController,
    AdjustmentAuditController,
    InventoryController,
    RawLogController,
    TrimmedLogController,
    InputLogController,
    SawnTimberController,
    TimberLedgerController,
    ImportController,
    ReportController,
    SawmillProductionController,
    ProductionReportController,
    ReservationReconciliationController,
    DisposalController,
  ],
  providers: [
    StockInTallyService,
    BatchAuditService,
    AdjustmentAuditService,
    InventoryService,
    RawLogService,
    TrimmedLogService,
    InputLogService,
    SawnTimberService,
    InventoryLedgerService,
    StockTransferService,
    StockAdjustmentService,
    ImportService,
    ReportService,
    TimberCalculationService,
    SawmillProductionService,
    ProductionReportService,
    ReservationReconciliationService,
    DisposalService,
  ],
  exports: [
    BatchAuditService,
    AdjustmentAuditService,
    InventoryService,
    RawLogService,
    TrimmedLogService,
    InputLogService,
    SawnTimberService,
    InventoryLedgerService,
    StockTransferService,
    StockAdjustmentService,
    ImportService,
    ReportService,
    TimberCalculationService,
    SawmillProductionService,
    ReservationReconciliationService,
    DisposalService,
  ],
})
export class InventoryModule {}
