import { Module } from '@nestjs/common';
import { PurchasingController } from './purchasing.controller';
import { PurchasingService } from './purchasing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationModule } from '../notification/notification.module';
import { PurchaseReturnModule } from './purchase-return/purchase-return.module';
import { SupplierCreditModule } from './supplier-credit/supplier-credit.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    PrismaModule,
    InventoryModule,
    NotificationModule,
    PurchaseReturnModule,
    SupplierCreditModule,
    ReportsModule,
  ],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService, SupplierCreditModule],
})
export class PurchasingModule {}

