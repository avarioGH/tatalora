import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationCredentialService } from './integration-credential.service';
import { IntegrationIdempotencyService } from './integration-idempotency.service';
import { TripayService } from './providers/payment/tripay/tripay.service';
import { IntegrationWebhookService } from './integration-webhook.service';
import { IntegrationLogService } from './integration-log.service';
import { GlModule } from '../gl/gl.module';
import { PaymentModule } from '../finance/payment/payment.module';

@Module({
  imports: [GlModule, PaymentModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationCredentialService,
    IntegrationIdempotencyService,
    IntegrationWebhookService,
    IntegrationLogService,
    TripayService,
  ],
  exports: [
    IntegrationsService,
    IntegrationCredentialService,
    IntegrationIdempotencyService,
    IntegrationWebhookService,
    TripayService,
  ],
})
export class IntegrationsModule {}
