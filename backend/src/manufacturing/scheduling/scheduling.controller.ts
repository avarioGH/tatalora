import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('manufacturing')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Permissions('manufacturing.view')
  @Get('capacity')
  async getCapacity(@Req() req: any) {
    return this.schedulingService.getCapacity(req.user.companyId);
  }

  @Permissions('manufacturing.create')
  @Post('schedule')
  async generateSchedule(@Req() req: any) {
    return this.schedulingService.generateSchedule(req.user.companyId);
  }
}
