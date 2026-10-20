import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  async getDashboardSummary() {
    return this.reportService.getDashboardSummary();
  }

  @Get('stock-summary')
  async getStockSummary(
    @Query('locationId') locationId?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
  ) {
    return this.reportService.getStockSummary({
      locationId,
      productId,
      search,
    });
  }

  @Get('stock-card/:variantId/:locationId')
  async getStockCard(
    @Param('variantId') variantId: string,
    @Param('locationId') locationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sDate = startDate ? new Date(startDate) : undefined;
    const eDate = endDate ? new Date(endDate) : undefined;
    return this.reportService.getStockCard(variantId, locationId, sDate, eDate);
  }

  @Get('yield')
  async getYieldReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shift') shift?: string,
  ) {
    const sDate = startDate ? new Date(startDate) : undefined;
    const eDate = endDate ? new Date(endDate) : undefined;
    return this.reportService.getYieldReport({
      startDate: sDate,
      endDate: eDate,
      shift,
    });
  }

  @Get('stock-aging')
  async getStockAgingReport() {
    return this.reportService.getStockAgingReport();
  }

  @Get('traceability')
  async getTraceabilityReport(@Query('search') search?: string) {
    return this.reportService.getTraceabilityReport(search);
  }

  @Get('daily-monitoring')
  async getDailyMonitoring(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sDate = startDate ? new Date(startDate) : undefined;
    const eDate = endDate ? new Date(endDate) : undefined;
    return this.reportService.getDailySawmillMonitoring({
      startDate: sDate,
      endDate: eDate,
    });
  }

  @Get('inflow')
  async getInflowReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.reportService.getInflowReport({
      startDate,
      endDate,
      warehouseId,
    });
  }
}
