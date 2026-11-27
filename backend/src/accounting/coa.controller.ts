import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CoaService } from './coa.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting/coa')
export class CoaController {
  constructor(
    private readonly coaService: CoaService,
    private readonly prisma: PrismaService,
  ) {}

  @Permissions('accounting.create')
  @Post('bootstrap')
  async bootstrap(@Request() req: any, @Body() body: { companyId?: string }) {
    const companyId = req.user?.company_id || req.user?.companyId || body.companyId;
    await this.prisma.$transaction(async (tx) => {
      await this.coaService.ensureStandardAccounts(tx, companyId);
    });
    return { success: true, message: 'COA bootstrapped successfully' };
  }
}
