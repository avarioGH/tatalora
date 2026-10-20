import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationService } from './communication.service';
import { ReminderExecutionResult, ReminderItemDetail } from './communication.types';

@Injectable()
export class InvoiceReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private isGlobalJobRunning = false;
  private readonly runningTenants = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly commService: CommunicationService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing InvoiceReminder background scheduler...');
    // Run background check every 60 minutes
    this.timer = setInterval(() => {
      this.executeAllTenantReminders().catch((err) => {
        this.logger.error(`Error executing scheduled invoice reminders: ${err.message}`);
      });
    }, 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('InvoiceReminder scheduler stopped.');
    }
  }

  /**
   * Run reminders for all companies that have reminder_enabled = true.
   * Concurrency-safe: skips if already running globally.
   */
  async executeAllTenantReminders(): Promise<ReminderExecutionResult[]> {
    if (this.isGlobalJobRunning) {
      this.logger.warn('Skipping global reminder execution: previous job is still running.');
      return [];
    }

    this.isGlobalJobRunning = true;
    const results: ReminderExecutionResult[] = [];

    try {
      const activeSettings = await this.prisma.communicationSetting.findMany({
        where: { reminder_enabled: true },
        select: { company_id: true },
      });

      this.logger.log(`Found ${activeSettings.length} active tenants with reminder automation enabled.`);

      for (const item of activeSettings) {
        try {
          const res = await this.executeTenantReminders(item.company_id);
          results.push(res);
        } catch (err: any) {
          this.logger.error(`Tenant reminder run failed for company ${item.company_id}: ${err.message}`);
        }
      }
    } finally {
      this.isGlobalJobRunning = false;
    }

    return results;
  }

  /**
   * Execute reminders for a single company.
   * @param companyId The tenant company ID
   * @param options Execution flags (dryRun, forceSend, userId)
   */
  async executeTenantReminders(
    companyId: string,
    options: { dryRun?: boolean; forceSend?: boolean; userId?: string } = {},
  ): Promise<ReminderExecutionResult> {
    // 1. Prevent overlapping execution on the same tenant
    if (this.runningTenants.has(companyId)) {
      this.logger.warn(`Tenant ${companyId} reminder execution is already in-flight.`);
      return {
        companyId,
        totalEligible: 0,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        errors: ['Proses pengingat sedang berjalan untuk perusahaan ini.'],
        details: [],
      };
    }

    this.runningTenants.add(companyId);

    const result: ReminderExecutionResult = {
      companyId,
      totalEligible: 0,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    try {
      // 2. Fetch company settings and reminder configuration
      const settings = await this.prisma.communicationSetting.findUnique({
        where: { company_id: companyId },
      });

      if (!settings || (!settings.reminder_enabled && !options.forceSend && !options.dryRun)) {
        this.logger.log(`Tenant ${companyId} reminders disabled or settings not found.`);
        return result;
      }

      const compSetting = await this.prisma.companySetting.findUnique({
        where: { company_id: companyId },
      });
      const timezone = compSetting?.timezone || 'Asia/Jakarta';

      // 3. Compute local calendar date in company timezone (YYYY-MM-DD)
      const now = new Date();
      let todayStr: string;
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        todayStr = formatter.format(now);
      } catch (_) {
        todayStr = now.toISOString().split('T')[0];
      }

      const todayParts = todayStr.split('-').map(Number);
      const todayDate = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));

      // 4. Query eligible candidate invoices (bounded batch of 50)
      const candidates = await this.prisma.invoice.findMany({
        where: {
          company_id: companyId,
          type: 'AR',
          remaining_amount: { gt: 0 },
          status: { notIn: ['PAID', 'CANCELLED', 'VOID', 'DRAFT'] },
          due_date: { not: null },
        },
        include: {
          customer: true,
        },
        orderBy: { due_date: 'asc' },
        take: 50,
      });

      result.totalEligible = candidates.filter((c) => !c.deleted_at).length;

      // 5. Evaluate and process each invoice
      const daysBefore = settings.reminder_days_before ?? 3;
      const onDueDate = settings.reminder_on_due_date !== false;
      const daysAfter = settings.reminder_days_after ?? 3;
      const enabledChannels = (settings.reminder_channels || 'WHATSAPP,EMAIL')
        .split(',')
        .map((s) => s.trim().toUpperCase());

      // Fetch tenant templates
      const templates = await this.commService.getTemplates(companyId);

      for (const invoice of candidates) {
        if (!invoice.due_date || invoice.deleted_at) continue;

        // Calculate due date in company timezone
        let invDueStr: string;
        try {
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          invDueStr = formatter.format(new Date(invoice.due_date));
        } catch (_) {
          invDueStr = new Date(invoice.due_date).toISOString().split('T')[0];
        }

        const dueParts = invDueStr.split('-').map(Number);
        const invDueDate = new Date(Date.UTC(dueParts[0], dueParts[1] - 1, dueParts[2]));

        const diffTime = invDueDate.getTime() - todayDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let stage: 'BEFORE_DUE' | 'DUE_TODAY' | 'OVERDUE' | null = null;
        if (diffDays === daysBefore) {
          stage = 'BEFORE_DUE';
        } else if (diffDays === 0 && onDueDate) {
          stage = 'DUE_TODAY';
        } else if (diffDays === -daysAfter) {
          stage = 'OVERDUE';
        }

        // If not matching configured trigger stage, skip
        if (!stage) {
          continue;
        }

        result.processed++;

        // Strict compound idempotency key per invoice per stage per due date
        const baseKey = `REMINDER:${companyId}:${invoice.id}:${stage}:${invDueStr}`;

        // Check if already dispatched for this stage
        const alreadySent = await this.prisma.communicationLog.findFirst({
          where: {
            company_id: companyId,
            idempotency_key: { startsWith: baseKey },
            status: { in: ['SENT', 'SUBMITTED', 'QUEUED'] },
          },
        });

        if (alreadySent) {
          result.skipped++;
          result.details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            customerName: invoice.customer?.name || 'Customer',
            dueDate: invDueStr,
            stage,
            remainingAmount: invoice.remaining_amount,
            channel: alreadySent.channel,
            status: 'SKIPPED',
            logId: alreadySent.id,
          });
          continue;
        }

        if (options.dryRun) {
          result.sent++;
          result.details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            customerName: invoice.customer?.name || 'Customer',
            dueDate: invDueStr,
            stage,
            remainingAmount: invoice.remaining_amount,
            channel: enabledChannels.join('/'),
            status: 'SENT',
          });
          continue;
        }

        // Prepare template variables
        const { variables } = await this.commService.getInvoiceVariables(companyId, invoice.id);

        let invoiceSentCount = 0;
        let invoiceErrors: string[] = [];

        // Dispatch via enabled channels
        for (const channel of enabledChannels) {
          const channelKey = `${baseKey}:${channel}`;

          try {
            if (channel === 'WHATSAPP' && invoice.customer?.phone) {
              const tplName = `REMINDER_${stage}_WA`;
              const tpl = templates.find((t) => t.name === tplName && t.channel === 'WHATSAPP')
                || templates.find((t) => t.name === 'INVOICE_WHATSAPP' && t.channel === 'WHATSAPP');
              const body = this.commService.renderText(tpl?.body || '', variables);

              const waRes = await this.commService.sendInvoice(
                companyId,
                options.userId || 'SYSTEM_AUTO_REMINDER',
                invoice.id,
                {
                  channel: settings.wa_enabled && settings.wa_access_token ? 'WHATSAPP' : 'WHATSAPP_MANUAL',
                  recipientPhone: invoice.customer.phone,
                  recipientName: invoice.customer.name,
                  messageBody: body,
                  idempotencyKey: channelKey,
                  reminderStage: stage,
                },
              );

              if (waRes.status === 'SENT' || waRes.status === 'SUBMITTED') {
                invoiceSentCount++;
                result.details.push({
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoice_number,
                  customerName: invoice.customer.name,
                  dueDate: invDueStr,
                  stage,
                  remainingAmount: invoice.remaining_amount,
                  channel: 'WHATSAPP',
                  status: 'SENT',
                });
              }
            }

            if (channel === 'EMAIL' && invoice.customer?.email) {
              const tplName = `REMINDER_${stage}_EMAIL`;
              const tpl = templates.find((t) => t.name === tplName && t.channel === 'EMAIL')
                || templates.find((t) => t.name === 'INVOICE_EMAIL' && t.channel === 'EMAIL');
              const subject = this.commService.renderText(tpl?.subject || 'Pengingat Tagihan', variables);
              const body = this.commService.renderText(tpl?.body || '', variables);

              const emailRes = await this.commService.sendInvoice(
                companyId,
                options.userId || 'SYSTEM_AUTO_REMINDER',
                invoice.id,
                {
                  channel: 'EMAIL',
                  recipientEmail: invoice.customer.email,
                  recipientName: invoice.customer.name,
                  subject,
                  messageBody: body,
                  includePdf: true,
                  idempotencyKey: channelKey,
                  reminderStage: stage,
                },
              );

              if (emailRes.status === 'SENT') {
                invoiceSentCount++;
                result.details.push({
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoice_number,
                  customerName: invoice.customer.name,
                  dueDate: invDueStr,
                  stage,
                  remainingAmount: invoice.remaining_amount,
                  channel: 'EMAIL',
                  status: 'SENT',
                });
              }
            }
          } catch (dispatchErr: any) {
            this.logger.error(`Failed to send ${channel} reminder for invoice ${invoice.invoice_number}: ${dispatchErr.message}`);
            invoiceErrors.push(`${channel}: ${dispatchErr.message}`);
          }
        }

        if (invoiceSentCount > 0) {
          result.sent += invoiceSentCount;
        } else if (invoiceErrors.length > 0) {
          result.failed++;
          result.errors.push(`Invoice ${invoice.invoice_number}: ${invoiceErrors.join(', ')}`);
          result.details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            customerName: invoice.customer?.name || 'Customer',
            dueDate: invDueStr,
            stage,
            remainingAmount: invoice.remaining_amount,
            channel: enabledChannels.join(','),
            status: 'FAILED',
            error: invoiceErrors.join(', '),
          });
        }
      }

      // 6. Update execution status in database
      const finalStatus = result.failed > 0 && result.sent > 0
        ? 'PARTIAL'
        : result.failed > 0
        ? 'FAILED'
        : 'SUCCESS';

      if (!options.dryRun) {
        await this.prisma.communicationSetting.update({
          where: { company_id: companyId },
          data: {
            reminder_last_run: new Date(),
            reminder_last_status: finalStatus,
            reminder_last_count: result.sent,
            reminder_last_error: result.errors.length > 0 ? result.errors.slice(0, 3).join('; ') : null,
          },
        });
      }
    } finally {
      this.runningTenants.delete(companyId);
    }

    return result;
  }
}
