import { Module } from '@nestjs/common';
import { CustomerCreditService } from './customer-credit.service';
import { CustomerCreditController } from './customer-credit.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GlModule } from '../../gl/gl.module';
import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [PrismaModule, GlModule, ReportsModule],
  controllers: [CustomerCreditController],
  providers: [CustomerCreditService],
  exports: [CustomerCreditService],
})
export class CustomerCreditModule {}
