import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLedgerService } from '../inventory-ledger.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseController],
  providers: [PurchaseService, InventoryLedgerService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
