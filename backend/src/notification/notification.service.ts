import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity?: string; // INFO, SUCCESS, WARNING, ERROR
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  idempotencyKey?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  // Helper to map InternalInbox to the expected Notification format
  private mapToNotification(inbox: any) {
    let actionUrl = '';
    let severity = 'INFO';
    if (inbox.reference_id) {
      const parts = inbox.reference_id.split('|||');
      if (parts.length >= 3) {
        actionUrl = parts[0];
        severity = parts[1];
        // parts[2] is idempotencyKey
      }
    }
    return {
      id: inbox.id,
      company_id: inbox.company_id,
      user_id: inbox.user_id,
      type: inbox.message_type,
      title: inbox.title,
      message: inbox.content,
      is_read: inbox.is_read,
      created_at: inbox.created_at,
      action_url: actionUrl,
      severity: severity,
    };
  }

  async send(data: CreateNotificationDto) {
    try {
      const refId = `${data.actionUrl || ''}|||${data.severity || 'INFO'}|||${data.idempotencyKey || ''}`;

      if (data.idempotencyKey) {
        // Use findFirst with string matching on the reference_id which contains our idempotency key
        const existing = await this.prisma.internalInbox.findFirst({
          where: {
            company_id: data.companyId,
            user_id: data.userId,
            reference_id: { endsWith: '|||' + data.idempotencyKey },
          },
        });
        if (existing) {
          this.logger.debug(
            'Skipping duplicate notification: ' + data.idempotencyKey,
          );
          return this.mapToNotification(existing);
        }
      }

      const notification = await this.prisma.internalInbox.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          message_type: 'Notification',
          title: data.title,
          content: data.message,
          reference_id: refId,
        },
      });

      return this.mapToNotification(notification);
    } catch (e) {
      this.logger.error('Failed to save notification', e);
      // Fail silently to prevent domain rollback
      return null;
    }
  }

  async getNotifications(
    companyId: string,
    userId: string,
    skip = 0,
    take = 50,
  ) {
    const records = await this.prisma.internalInbox.findMany({
      where: {
        company_id: companyId,
        user_id: userId,
        message_type: 'Notification',
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
    return records.map((r) => this.mapToNotification(r));
  }

  async getUnreadCount(companyId: string, userId: string) {
    return this.prisma.internalInbox.count({
      where: {
        company_id: companyId,
        user_id: userId,
        message_type: 'Notification',
        is_read: false,
      },
    });
  }

  async markAsRead(companyId: string, userId: string, notificationId: string) {
    const notif = await this.prisma.internalInbox.findFirst({
      where: { id: notificationId, company_id: companyId, user_id: userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    if (notif.is_read) return this.mapToNotification(notif);

    const updated = await this.prisma.internalInbox.update({
      where: { id: notificationId },
      data: { is_read: true }, // InternalInbox doesn't have read_at
    });
    return this.mapToNotification(updated);
  }

  async markAllAsRead(companyId: string, userId: string) {
    return this.prisma.internalInbox.updateMany({
      where: {
        company_id: companyId,
        user_id: userId,
        message_type: 'Notification',
        is_read: false,
      },
      data: { is_read: true },
    });
  }

  async sendToOwners(
    companyId: string,
    data: Omit<CreateNotificationDto, 'companyId' | 'userId'>,
  ) {
    try {
      const owners = await this.prisma.user.findMany({
        where: { company_id: companyId, status: true },
        include: { role: true },
      });
      const ownerUsers = owners.filter(
        (u: any) =>
          u.role?.name?.toLowerCase().includes('owner') ||
          u.name?.toLowerCase().includes('ikan'),
      );
      for (const owner of ownerUsers) {
        await this.send({
          ...data,
          companyId,
          userId: owner.id,
          idempotencyKey: data.idempotencyKey
            ? `${data.idempotencyKey}-${owner.id}`
            : undefined,
        });
      }
    } catch (e) {
      this.logger.error('Failed to sendToOwners', e);
    }
  }
}
