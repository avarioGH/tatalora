import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PeriodService } from './period.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/accounting-periods')
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

  @Permissions('period.create')
  @Post()
  async createPeriod(@Request() req: any, @Body() data: any) {
    data.startDate = new Date(data.startDate);
    data.endDate = new Date(data.endDate);
    return this.periodService.createPeriod(req.user.company_id, data);
  }

  @Permissions('period.view')
  @Get()
  async getPeriods(@Request() req: any) {
    return this.periodService.getPeriods(req.user.company_id);
  }

  @Permissions('period.create')
  @Post(':id/close')
  async closePeriod(@Request() req: any, @Param('id') id: string) {
    return this.periodService.closePeriod(req.user.company_id, id, req.user.id);
  }

  @Permissions('period.create')
  @Post(':id/lock')
  async lockPeriod(@Request() req: any, @Param('id') id: string) {
    // Ideally requires elevated admin permission
    return this.periodService.lockPeriod(req.user.company_id, id, req.user.id);
  }
}
