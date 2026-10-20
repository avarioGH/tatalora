import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MoService } from './mo.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('manufacturing/mo')
export class MoController {
  @Permissions('manufacturing.create')
  @Post()
  async createMO(@Req() req: any, @Body() data: any) {
    return this.moService.createManufacturingOrder({
      ...data,
      company_id: req.user.companyId,
    });
  }

  constructor(private readonly moService: MoService) {}

  @Permissions('manufacturing.view')
  @Get()
  async getOrders(@Req() req: any) {
    return this.moService.getManufacturingOrders(req.user.companyId);
  }

  @Permissions('manufacturing.view')
  @Get(':id')
  async getOrder(@Req() req: any, @Param('id') id: string) {
    return this.moService.getManufacturingOrder(req.user.companyId, id);
  }

  @Permissions('manufacturing.view')
  @Get(':id/availability')
  async getAvailability(@Req() req: any, @Param('id') id: string) {
    return this.moService.getMaterialAvailability(req.user.companyId, id);
  }

  @Permissions('manufacturing.create')
  @Post(':id/reserve')
  async reserveMaterials(@Req() req: any, @Param('id') id: string) {
    return this.moService.reserveMaterials(req.user.companyId, id);
  }

  @Permissions('manufacturing.create')
  @Post(':id/start')
  async startProduction(@Req() req: any, @Param('id') id: string) {
    return this.moService.startProduction(req.user.companyId, id, req.user.id);
  }

  @Permissions('manufacturing.create')
  @Post(':id/complete')
  async completeProduction(@Req() req: any, @Param('id') id: string) {
    return this.moService.completeProduction(
      req.user.companyId,
      id,
      req.user.id,
    );
  }

  @Permissions('manufacturing.create')
  @Post(':id/cancel')
  async cancelProduction(@Req() req: any, @Param('id') id: string) {
    return this.moService.cancelProduction(req.user.companyId, id, req.user.id);
  }
}
