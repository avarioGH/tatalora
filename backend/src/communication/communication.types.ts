export interface TemplateVariables {
  customer_name?: string;
  company_name?: string;
  document_number?: string;
  document_date?: string;
  due_date?: string;
  total_amount?: string;
  paid_amount?: string;
  outstanding_amount?: string;
  document_link?: string;
  [key: string]: string | undefined;
}

export interface RenderResult {
  subject: string;
  body: string;
}

export interface SendInvoiceDto {
  channel: 'WHATSAPP' | 'EMAIL' | 'WHATSAPP_MANUAL';
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  messageBody?: string;
  includePdf?: boolean;
  idempotencyKey?: string;
  reminderStage?: 'BEFORE_DUE' | 'DUE_TODAY' | 'OVERDUE';
}

export interface SaveCommunicationSettingDto {
  wa_enabled?: boolean;
  wa_phone_number_id?: string;
  wa_business_id?: string;
  wa_sender_phone?: string;
  wa_access_token?: string;
  email_enabled?: boolean;
  email_provider?: string;
  email_sender_name?: string;
  email_sender_addr?: string;
  email_reply_to?: string;
  email_smtp_host?: string;
  email_smtp_port?: number;
  email_smtp_user?: string;
  email_smtp_pass?: string;
  email_smtp_secure?: boolean;
  // Automated Invoice Reminder Settings
  reminder_enabled?: boolean;
  reminder_channels?: string;
  reminder_days_before?: number;
  reminder_on_due_date?: boolean;
  reminder_days_after?: number;
  reminder_time?: string;
}

export interface SaveTemplateDto {
  name: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subject?: string;
  body: string;
}

export interface ReminderItemDetail {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: string;
  stage: 'BEFORE_DUE' | 'DUE_TODAY' | 'OVERDUE';
  remainingAmount: number;
  channel: string;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  logId?: string;
  error?: string;
}

export interface ReminderExecutionResult {
  companyId: string;
  totalEligible: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
  details: ReminderItemDetail[];
}
