import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { MrpService } from './mrp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mrp')
export class MrpController {
  constructor(private readonly mrpService: MrpService) {}

  @Permissions('mrp.view')
  @Get('calculate')
  async calculateMrp(
    @Req() req: any,
    @Query('warehouse_id') warehouse_id?: string,
  ) {
    const company_id = req.user.companyId;
    return this.mrpService.calculateMrp(company_id, warehouse_id);
  }
}
