import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationLogService {
  constructor(private prisma: PrismaService) {}

  async logEvent(
    companyId: string,
    userId: string,
    action: string,
    integrationId: string,
    details: any,
  ) {
    const safeDetails = { ...details };
    if (safeDetails.secret) safeDetails.secret = '***';
    if (safeDetails.apiKey) safeDetails.apiKey = '***';

    await this.prisma.auditLog.create({
      data: {
        company_id: companyId,
        user_id: userId,
        action,
        entity: 'INTEGRATION',
        entity_id: integrationId,
        ip_address: '0.0.0.0',
        browser: 'SYSTEM',
        device: 'SYSTEM',
      },
    });
  }
}
