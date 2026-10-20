import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationWebhookService {
  private readonly logger = new Logger(IntegrationWebhookService.name);

  constructor(private prisma: PrismaService) {}

  async recordIncoming(
    companyId: string,
    integrationId: string,
    provider: string,
    reference: string,
    status: string,
    payload: any,
  ) {
    return this.prisma.integrationWebhookEvent.create({
      data: {
        company_id: companyId,
        integration_id: integrationId,
        provider,
        reference,
        status: 'RECEIVED',
        payload,
      },
    });
  }

  async markProcessed(id: string) {
    await this.prisma.integrationWebhookEvent.updateMany({
      where: { id },
      data: { status: 'PROCESSED' },
    });
  }

  async markFailed(id: string, error: string, retryCount: number) {
    await this.prisma.integrationWebhookEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        error_message: error,
        retry_count: retryCount,
      },
    });
  }
}
