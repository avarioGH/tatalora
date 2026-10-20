import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExportShipmentService } from './export-shipment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('sales/export-shipments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExportShipmentController {
  constructor(private readonly service: ExportShipmentService) {}

  @Get()
  @Permissions('sales.read')
  async findAll(@Request() req) {
    return this.service.findAll(req.user.companyId);
  }

  @Get(':id')
  @Permissions('sales.read')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  @Permissions('sales.create')
  async create(@Body() dto: any, @Request() req) {
    return this.service.create(req.user.companyId, dto);
  }

  @Put(':id')
  @Permissions('sales.update')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.service.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('sales.delete')
  async delete(@Param('id') id: string, @Request() req) {
    return this.service.delete(id, req.user.companyId);
  }
}
