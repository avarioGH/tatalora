import { Controller, Get, Patch, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private assertAdminRole(req: any) {
    const role = (req?.user?.role || '').toUpperCase();
    if (!['SUPERADMIN', 'OWNER', 'ADMIN', 'FULL_ADMIN'].includes(role)) {
      throw new ForbiddenException('Akses ditolak: Hanya Superadmin / Owner yang diizinkan mengakses portal admin.');
    }
  }

  @Get('tenants-users')
  async getTenantsAndUsers(@Request() req: any) {
    this.assertAdminRole(req);
    return this.adminService.getTenantsAndUsers();
  }

  @Get('overview-stats')
  async getOverviewStats(@Request() req: any) {
    this.assertAdminRole(req);
    return this.adminService.getOverviewStats();
  }

  @Get('audit-logs')
  async getAuditLogs(@Request() req: any) {
    this.assertAdminRole(req);
    const companyId = req?.user?.company_id || req?.user?.companyId;
    return this.adminService.getAuditLogs(companyId);
  }

  @Patch('users/:id')
  async updateUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; phone?: string; status?: boolean },
  ) {
    this.assertAdminRole(req);
    return this.adminService.updateUser(id, body);
  }
}
