import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Get,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@Controller('inventory/timber-purchase')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseController {
  @Put(':id')
  @Permissions('inventory.create')
  async updatePurchase(@Param('id') id: string, @Body() data: any) {
    return this.purchaseService.updatePurchase(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.purchaseService.deletePurchase(id);
  }
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @Permissions('inventory.create')
  create(@Body() data: any, @Request() req) {
    return this.purchaseService.create(req.user.companyId, data);
  }

  @Post(':id/confirm')
  @Permissions('inventory.create')
  confirm(@Param('id') id: string, @Request() req) {
    return this.purchaseService.confirm(id, req.user.companyId);
  }

  
  @Post(':id/receive')
  @Permissions('inventory.create')
  receive(@Param('id') id: string, @Request() req) {
    return this.purchaseService.markAsReceived(id, req.user.companyId);
  }

  @Post(':id/cancel')
  @Permissions('inventory.create')
  cancel(@Param('id') id: string, @Request() req) {
    return this.purchaseService.cancel(id, req.user.companyId);
  }

  @Get()
  @Permissions('inventory.read')
  findAll(@Request() req) {
    return this.purchaseService.findAll(req.user.companyId);
  }

  @Get(':id')
  @Permissions('inventory.read')
  findOne(@Param('id') id: string, @Request() req) {
    return this.purchaseService.findOne(id, req.user.companyId);
  }

  @Post(':id/log-items')
  @Permissions('inventory.create')
  addLogItem(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.purchaseService.addLogItem(id, req.user.companyId, data);
  }

  @Put(':id/log-items/:itemId')
  @Permissions('inventory.create')
  updateLogItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.purchaseService.updateLogItem(
      id,
      itemId,
      req.user.companyId,
      data,
    );
  }
}
