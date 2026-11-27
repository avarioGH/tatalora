import { Controller, Post, Param, Body, Patch, UseGuards, Request } from '@nestjs/common';
import { SalesReturnService } from './sales-return.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-returns')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Permissions('sales.return.create')
  @Post()
  create(@Request() req: any, @Body() body: any) {
    const companyId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.salesReturnService.create(companyId, body, userId);
  }

  @Permissions('sales.return.approve')
  @Patch(':id/approve')
  approve(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.salesReturnService.approve(companyId, id, userId);
  }

  @Permissions('sales.return.reverse')
  @Patch(':id/reverse')
  reverse(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.salesReturnService.reverse(companyId, id, userId);
  }
}
