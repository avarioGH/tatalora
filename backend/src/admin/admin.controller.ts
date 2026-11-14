import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tenants-users')
  async getTenantsAndUsers() {
    return this.adminService.getTenantsAndUsers();
  }

  @Get('overview-stats')
  async getOverviewStats() {
    return this.adminService.getOverviewStats();
  }

  @Get('audit-logs')
  async getAuditLogs(@Request() req: any) {
    const companyId = req?.user?.company_id || req?.user?.companyId;
    return this.adminService.getAuditLogs(companyId);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; phone?: string; status?: boolean },
  ) {
    return this.adminService.updateUser(id, body);
  }
}
