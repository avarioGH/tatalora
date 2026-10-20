import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogDto {
  company_id: string;
  user_id?: string;
  ip_address?: string;
  action: string;
  entity: string;
  entity_id: string;
  before_data?: any;
  after_data?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogDto) {
    // Append-only. No delete or update methods exist in this service.
    return this.prisma.auditLog.create({
      data: {
        company_id: data.company_id,
        user_id: data.user_id,
        ip_address: data.ip_address,
        action: data.action,
        entity: data.entity,
        entity_id: data.entity_id,
        before_data: (data.before_data as any) ?? undefined,
        after_data: (data.after_data as any) ?? undefined,
      },
    });
  }
}
