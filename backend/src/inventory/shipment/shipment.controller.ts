import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Get,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@Controller('inventory/timber-shipment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  @Permissions('inventory.create')
  create(@Body() data: any, @Request() req) {
    return this.shipmentService.create(req.user.companyId, data);
  }

  @Post(':id/confirm')
  @Permissions('inventory.create')
  confirm(@Param('id') id: string, @Request() req) {
    return this.shipmentService.confirm(id, req.user.companyId);
  }

  @Post(':id/cancel')
  @Permissions('inventory.create')
  cancel(@Param('id') id: string, @Request() req) {
    return this.shipmentService.cancel(id, req.user.companyId);
  }

  @Get()
  @Permissions('inventory.read')
  findAll(@Request() req) {
    return this.shipmentService.findAll(req.user.companyId);
  }

  @Get(':id')
  @Permissions('inventory.read')
  findOne(@Param('id') id: string, @Request() req) {
    return this.shipmentService.findOne(id, req.user.companyId);
  }

  @Delete(':id')
  @Permissions('inventory.create')
  delete(@Param('id') id: string, @Request() req) {
    return this.shipmentService.delete(id, req.user.companyId);
  }
}
