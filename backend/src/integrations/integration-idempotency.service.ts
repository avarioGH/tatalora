import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationIdempotencyService {
  constructor(private prisma: PrismaService) {}

  async checkAndLock(
    companyId: string,
    integrationId: string,
    key: string,
    operation: string,
  ) {
    try {
      const lock = await this.prisma.integrationIdempotency.create({
        data: {
          company_id: companyId,
          integration_id: integrationId,
          idempotency_key: key,
          operation,
          status: 'PROCESSING',
        },
      });
      return lock;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await this.prisma.integrationIdempotency.findUnique({
          where: {
            company_id_integration_id_idempotency_key: {
              company_id: companyId,
              integration_id: integrationId,
              idempotency_key: key,
            },
          },
        });
        throw new ConflictException({
          message: 'Idempotency conflict',
          state: existing,
        });
      }
      throw error;
    }
  }

  async complete(key: string, response: any) {
    await this.prisma.integrationIdempotency.updateMany({
      where: { idempotency_key: key },
      data: { status: 'COMPLETED', response },
    });
  }

  async fail(key: string, response: any) {
    await this.prisma.integrationIdempotency.updateMany({
      where: { idempotency_key: key },
      data: { status: 'FAILED', response },
    });
  }
}
