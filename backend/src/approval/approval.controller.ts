import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('approval')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('pending')
  getPendingApprovals(@Request() req: any) {
    return this.approvalService.getPendingApprovals(req.user.company_id);
  }

  @Post('request')
  requestApproval(@Request() req: any, @Body() data: any) {
    return this.approvalService.requestApproval(
      req.user.company_id,
      req.user.id,
      data,
    );
  }

  @Post(':id/approve')
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.approvalService.approve(
      req.user.company_id,
      req.user.id,
      id,
      note,
    );
  }

  @Post(':id/reject')
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.approvalService.reject(
      req.user.company_id,
      req.user.id,
      id,
      note,
    );
  }

  @Post(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.approvalService.cancel(req.user.company_id, req.user.id, id);
  }
}
