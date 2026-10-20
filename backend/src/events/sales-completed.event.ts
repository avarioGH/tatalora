import { Prisma } from '@prisma/client';

export class SalesCompletedEvent {
  eventId: string;
  eventType: string = 'SalesCompleted';
  companyId: string;
  occurredAt: Date = new Date();
  sourceModule: string = 'POS';
  sourceEntity: string = 'SalesOrder';
  sourceEntityId: string;
  payload: {
    totalAmount: number;
    paidAmount?: number;
    paymentMethod: string;
    userId: string;
  };
  tx?: Prisma.TransactionClient; // Passing transaction for ACID compliance

  constructor(
    data: Partial<SalesCompletedEvent> & { tx?: Prisma.TransactionClient },
  ) {
    Object.assign(this, data);
    this.eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}
