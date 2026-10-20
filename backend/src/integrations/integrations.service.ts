import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationLogService } from './integration-log.service';
import { IntegrationCredentialService } from './integration-credential.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private logger: IntegrationLogService,
    private credentials: IntegrationCredentialService,
  ) {}

  async findAll(companyId: string) {
    return (this.prisma.integration as any).findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        environment: true,
        status: true,
        is_active: true,
        created_at: true,
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const integration = await (this.prisma.integration as any).findFirst({
      where: { id, company_id: companyId },
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        environment: true,
        status: true,
        is_active: true,
        configuration: true,
        created_at: true,
        webhooks: { take: 5, orderBy: { received_at: 'desc' } },
      },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async create(companyId: string, userId: string, data: any) {
    const integration = await (this.prisma.integration as any).create({
      data: {
        company_id: companyId,
        name: data.name,
        type: data.type,
        provider: data.provider,
        environment: data.environment || 'TEST',
        configuration: data.configuration || {},
      },
    });

    if (data.credentials) {
      for (const [key, value] of Object.entries(data.credentials)) {
        await this.credentials.storeCredential(
          integration.id,
          key,
          value as string,
        );
      }
    }

    await this.logger.logEvent(
      companyId,
      userId,
      'INTEGRATION_CREATED',
      integration.id,
      { provider: data.provider },
    );
    return integration;
  }

  async update(companyId: string, userId: string, id: string, data: any) {
    await this.findOne(companyId, id);
    const integration = await (this.prisma.integration as any).update({
      where: { id },
      data: {
        name: data.name,
        environment: data.environment,
        configuration: data.configuration,
      },
    });

    if (data.credentials) {
      for (const [key, value] of Object.entries(data.credentials)) {
        await this.credentials.storeCredential(id, key, value as string);
      }
    }

    await this.logger.logEvent(companyId, userId, 'INTEGRATION_UPDATED', id, {
      provider: integration.provider,
    });
    return integration;
  }

  async toggleStatus(
    companyId: string,
    userId: string,
    id: string,
    isActive: boolean,
  ) {
    await this.findOne(companyId, id);
    const integration = await (this.prisma.integration as any).update({
      where: { id },
      data: {
        is_active: isActive,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      },
    });
    await this.logger.logEvent(
      companyId,
      userId,
      isActive ? 'INTEGRATION_ACTIVATED' : 'INTEGRATION_DEACTIVATED',
      id,
      { provider: integration.provider },
    );
    return integration;
  }
}
