import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Customer360Service } from './customer360.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm/customers')
export class Customer360Controller {
  constructor(private readonly customer360Service: Customer360Service) {}

  @Permissions('customer360.view')
  @Get(':id/360')
  async getCustomer360(@Req() req: any, @Param('id') id: string) {
    return this.customer360Service.getCustomer360(req.user.companyId, id);
  }
}
