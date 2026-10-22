import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { DeliveryModule } from './delivery/delivery.module';
import { QuotationModule } from './quotation/quotation.module';
import { Customer360Module } from './customer360/customer360.module';
import { VoucherController } from './voucher.controller';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomerService } from './customer.service';
import { PublicConsultationController, AdminConsultationController } from './consultation.controller';

@Module({
  imports: [
    DeliveryModule,
    QuotationModule,
    Customer360Module,
    InventoryModule,
  ],
  controllers: [
    CustomerController,
    VoucherController,
    CrmController,
    PublicConsultationController,
    AdminConsultationController,
  ],
  providers: [CrmService, CustomerService],
  exports: [CrmService, CustomerService],
})
export class CrmModule {}
