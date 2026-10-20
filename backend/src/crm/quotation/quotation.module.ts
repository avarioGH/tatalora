import { PaymentModule } from '../../finance/payment/payment.module';
import { ReportsModule } from '../../reports/reports.module';
import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { SalesOrderController } from './sales-order.controller';
import { SalesOrderService } from './sales-order.service';

@Module({
  imports: [PaymentModule, ReportsModule],
  providers: [QuotationService, SalesOrderService],
  controllers: [QuotationController, SalesOrderController],
  exports: [QuotationService, SalesOrderService],
})
export class QuotationModule {}
