import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
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

  @Permissions('gl.view')
  @Get('accounts')
  async getAccounts(@Request() req: any) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.chartOfAccount.findMany({
      where: { company_id: companyId, status: true },
      include: { 
        account_type: true,
        parent: true
      },
      orderBy: { account_code: 'asc' },
    });
  }

  @Permissions('gl.view')
  @Get('account-types')
  async getAccountTypes(@Request() req: any) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.accountType.findMany({
      where: { company_id: companyId },
      orderBy: { code: 'asc' },
    });
  }

  @Permissions('gl.create')
  @Post('accounts')
  async createAccount(@Request() req: any, @Body() body: any) {
    const companyId = req.user.company_id || req.user.companyId;
    
    // Ensure account type exists or find first
    let accountTypeId = body.account_type_id;
    if (!accountTypeId) {
      let at = await this.prisma.accountType.findFirst({
        where: { company_id: companyId }
      });
      if (!at) {
        at = await this.prisma.accountType.create({
          data: {
            company_id: companyId,
            code: 'AST',
            name: 'Aktiva Lancar',
            normal_balance: 'Debit'
          }
        });
      }
      accountTypeId = at.id;
    }

    return this.prisma.chartOfAccount.create({
      data: {
        company_id: companyId,
        account_code: body.account_code,
        account_name: body.account_name,
        account_type_id: accountTypeId,
        parent_id: body.parent_id || null,
        currency: body.currency || 'IDR',
        allow_manual_entry: body.allow_manual_entry !== false,
        is_header: Boolean(body.is_header),
        status: true,
      },
      include: {
        account_type: true,
        parent: true
      }
    });
  }

  @Permissions('gl.create')
  @Post('accounts/bulk-import')
  async bulkImportAccounts(@Request() req: any, @Body() body: { accounts: any[] }) {
    const companyId = req.user.company_id || req.user.companyId;
    const accounts = body.accounts || [];
    const results: any[] = [];

    let defaultType = await this.prisma.accountType.findFirst({ where: { company_id: companyId } });
    if (!defaultType) {
      defaultType = await this.prisma.accountType.create({
        data: {
          company_id: companyId,
          code: 'GEN',
          name: 'Umum',
          normal_balance: 'Debit'
        }
      });
    }

    for (const acc of accounts) {
      if (!acc.account_code || !acc.account_name) continue;
      const created = await this.prisma.chartOfAccount.upsert({
        where: {
          company_id_account_code: {
            company_id: companyId,
            account_code: String(acc.account_code).trim()
          }
        },
        update: {
          account_name: String(acc.account_name).trim(),
          is_header: Boolean(acc.is_header)
        },
        create: {
          company_id: companyId,
          account_code: String(acc.account_code).trim(),
          account_name: String(acc.account_name).trim(),
          account_type_id: acc.account_type_id || defaultType.id,
          currency: acc.currency || 'IDR',
          is_header: Boolean(acc.is_header),
          status: true
        }
      });
      results.push(created);
    }

    return { count: results.length, data: results };
  }
}
