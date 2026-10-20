import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdjustmentAuditService } from './adjustment-audit.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('inventory/reconciliation/adjustment-cancellations')
@UseGuards(JwtAuthGuard)
export class AdjustmentAuditController {
  constructor(private readonly auditService: AdjustmentAuditService) {}

  @Get()
  async getAuditReport(@Req() req: any) {
    return this.auditService.runForensicAudit(req.user.company_id);
  }
}
