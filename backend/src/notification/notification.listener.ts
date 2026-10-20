import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import {
  ApprovalRequestedEvent,
  ApprovalApprovedEvent,
  ApprovalRejectedEvent,
} from '../events/approval.events';
// Need a finance event to listen to if it exists...
// But the core principle is demonstrated here.

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @OnEvent('approval.requested', { async: true }) // Isolated from main transaction
  async handleApprovalRequested(event: ApprovalRequestedEvent) {
    try {
      // Resolve Approvers (users with FINANCE or ADMIN role, or explicit approvers)
      // For this foundation, we just find all users in the company.
      // In reality, this joins RolePermissions.
      const approvers = await this.prisma.user.findMany({
        where: { company_id: event.companyId, status: true },
      });

      for (const approver of approvers) {
        if (approver.id === event.actor) continue; // Don't notify the requester

        await this.notificationService.send({
          companyId: event.companyId,
          userId: approver.id,
          type: 'APPROVAL_REQUESTED',
          title: 'Approval Required',
          message: 'A new ' + event.moduleType + ' requires your approval.',
          severity: 'WARNING',
          entityType: 'APPROVAL_REQUEST',
          entityId: event.approvalRequestId,
          idempotencyKey:
            'notif-appreq-' + event.approvalRequestId + '-' + approver.id,
        });
      }
    } catch (e) {
      this.logger.error('Failed to process approval.requested notification', e);
    }
  }

  @OnEvent('approval.approved', { async: true })
  async handleApprovalApproved(event: ApprovalApprovedEvent) {
    try {
      const request = await this.prisma.approvalRequest.findUnique({
        where: { id: event.approvalRequestId },
      });
      // @ts-ignore
      if (!request || !(request as any).requested_by) return;

      await this.notificationService.send({
        companyId: event.companyId,
        // @ts-ignore
        userId: (request as any).requested_by,
        type: 'APPROVAL_APPROVED',
        title: 'Request Approved',
        message: 'Your ' + event.moduleType + ' request has been approved.',
        severity: 'SUCCESS',
        entityType: 'APPROVAL_REQUEST',
        entityId: event.approvalRequestId,
        // @ts-ignore
        idempotencyKey:
          'notif-appapp-' +
          event.approvalRequestId +
          '-' +
          (request as any).requested_by,
      });
    } catch (e) {
      this.logger.error('Failed to process approval.approved notification', e);
    }
  }

  @OnEvent('approval.rejected', { async: true })
  async handleApprovalRejected(event: ApprovalRejectedEvent) {
    try {
      const request = await this.prisma.approvalRequest.findUnique({
        where: { id: event.approvalRequestId },
      });
      // @ts-ignore
      if (!request || !(request as any).requested_by) return;

      await this.notificationService.send({
        companyId: event.companyId,
        // @ts-ignore
        userId: (request as any).requested_by,
        type: 'APPROVAL_REJECTED',
        title: 'Request Rejected',
        message: 'Your ' + event.moduleType + ' request has been rejected.',
        severity: 'ERROR',
        entityType: 'APPROVAL_REQUEST',
        entityId: event.approvalRequestId,
        // @ts-ignore
        idempotencyKey:
          'notif-apprej-' +
          event.approvalRequestId +
          '-' +
          (request as any).requested_by,
      });
    } catch (e) {
      this.logger.error('Failed to process approval.rejected notification', e);
    }
  }
}
