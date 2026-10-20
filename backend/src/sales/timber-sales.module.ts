import { Module } from '@nestjs/common';
import { TimberSalesService } from './timber-sales.service';
import { TimberSalesController } from './timber-sales.controller';
import { ExportShipmentController } from './export-shipment.controller';
import { ExportShipmentService } from './export-shipment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [TimberSalesController, ExportShipmentController],
  providers: [TimberSalesService, ExportShipmentService],
  exports: [TimberSalesService, ExportShipmentService],
})
export class TimberSalesModule {}
