import { Prisma } from '@prisma/client';

export class InvoicePostedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string, // Invoice ID
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      type: string;
      totalAmount: number;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class PaymentProcessedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string, // Payment ID
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      type: string; // 'RECEIVABLE' | 'PAYABLE'
      amount: number;
      accountId: string; // CashAccount ID
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class PayrollPostedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string, // Payroll ID
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      netSalary: number;
      period: string;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class PayrollPaymentEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string, // Payroll ID
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      amount: number;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class InventoryValuationEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string,
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      type:
        | 'ADJUSTMENT_LOSS'
        | 'ADJUSTMENT_GAIN'
        | 'COGS'
        | 'GOODS_RECEIPT'
        | 'MANUFACTURING_CONSUMPTION'
        | 'MANUFACTURING_PRODUCTION'
        | 'DISPOSAL_LOSS'
        | 'DISPOSAL_LOSS_REVERSAL'
        | 'PURCHASE_RETURN'
        | 'PURCHASE_RETURN_REVERSAL'
        | 'SALES_RETURN_COGS'
        | 'SALES_RETURN_COGS_REVERSAL';
      totalValue: number;
      description?: string;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class ExpensePostedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string,
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      totalAmount: number;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class AssetCapitalizedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string,
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      acquisitionCost: number;
      assetAccountId: string;
      clearingAccountId: string;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class AssetDepreciationPostedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string, // AssetDepreciation ID
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      depreciationAmount: number;
      depreciationExpenseAccountId: string;
      accumulatedDepreciationAccountId: string;
      period: string;
      assetId: string;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}

export class AssetDisposedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string,
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      originalCost: number;
      accumulatedDepreciation: number;
      disposalProceeds: number;
      gainLossAmount: number;
      assetAccountId: string;
      accumulatedDepreciationAccountId: string;
      proceedsAccountId: string; // e.g., Cash or Receivable
      gainLossAccountId: string;
      isGain: boolean;
    },
    public readonly tx?: Prisma.TransactionClient,
  ) {}
}
