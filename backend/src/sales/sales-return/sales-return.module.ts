import { Module } from '@nestjs/common';
import { SalesReturnService } from './sales-return.service';
import { SalesReturnController } from './sales-return.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryModule } from '../../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [SalesReturnController],
  providers: [SalesReturnService],
  exports: [SalesReturnService],
})
export class SalesReturnModule {}
