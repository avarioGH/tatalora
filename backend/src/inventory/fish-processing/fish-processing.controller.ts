import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { FishProcessingService } from './fish-processing.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('inventory/fish-processing')
@UseGuards(JwtAuthGuard)
export class FishProcessingController {
  constructor(private readonly fishProcessingService: FishProcessingService) {}

  @Post()
  async processStock(@Body() data: any, @Req() req: any) {
    return this.fishProcessingService.processStock(data, req.user);
  }

  @Get()
  async getTransformations(@Req() req: any) {
    return this.fishProcessingService.getTransformations(req.user);
  }
}
