import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { InvoiceReminderService } from './invoice-reminder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [PrismaModule, ReportsModule, IntegrationsModule],
  controllers: [CommunicationController],
  providers: [CommunicationService, InvoiceReminderService],
  exports: [CommunicationService, InvoiceReminderService],
})
export class CommunicationModule {}
