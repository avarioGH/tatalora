import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { BatchAuditService } from './batch-audit.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('inventory/batch-data-quality')
@UseGuards(JwtAuthGuard)
export class BatchAuditController {
  constructor(private readonly batchAuditService: BatchAuditService) {}

  @Get()
  async getSummary(@Request() req: any) {
    const companyId = req.user.company_id || req.user.companyId;
    try {
      return await this.batchAuditService.getSummary(companyId);
    } catch (e) {
      return {
        auditStatus: 'DATA_UNAVAILABLE',
        error: e.message,
      };
    }
  }

  @Get('detail')
  async getDetail(
    @Request() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('canonicalBatch') canonicalBatch?: string,
  ) {
    const companyId = req.user.company_id || req.user.companyId;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    if (canonicalBatch) {
      return this.batchAuditService.getDrillDown(
        companyId,
        canonicalBatch,
        p,
        l,
      );
    }
    return this.batchAuditService.getDetail(companyId, p, l);
  }
}
