import { Module } from '@nestjs/common';
import { FishPurchaseService } from './fish-purchase.service';
import { FishPurchaseController } from './fish-purchase.controller';

@Module({
  providers: [FishPurchaseService],
  controllers: [FishPurchaseController]
})
export class FishPurchaseModule {}
