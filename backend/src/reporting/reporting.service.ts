import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportQueueService } from './export-queue.service';

export interface RequestExportDto {
  companyId: string;
  userId: string;
  reportType: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  filters: any;
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private prisma: PrismaService,
    private exportQueue: ExportQueueService,
  ) {}

  async requestAsyncExport(data: RequestExportDto) {
    const log = await this.prisma.reportExportLog.create({
      data: {
        company_id: data.companyId,
        report_type: data.reportType,
        format: data.format,
        status: 'PENDING',
        requested_by: data.userId,
      },
    });

    this.logger.log(
      `Export Job Queued: [${log.id}] ${data.reportType} to ${data.format}`,
    );

    // Delegate to true internal queue manager
    this.exportQueue.addJob({
      logId: log.id,
      companyId: data.companyId,
      reportType: data.reportType,
      format: data.format,
      filters: data.filters,
    });

    return {
      message: 'Export request accepted and is queued for processing.',
      trackingId: log.id,
    };
  }
}
