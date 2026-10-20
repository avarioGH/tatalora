import { Prisma } from '@prisma/client';

export class ApprovalRequestedEvent {
  constructor(
    public readonly companyId: string,
    public readonly moduleType: string,
    public readonly referenceId: string,
    public readonly approvalRequestId: string,
    public readonly actor: string,
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class ApprovalApprovedEvent {
  constructor(
    public readonly companyId: string,
    public readonly moduleType: string,
    public readonly referenceId: string,
    public readonly approvalRequestId: string,
    public readonly actor: string,
    public readonly note: string,
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class ApprovalRejectedEvent {
  constructor(
    public readonly companyId: string,
    public readonly moduleType: string,
    public readonly referenceId: string,
    public readonly approvalRequestId: string,
    public readonly actor: string,
    public readonly note: string,
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class ApprovalCancelledEvent {
  constructor(
    public readonly companyId: string,
    public readonly moduleType: string,
    public readonly referenceId: string,
    public readonly approvalRequestId: string,
    public readonly actor: string,
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}
