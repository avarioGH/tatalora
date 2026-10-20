import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CrmAnalyticsService } from './crm-analytics.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm/analytics')
export class CrmAnalyticsController {
  constructor(private readonly analyticsService: CrmAnalyticsService) {}

  @Get('pipeline')
  @Permissions('crm.analytics.view')
  async getPipelineMetrics(@Request() req: any) {
    return this.analyticsService.getPipelineMetrics(req.user.company_id);
  }

  @Get('salesperson')
  @Permissions('crm.analytics.view')
  async getSalespersonMetrics(@Request() req: any) {
    return this.analyticsService.getSalespersonMetrics(req.user.company_id);
  }

  @Get('source')
  @Permissions('crm.analytics.view')
  async getSourceMetrics(@Request() req: any) {
    return this.analyticsService.getSourceMetrics(req.user.company_id);
  }

  @Get('funnel')
  @Permissions('crm.analytics.view')
  async getFunnelMetrics(@Request() req: any) {
    return this.analyticsService.getFunnelMetrics(req.user.company_id);
  }
}
