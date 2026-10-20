import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GlService } from './gl.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('gl')
export class GlController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly glService: GlService,
  ) {}

  @Permissions('gl.view')
  @Get('journals')
  async getJournals(@Request() req: any) {
    return this.prisma.journalEntry.findMany({
      where: { company_id: req.user.company_id },
      orderBy: { journal_date: 'desc' },
      take: 50,
      include: {
        items: true,
      },
    });
  }

  @Permissions('gl.view')
  @Get('trial-balance')
  async getTrialBalance(@Request() req: any) {
    return this.glService.getTrialBalance(req.user.company_id);
  }

  @Permissions('gl.view')
  @Get('general-ledger')
  async getGeneralLedger(
    @Request() req: any,
    @Query('accountId') accountId: string,
    @Query('page') page: string,
  ) {
    return this.glService.getGeneralLedger(
      req.user.company_id,
      accountId,
      +page || 1,
    );
  }

  @Permissions('gl.view')
  @Get('ar-aging')
  async getARAging(@Request() req: any) {
    return this.glService.getARAging(req.user.company_id);
  }

  @Permissions('gl.view')
  @Get('ap-aging')
  async getAPAging(@Request() req: any) {
    return this.glService.getAPAging(req.user.company_id);
  }

  @Permissions('gl.view')
  @Get('customer-statement/:id')
  async getCustomerStatement(
    @Request() req: any,
    @Param('id') customerId: string,
  ) {
    return this.glService.getCustomerStatement(req.user.company_id, customerId);
  }

  @Permissions('gl.view')
  @Get('supplier-statement/:id')
  async getSupplierStatement(
    @Request() req: any,
    @Param('id') supplierId: string,
  ) {
    return this.glService.getSupplierStatement(req.user.company_id, supplierId);
  }
}
