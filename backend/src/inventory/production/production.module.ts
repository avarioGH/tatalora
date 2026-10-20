import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { InventoryLedgerService } from '../inventory-ledger.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionController],
  providers: [ProductionService, InventoryLedgerService],
  exports: [ProductionService],
})
export class ProductionModule {}
