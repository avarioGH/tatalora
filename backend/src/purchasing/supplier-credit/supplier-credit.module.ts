import { Module } from '@nestjs/common';
import { SupplierCreditService } from './supplier-credit.service';
import { SupplierCreditController } from './supplier-credit.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GlModule } from '../../gl/gl.module';
import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [PrismaModule, GlModule, ReportsModule],
  controllers: [SupplierCreditController],
  providers: [SupplierCreditService],
  exports: [SupplierCreditService],
})
export class SupplierCreditModule {}
