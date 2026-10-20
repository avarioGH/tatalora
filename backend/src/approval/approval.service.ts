import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalRequestedEvent,
  ApprovalApprovedEvent,
  ApprovalRejectedEvent,
  ApprovalCancelledEvent,
} from '../events/approval.events';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async requestApproval(
    companyId: string,
    actor: string,
    data: {
      module: string;
      referenceId: string;
      title: string;
      description?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Idempotency: Is there already a pending approval for this document?
      const existing = await tx.approvalRequest.findFirst({
        where: {
          company_id: companyId,
          module: data.module,
          reference_id: data.referenceId,
          status: 'PENDING',
        },
      });
      if (existing) return existing; // Safe return

      // 2. Validate Domain Source Document
      // Depending on the module, we verify the referenceId exists and is in the correct state
      // (Simplified: in reality we would dynamically check each table)
      await this.validateSourceDocument(
        tx,
        companyId,
        data.module,
        data.referenceId,
      );

      // 3. Create Approval Request
      const request = await tx.approvalRequest.create({
        data: {
          company_id: companyId,

          module: data.module,
          reference_id: data.referenceId,
          title: data.title,
          description: data.description,
          status: 'PENDING',
        },
      });

      // 4. Log Action
      await tx.approvalLog.create({
        data: {
          approval_request_id: request.id,
          action: 'REQUESTED',
          acted_by: actor,
          notes: 'Approval Requested',
        },
      });

      // 5. Emit Event
      await this.eventEmitter.emitAsync(
        'approval.requested',
        new ApprovalRequestedEvent(
          companyId,
          request.module,
          request.reference_id,
          request.id,
          actor,
          tx as any,
        ),
      );

      return request;
    });
  }

  async approve(
    companyId: string,
    actor: string,
    approvalRequestId: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.approvalRequest.findFirst({
        where: { id: approvalRequestId, company_id: companyId },
      });
      if (!req) throw new NotFoundException('Approval request not found');

      // Idempotency
      if (req.status === 'APPROVED') return req;

      // State Machine Validation
      if (req.status !== 'PENDING')
        throw new BadRequestException('Can only approve PENDING requests');

      // Self-Approval Block (unless explicit business logic says otherwise)
      const reqLog = await tx.approvalLog.findFirst({
        where: { approval_request_id: req.id, action: 'REQUESTED' },
      });
      if (reqLog && reqLog.acted_by === actor) {
        throw new ForbiddenException('Cannot self-approve your own request');
      }

      const updatedRes = await tx.approvalRequest.updateMany({
        where: { id: approvalRequestId, status: 'PENDING' },
        data: { status: 'APPROVED' },
      });
      if (updatedRes.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict or Request is no longer PENDING',
        );
      }
      const updated = await tx.approvalRequest.findUnique({
        where: { id: approvalRequestId },
      });

      await tx.approvalLog.create({
        data: {
          approval_request_id: approvalRequestId,
          action: 'APPROVED',
          acted_by: actor,
          notes: note || 'Approved.',
        },
      });

      await this.eventEmitter.emitAsync(
        'approval.approved',
        new ApprovalApprovedEvent(
          companyId,
          req.module,
          req.reference_id,
          req.id,
          actor,
          note || '',
          tx as any,
        ),
      );

      return updated;
    });
  }

  async reject(
    companyId: string,
    actor: string,
    approvalRequestId: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.approvalRequest.findFirst({
        where: { id: approvalRequestId, company_id: companyId },
      });
      if (!req) throw new NotFoundException('Approval request not found');

      // Idempotency
      if (req.status === 'REJECTED') return req;

      // State Machine Validation
      if (req.status !== 'PENDING')
        throw new BadRequestException('Can only reject PENDING requests');

      const updatedRes = await tx.approvalRequest.updateMany({
        where: { id: approvalRequestId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      if (updatedRes.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict or Request is no longer PENDING',
        );
      }
      const updated = await tx.approvalRequest.findUnique({
        where: { id: approvalRequestId },
      });

      await tx.approvalLog.create({
        data: {
          approval_request_id: approvalRequestId,
          action: 'REJECTED',
          acted_by: actor,
          notes: note || 'Rejected.',
        },
      });

      await this.eventEmitter.emitAsync(
        'approval.rejected',
        new ApprovalRejectedEvent(
          companyId,
          req.module,
          req.reference_id,
          req.id,
          actor,
          note || '',
          tx as any,
        ),
      );

      return updated;
    });
  }

  async cancel(companyId: string, actor: string, approvalRequestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.approvalRequest.findFirst({
        where: { id: approvalRequestId, company_id: companyId },
      });
      if (!req) throw new NotFoundException('Approval request not found');

      // Idempotency
      if (req.status === 'CANCELLED') return req;

      // State Machine Validation
      if (req.status !== 'PENDING')
        throw new BadRequestException('Can only cancel PENDING requests');

      const updatedRes = await tx.approvalRequest.updateMany({
        where: { id: approvalRequestId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (updatedRes.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict or Request is no longer PENDING',
        );
      }
      const updated = await tx.approvalRequest.findUnique({
        where: { id: approvalRequestId },
      });

      await tx.approvalLog.create({
        data: {
          approval_request_id: approvalRequestId,
          action: 'CANCELLED',
          acted_by: actor,
          notes: 'Cancelled.',
        },
      });

      await this.eventEmitter.emitAsync(
        'approval.cancelled',
        new ApprovalCancelledEvent(
          companyId,
          req.module,
          req.reference_id,
          req.id,
          actor,
          tx as any,
        ),
      );

      return updated;
    });
  }

  private async validateSourceDocument(
    tx: any,
    companyId: string,
    moduleType: string,
    referenceId: string,
  ) {
    // 11. Source Document Validation (Tenant Isolation built-in)
    // Ensures we aren't approving ghosts or cross-company records
    let doc: any = null;
    switch (moduleType) {
      case 'EXPENSE_CLAIM':
        doc = await tx.expenseClaim.findFirst({
          where: { id: referenceId, company_id: companyId },
        });
        if (!doc) throw new NotFoundException('ExpenseClaim not found');
        if (doc.status !== 'SUBMITTED')
          throw new BadRequestException(
            'ExpenseClaim must be SUBMITTED to request approval',
          );
        break;
      case 'PAYROLL':
        doc = await tx.payroll.findFirst({
          where: { id: referenceId, company_id: companyId },
        });
        if (!doc) throw new NotFoundException('Payroll not found');
        if (doc.status !== 'CALCULATED')
          throw new BadRequestException(
            'Payroll must be CALCULATED to request approval',
          );
        break;
      case 'PURCHASE_ORDER':
        doc = await tx.purchaseOrder.findFirst({
          where: { id: referenceId, company_id: companyId },
        });
        if (!doc) throw new NotFoundException('PurchaseOrder not found');
        if (doc.status !== 'DRAFT')
          throw new BadRequestException('PO must be DRAFT to request approval');
        break;
      case 'LEAVE_REQUEST':
        doc = await tx.leaveRequest.findFirst({
          where: { id: referenceId, company_id: companyId },
        });
        if (!doc) throw new NotFoundException('LeaveRequest not found');
        if (doc.status !== 'SUBMITTED')
          throw new BadRequestException(
            'LeaveRequest must be SUBMITTED to request approval',
          );
        break;
      default:
        throw new BadRequestException(
          'Unsupported document type for approval: ' + moduleType,
        );
    }
  }

  async getPendingApprovals(companyId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { company_id: companyId, status: 'PENDING' },

      orderBy: { created_at: 'asc' },
    });
  }
}
