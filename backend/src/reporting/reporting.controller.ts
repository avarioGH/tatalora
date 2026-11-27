import {
  Controller,
  Get,
  Sse,
  MessageEvent,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ReportingService } from './reporting.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map, filter } from 'rxjs/operators';

@Controller('reporting')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('export')
  async requestExport(@Request() req, @Body() body: any) {
    return this.reportingService.requestAsyncExport({
      companyId: req.user.company_id,
      userId: req.user.id,
      reportType: body.reportType || 'GENERAL',
      format: body.format || 'EXCEL',
      filters: body.filters || {},
    });
  }

  // SSE Endpoint. Note: Standard EventSource does not send auth headers easily.
  // In a real app we would validate a token passed in query.
  @UseGuards(JwtAuthGuard)
  @Sse('notifications')
  sse(@Request() req: any, @Query('companyId') queryCompanyId?: string): Observable<MessageEvent> {
    const companyId = req?.user?.company_id || req?.user?.companyId || queryCompanyId;
    return fromEvent(this.eventEmitter, 'export.ready').pipe(
      filter((data: any) => data.companyId === companyId),
      map(
        (data: any) =>
          ({
            data: {
              message: 'Export Ready',
              logId: data.logId,
              url: data.url,
            },
          }) as MessageEvent,
      ),
    );
  }
}
