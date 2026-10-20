import { Module, forwardRef } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ExportService } from './export.service';
import { PdfService } from './pdf.service';
import { DocumentService } from './document.service';
import { SequenceService } from './sequence.service';

import { FinancialReportService } from './services/financial-report.service';
import { SalesReportService } from './services/sales-report.service';
import { InventoryReportService } from './services/inventory-report.service';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [forwardRef(() => FinanceModule)],
  controllers: [ReportController],
  providers: [
    ReportService,
    ExportService,
    PdfService,
    DocumentService,
    SequenceService,
    FinancialReportService,
    SalesReportService,
    InventoryReportService,
  ],
  exports: [
    ReportService,
    ExportService,
    PdfService,
    DocumentService,
    SequenceService,
  ],
})
export class ReportsModule {}
