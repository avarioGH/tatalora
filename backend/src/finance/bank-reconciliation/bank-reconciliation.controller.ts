import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import {
  BankReconciliationService,
  ImportStatementDto,
} from './bank-reconciliation.service';

@Controller('finance/bank-reconciliation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankReconciliationController {
  constructor(private readonly reconService: BankReconciliationService) {}

  @Post('import')
  @Permissions('finance.reconciliation.import')
  // @ts-ignore
  async importStatement(@Request() req: any, @Body() data: ImportStatementDto) {
    const formattedData = {
      ...data,
      statementDate: new Date(data.statementDate),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      lines: data.lines.map((l) => ({
        ...l,
        transactionDate: new Date(l.transactionDate),
      })),
    };
    return this.reconService.importStatement(
      req.user.company_id,
      formattedData,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('statements/:id')
  @Permissions('finance.reconciliation.view')
  async getStatement(@Request() req: any, @Param('id') id: string) {
    return this.reconService.getStatement(req.user.company_id, id);
  }

  @Post('statements/:id/suggest')
  @Permissions('finance.reconciliation.match')
  async suggestMatches(@Request() req: any, @Param('id') id: string) {
    return this.reconService.suggestMatches(
      req.user.company_id,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post('statements/:id/finalize')
  @Permissions('finance.reconciliation.finalize')
  async finalizeReconciliation(@Request() req: any, @Param('id') id: string) {
    return this.reconService.finalizeReconciliation(
      req.user.company_id,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post('match')
  @Permissions('finance.reconciliation.match')
  async matchLine(
    @Request() req: any,
    @Body()
    body: {
      statementLineId: string;
      journalEntryLineId: string;
      matchAmount?: number;
    },
  ) {
    return this.reconService.matchLine(
      req.user.company_id,
      body.statementLineId,
      body.journalEntryLineId,
      req.user.userId,
      body.matchAmount,
      req.ip,
    );
  }

  @Post('unmatch')
  @Permissions('finance.reconciliation.match')
  async unmatchLine(
    @Request() req: any,
    @Body() body: { statementLineId: string },
  ) {
    return this.reconService.unmatchLine(
      req.user.company_id,
      body.statementLineId,
      req.user.userId,
      req.ip,
    );
  }

  @Post('adjustment')
  @Permissions('finance.reconciliation.adjust')
  async createAdjustment(
    @Request() req: any,
    @Body() body: { statementLineId: string; offsetAccountId: string },
  ) {
    return this.reconService.createAdjustment(
      req.user.company_id,
      body.statementLineId,
      body.offsetAccountId,
      req.user.userId,
      req.ip,
    );
  }
}
