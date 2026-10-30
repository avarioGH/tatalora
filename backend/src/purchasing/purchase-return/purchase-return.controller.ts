import { Controller, Get, Post, Body, Param, Put, Request, UseGuards } from '@nestjs/common';
import { PurchaseReturnService } from './purchase-return.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Permissions } from '../../auth/permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('purchasing/purchase-returns')
export class PurchaseReturnController {
  constructor(private readonly purchaseReturnService: PurchaseReturnService) {}

  @Get()
  @Permissions('view:purchase_return')
  findAll(@Request() req) {
    return this.purchaseReturnService.findAll(req.user.company_id);
  }

  @Get(':id')
  @Permissions('view:purchase_return')
  findOne(@Request() req, @Param('id') id: string) {
    return this.purchaseReturnService.findOne(req.user.company_id, id);
  }

  @Post()
  @Permissions('create:purchase_return')
  create(@Request() req, @Body() body: any) {
    return this.purchaseReturnService.create({
      ...body,
      companyId: req.user.company_id,
      userId: req.user.id,
    });
  }

  @Put(':id/approve')
  @Permissions('approve:purchase_return')
  approve(@Request() req, @Param('id') id: string) {
    return this.purchaseReturnService.approve(id, req.user.company_id, req.user.id);
  }

  @Put(':id/reverse')
  @Permissions('reverse:purchase_return')
  reverse(@Request() req, @Param('id') id: string) {
    return this.purchaseReturnService.reverse(id, req.user.company_id, req.user.id);
  }
}
