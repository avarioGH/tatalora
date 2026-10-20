import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { FishPurchaseService } from './fish-purchase.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('inventory/fish-purchase')
@UseGuards(JwtAuthGuard)
export class FishPurchaseController {
  constructor(private readonly fishPurchaseService: FishPurchaseService) {}

  @Post('atomic')
  async createAtomic(@Body() data: any, @Req() req: any) {
    return this.fishPurchaseService.createAtomicPurchase(data, req.user);
  }
}
