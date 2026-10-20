import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ExportQueueService } from './export-queue.service';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ExportQueueService],
})
export class ReportingModule {}
