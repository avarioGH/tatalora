import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApprovalApprovedEvent,
  ApprovalRejectedEvent,
} from '../events/approval.events';

@Injectable()
export class ApprovalDomainListener {
  private readonly logger = new Logger(ApprovalDomainListener.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('approval.approved', { async: false })
  async handleApprovalApproved(event: ApprovalApprovedEvent) {
    const tx = event.tx || this.prisma;

    // Domain Integration: Apply the state transition on the Source Document
    // Note: The actual business impact (like GL posting) is STILL deferred to the
    // Domain's explicit next step (e.g., ExpenseService.postClaim).
    // Approval merely updates the status of the authoritative domain record.

    switch (event.moduleType) {
      case 'EXPENSE_CLAIM':
        await (tx.expenseClaim as any).updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'SUBMITTED',
          },
          data: {
            status: 'APPROVED',
            approved_at: new Date(),
            approved_by: event.actor,
          },
        });
        break;
      case 'PAYROLL':
        await tx.payroll.updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'CALCULATED',
          },
          data: { status: 'APPROVED' },
        });
        break;
      case 'PURCHASE_ORDER':
        await tx.purchaseOrder.updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'DRAFT',
          },
          data: { status: 'APPROVED' },
        });
        break;
      case 'LEAVE_REQUEST':
        await tx.leaveRequest.updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'SUBMITTED',
          },
          data: { status: 'APPROVED' },
        });
        break;
      default:
        this.logger.warn(
          'No domain handler for approved module ' + event.moduleType,
        );
    }
  }

  @OnEvent('approval.rejected', { async: false })
  async handleApprovalRejected(event: ApprovalRejectedEvent) {
    const tx = event.tx || this.prisma;

    switch (event.moduleType) {
      case 'EXPENSE_CLAIM':
        await (tx.expenseClaim as any).updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'SUBMITTED',
          },
          data: { status: 'REJECTED', rejected_at: new Date() },
        });
        break;
      case 'PAYROLL':
        // If rejected, maybe it goes back to DRAFT or stays CALCULATED but flagged.
        // For simplicity, let's reset to DRAFT so it can be recalculated.
        await tx.payroll.updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'CALCULATED',
          },
          data: { status: 'DRAFT' },
        });
        break;
      case 'PURCHASE_ORDER':
        await tx.purchaseOrder.updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'DRAFT',
          },
          data: { status: 'CANCELLED' }, // or REJECTED if supported
        });
        break;
      case 'LEAVE_REQUEST':
        await tx.leaveRequest.updateMany({
          where: {
            id: event.referenceId,
            company_id: event.companyId,
            status: 'SUBMITTED',
          },
          data: { status: 'REJECTED' },
        });
        break;
      default:
        this.logger.warn(
          'No domain handler for rejected module ' + event.moduleType,
        );
    }
  }
}
