import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { GlModule } from '../../gl/gl.module';

import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [GlModule, ReportsModule],
  providers: [PaymentService],
  exports: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
