import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface JobData {
  logId: string;
  companyId: string;
  reportType: string;
  format: string;
  filters: any;
}

@Injectable()
export class ExportQueueService implements OnModuleInit {
  private readonly logger = new Logger(ExportQueueService.name);
  private queue: JobData[] = [];
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Resume pending jobs on startup if any (simple recovery)
    this.recoverPendingJobs();
  }

  private async recoverPendingJobs() {
    const pending = await this.prisma.reportExportLog.findMany({
      where: { status: 'PENDING' },
      orderBy: { started_at: 'asc' },
    });

    for (const log of pending) {
      this.addJob({
        logId: log.id,
        companyId: log.company_id,
        reportType: log.report_type,
        format: log.format,
        filters: {}, // In real app, we'd persist filters in DB to recover fully
      });
    }
  }

  async addJob(job: JobData) {
    this.queue.push(job);
    this.logger.log(
      `Job added to export queue: ${job.logId}. Queue length: ${this.queue.length}`,
    );
    this.processNext();
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    if (job) {
      try {
        await this.handleJob(job);
      } catch (error) {
        this.logger.error(`Job failed: ${job.logId}`, error.stack);
      }
    }

    this.isProcessing = false;
    this.processNext(); // Process remaining
  }

  private async handleJob(job: JobData) {
    this.logger.log(`Processing export job: ${job.logId}`);

    await this.prisma.reportExportLog.update({
      where: { id: job.logId },
      data: { status: 'PROCESSING' },
    });

    try {
      // 1. Actually generate report here (In real system, call ExcelJS/PDFGen)
      // For now, simulate the heavy CPU task asynchronously
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const mockFileUrl = `/reports/${job.companyId}/${job.logId}.${job.format.toLowerCase()}`;

      // 2. Mark as completed
      await this.prisma.reportExportLog.update({
        where: { id: job.logId },
        data: {
          status: 'COMPLETED',
          file_url: mockFileUrl,
          completed_at: new Date(),
        },
      });

      this.logger.log(`Job completed: ${job.logId}`);

      // 3. Emit event for WebSocket/SSE to push to frontend
      this.eventEmitter.emit('export.ready', {
        companyId: job.companyId,
        logId: job.logId,
        url: mockFileUrl,
      });
    } catch (err) {
      await this.prisma.reportExportLog.update({
        where: { id: job.logId },
        data: {
          status: 'FAILED',
          error_msg: err.message || 'Unknown error',
          completed_at: new Date(),
        },
      });
      throw err; // Re-throw to be caught by processNext
    }
  }
}
