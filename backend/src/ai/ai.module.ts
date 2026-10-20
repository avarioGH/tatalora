import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [PrismaModule, FinanceModule, ReportsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
