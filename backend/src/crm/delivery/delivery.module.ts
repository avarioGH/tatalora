import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { InventoryModule } from '../../inventory/inventory.module';
import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [InventoryModule, ReportsModule],
  providers: [DeliveryService],
  controllers: [DeliveryController],
})
export class DeliveryModule {}
