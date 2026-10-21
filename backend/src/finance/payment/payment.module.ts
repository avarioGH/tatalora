import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { GlModule } from '../../gl/gl.module';

import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [GlModule, forwardRef(() => ReportsModule)],
  providers: [PaymentService],
  exports: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
