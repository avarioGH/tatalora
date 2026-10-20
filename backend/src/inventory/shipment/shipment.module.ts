import { Module } from '@nestjs/common';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLedgerService } from '../inventory-ledger.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShipmentController],
  providers: [ShipmentService, InventoryLedgerService],
  exports: [ShipmentService],
})
export class ShipmentModule {}
