import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceExchangeService } from './invoice-exchange.service';
import { InvoiceExchangeController } from './invoice-exchange.controller';

import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [ReportsModule],
  providers: [InvoiceService, InvoiceExchangeService],
  controllers: [InvoiceController, InvoiceExchangeController],
  exports: [InvoiceService, InvoiceExchangeService],
})
export class InvoiceModule {}
