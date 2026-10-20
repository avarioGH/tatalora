export enum IntegrationType {
  PAYMENT = 'PAYMENT',
  COMMERCE = 'COMMERCE',
  BANK = 'BANK',
  SHIPPING = 'SHIPPING',
  COMMUNICATION = 'COMMUNICATION',
  OTHER = 'OTHER',
}
export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}
export enum WebhookStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}
export interface WebhookPayload {
  headers: Record<string, string>;
  body: any;
}
