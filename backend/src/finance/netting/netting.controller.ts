import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { NettingService } from './netting.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('finance/netting')
@UseGuards(JwtAuthGuard)
export class NettingController {
  constructor(private readonly nettingService: NettingService) {}

  @Post()
  async applyNetting(@Body() body: { partner_id: string, amount: number }, @Req() req: any) {
    return this.nettingService.applyNetting(body.partner_id, body.amount, req.user);
  }

  @Get('balance/:partner_id')
  async getPartnerBalance(@Param('partner_id') partner_id: string, @Req() req: any) {
    return this.nettingService.getPartnerBalance(partner_id, req.user);
  }
}
