import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Permissions('maintenance.create')
  @Post('preventive/trigger')
  async triggerPreventive(@Req() req: any) {
    return this.maintenanceService.triggerPreventiveMaintenance(
      req.user.companyId,
    );
  }

  @Permissions('maintenance.create')
  @Post('requests')
  async createRequest(@Req() req: any, @Body() data: any) {
    return this.maintenanceService.createRequest(req.user.companyId, data);
  }

  @Permissions('maintenance.order.create')
  @Post('orders/:id/start')
  async startMaintenance(@Req() req: any, @Param('id') id: string) {
    return this.maintenanceService.startMaintenance(
      req.user.companyId,
      id,
      req.user.id,
    );
  }

  @Permissions('maintenance.order.create')
  @Post('orders/:id/complete')
  async completeMaintenance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.maintenanceService.completeMaintenance(
      req.user.companyId,
      id,
      data,
    );
  }

  @Permissions('maintenance.view')
  @Get('capacity-impact')
  async getCapacityImpact(@Req() req: any) {
    return this.maintenanceService.getMaintenanceBlackouts(req.user.companyId);
  }

  @Permissions('maintenance.view')
  @Get('metrics/:assetId')
  async getMetrics(@Req() req: any, @Param('assetId') assetId: string) {
    return this.maintenanceService.getMetrics(req.user.companyId, assetId);
  }
}
