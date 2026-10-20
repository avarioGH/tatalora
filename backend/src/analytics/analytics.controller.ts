import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Permissions('analytics.view')
  @Get('sales')
  async getSalesAnalytics(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getSalesAnalytics(
      req.user.company_id || req.user.companyId,
      startDate,
      endDate,
      warehouseId,
    );
  }

  @Permissions('analytics.view')
  @Get('customers')
  async getCustomerAnalytics(@Request() req: any) {
    return this.analyticsService.getCustomerAnalytics(
      req.user.company_id || req.user.companyId,
    );
  }

  // Used by DashboardAPI.getKPIs on frontend root page
  @Get('dashboard')
  async getDashboardData(
    @Request() req: any,
    @Query('timeRange') timeRange: string,
    @Query('warehouseId') warehouseId: string,
  ) {
    return this.analyticsService.getDashboardKPIs(
      req.user.company_id || req.user.companyId,
      warehouseId,
    );
  }
}
