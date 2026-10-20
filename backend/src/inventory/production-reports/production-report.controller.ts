import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ProductionReportService } from './production-report.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@Controller('production/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionReportController {
  constructor(private readonly reportService: ProductionReportService) {}

  @Get('summary')
  @Permissions('read_inventory')
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shift') shift?: string,
    @Query('workCenterId') workCenterId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.reportService.getSummary({
      startDate,
      endDate,
      shift,
      workCenterId,
      locationId,
    });
  }

  @Get('rendement')
  @Permissions('read_inventory')
  async getRendement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getRendement({ startDate, endDate });
  }

  @Get('products')
  @Permissions('read_inventory')
  async getProducts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getProducts({ startDate, endDate });
  }

  @Get('shifts')
  @Permissions('read_inventory')
  async getShifts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getShifts({ startDate, endDate });
  }

  @Get('chamber')
  @Permissions('read_inventory')
  async getChamber() {
    return this.reportService.getChamber();
  }

  @Get('daily')
  @Permissions('read_inventory')
  async getDaily(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getDaily({ startDate, endDate });
  }

  @Get('reconciliation')
  @Permissions('read_inventory')
  async getReconciliation(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getReconciliation({ startDate, endDate });
  }

  @Get('data-quality')
  @Permissions('read_inventory')
  async getDataQuality(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getDataQuality({ startDate, endDate });
  }
}
