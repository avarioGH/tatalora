import { GlModule } from '../../../../gl/gl.module';
import { Module } from '@nestjs/common';
import { TripayController } from './tripay.controller';
import { TripayService } from './tripay.service';
import { IntegrationsModule } from '../../../integrations.module';
import { PaymentModule } from '../../../../finance/payment/payment.module';

@Module({
  imports: [IntegrationsModule, PaymentModule, GlModule],
  controllers: [TripayController],
  providers: [TripayService],
})
export class TripayModule {}
