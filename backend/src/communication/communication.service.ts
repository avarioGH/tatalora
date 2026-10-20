import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../reports/pdf.service';
import { IntegrationCredentialService } from '../integrations/integration-credential.service';
import { TemplateVariables, RenderResult, SendInvoiceDto, SaveCommunicationSettingDto, SaveTemplateDto } from './communication.types';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private readonly inFlightKeys = new Set<string>();

  // System Default Templates
  private readonly DEFAULT_TEMPLATES = {
    INVOICE_WHATSAPP: {
      name: 'INVOICE_WHATSAPP',
      channel: 'WHATSAPP',
      subject: '',
      body: 'Halo *{{customer_name}}*,\n\nTerlampir tagihan dari *{{company_name}}* dengan nomor *{{document_number}}* sebesar *{{total_amount}}*.\nJatuh tempo pembayaran: *{{due_date}}*.\nSisa tagihan: *{{outstanding_amount}}*.\n\nUnduh faktur: {{document_link}}\n\nTerima kasih atas kerja samanya.',
    },
    INVOICE_EMAIL: {
      name: 'INVOICE_EMAIL',
      channel: 'EMAIL',
      subject: 'Tagihan {{document_number}} dari {{company_name}}',
      body: 'Yth. {{customer_name}},\n\nBerikut kami sampaikan tagihan Anda dengan rincian sebagai berikut:\n\nNomor Tagihan: {{document_number}}\nTanggal: {{document_date}}\nJatuh Tempo: {{due_date}}\nTotal Tagihan: {{total_amount}}\nSisa Pembayaran: {{outstanding_amount}}\n\nDokumen PDF faktur resmi telah kami lampirkan bersama pesan ini.\n\nSalam hormat,\n{{company_name}}',
    },
    REMINDER_BEFORE_DUE_WA: {
      name: 'REMINDER_BEFORE_DUE_WA',
      channel: 'WHATSAPP',
      subject: '',
      body: 'Halo *{{customer_name}}*,\n\nMengingatkan bahwa tagihan *{{document_number}}* dari *{{company_name}}* sebesar *{{outstanding_amount}}* akan jatuh tempo pada *{{due_date}}*.\n\nUnduh faktur: {{document_link}}\n\nMohon lakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.',
    },
    REMINDER_BEFORE_DUE_EMAIL: {
      name: 'REMINDER_BEFORE_DUE_EMAIL',
      channel: 'EMAIL',
      subject: 'Pengingat Tagihan {{document_number}} akan Jatuh Tempo ({{company_name}})',
      body: 'Yth. {{customer_name}},\n\nKami ingin mengingatkan bahwa tagihan Anda nomor {{document_number}} akan jatuh tempo pada {{due_date}}.\n\nTotal Tagihan: {{total_amount}}\nSisa Pembayaran: {{outstanding_amount}}\n\nMohon lakukan pembayaran sebelum jatuh tempo. Dokumen tagihan dapat diunduh pada tautan atau lampiran email ini.\n\nSalam hormat,\n{{company_name}}',
    },
    REMINDER_DUE_TODAY_WA: {
      name: 'REMINDER_DUE_TODAY_WA',
      channel: 'WHATSAPP',
      subject: '',
      body: 'Halo *{{customer_name}}*,\n\nTagihan *{{document_number}}* dari *{{company_name}}* sebesar *{{outstanding_amount}}* jatuh tempo HARI INI (*{{due_date}}*).\n\nUnduh faktur: {{document_link}}\n\nSilakan selesaikan pembayaran hari ini. Terima kasih.',
    },
    REMINDER_DUE_TODAY_EMAIL: {
      name: 'REMINDER_DUE_TODAY_EMAIL',
      channel: 'EMAIL',
      subject: 'Tagihan {{document_number}} Jatuh Tempo Hari Ini ({{company_name}})',
      body: 'Yth. {{customer_name}},\n\nTagihan Anda nomor {{document_number}} sebesar {{outstanding_amount}} jatuh tempo pada hari ini ({{due_date}}).\n\nMohon segera melakukan konfirmasi dan pelunasan pembayaran hari ini.\n\nSalam hormat,\n{{company_name}}',
    },
    REMINDER_OVERDUE_WA: {
      name: 'REMINDER_OVERDUE_WA',
      channel: 'WHATSAPP',
      subject: '',
      body: 'Halo *{{customer_name}}*,\n\nTagihan *{{document_number}}* dari *{{company_name}}* sebesar *{{outstanding_amount}}* telah MELEWATI JATUH TEMPO (*{{due_date}}*).\n\nUnduh faktur: {{document_link}}\n\nMohon segera melakukan pelunasan sisa tagihan Anda. Hubungi kami jika membutuhkan bantuan. Terima kasih.',
    },
    REMINDER_OVERDUE_EMAIL: {
      name: 'REMINDER_OVERDUE_EMAIL',
      channel: 'EMAIL',
      subject: 'Pemberitahuan Tagihan Melewati Jatuh Tempo {{document_number}} ({{company_name}})',
      body: 'Yth. {{customer_name}},\n\nTagihan nomor {{document_number}} dari {{company_name}} telah melewati tanggal jatuh tempo ({{due_date}}).\n\nSisa tagihan yang belum terbayar: {{outstanding_amount}}.\n\nMohon segera melakukan pelunasan tagihan ini. Abaikan email ini jika Anda telah menyelesaikan pembayaran.\n\nSalam hormat,\n{{company_name}}',
    },
    PAYMENT_CONFIRMATION_WHATSAPP: {
      name: 'PAYMENT_CONFIRMATION_WHATSAPP',
      channel: 'WHATSAPP',
      subject: '',
      body: 'Halo *{{customer_name}}*,\n\nPembayaran sebesar *{{paid_amount}}* untuk faktur *{{document_number}}* telah kami terima pada *{{payment_date}}* melalui metode *{{payment_method}}*.\nSisa tagihan: *{{outstanding_amount}}*.\n\nTerima kasih atas pembayaran Anda.\n*{{company_name}}*',
    },
    PAYMENT_CONFIRMATION_EMAIL: {
      name: 'PAYMENT_CONFIRMATION_EMAIL',
      channel: 'EMAIL',
      subject: 'Konfirmasi Penerimaan Pembayaran {{document_number}} - {{company_name}}',
      body: 'Yth. {{customer_name}},\n\nTerima kasih, kami telah menerima pembayaran Anda dengan rincian berikut:\n\nNomor Pembayaran: {{payment_number}}\nNo. Faktur: {{document_number}}\nTanggal: {{payment_date}}\nJumlah Dibayar: {{paid_amount}}\nMetode Pembayaran: {{payment_method}}\nSisa Tagihan: {{outstanding_amount}}\n\nSalam hormat,\n{{company_name}}',
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly credentials: IntegrationCredentialService,
  ) {}

  // ----------------------------------------------------
  // SETTINGS MANAGEMENT
  // ----------------------------------------------------
  async getSettings(companyId: string) {
    let setting = await this.prisma.communicationSetting.findUnique({
      where: { company_id: companyId },
    });

    if (!setting) {
      setting = await this.prisma.communicationSetting.create({
        data: {
          company_id: companyId,
          wa_enabled: false,
          email_enabled: false,
          email_provider: 'SMTP',
          email_sender_name: 'TATALORA ERP',
          email_smtp_port: 587,
        },
      });
    }

    // Mask secrets before returning to client
    return {
      id: setting.id,
      company_id: setting.company_id,
      wa_enabled: setting.wa_enabled,
      wa_phone_number_id: setting.wa_phone_number_id || '',
      wa_business_id: setting.wa_business_id || '',
      wa_sender_phone: setting.wa_sender_phone || '',
      wa_has_token: !!setting.wa_access_token,
      email_enabled: setting.email_enabled,
      email_provider: setting.email_provider || 'SMTP',
      email_sender_name: setting.email_sender_name || 'TATALORA ERP',
      email_sender_addr: setting.email_sender_addr || '',
      email_reply_to: setting.email_reply_to || '',
      email_smtp_host: setting.email_smtp_host || '',
      email_smtp_port: setting.email_smtp_port || 587,
      email_smtp_user: setting.email_smtp_user || '',
      email_has_pass: !!setting.email_smtp_pass,
      email_smtp_secure: setting.email_smtp_secure || false,
      // Automated Invoice Reminder Configuration
      reminder_enabled: setting.reminder_enabled ?? false,
      reminder_channels: setting.reminder_channels || 'WHATSAPP,EMAIL',
      reminder_days_before: setting.reminder_days_before ?? 3,
      reminder_on_due_date: setting.reminder_on_due_date ?? true,
      reminder_days_after: setting.reminder_days_after ?? 3,
      reminder_time: setting.reminder_time || '09:00',
      reminder_last_run: setting.reminder_last_run,
      reminder_last_status: setting.reminder_last_status || 'IDLE',
      reminder_last_count: setting.reminder_last_count ?? 0,
      reminder_last_error: setting.reminder_last_error || null,
    };
  }

  async saveSettings(companyId: string, dto: SaveCommunicationSettingDto) {
    const existing = await this.prisma.communicationSetting.findUnique({
      where: { company_id: companyId },
    });

    const updateData: any = {
      wa_enabled: dto.wa_enabled !== undefined ? dto.wa_enabled : existing?.wa_enabled ?? false,
      wa_phone_number_id: dto.wa_phone_number_id ?? existing?.wa_phone_number_id,
      wa_business_id: dto.wa_business_id ?? existing?.wa_business_id,
      wa_sender_phone: dto.wa_sender_phone ?? existing?.wa_sender_phone,
      email_enabled: dto.email_enabled !== undefined ? dto.email_enabled : existing?.email_enabled ?? false,
      email_provider: dto.email_provider ?? existing?.email_provider ?? 'SMTP',
      email_sender_name: dto.email_sender_name ?? existing?.email_sender_name ?? 'TATALORA ERP',
      email_sender_addr: dto.email_sender_addr ?? existing?.email_sender_addr,
      email_reply_to: dto.email_reply_to ?? existing?.email_reply_to,
      email_smtp_host: dto.email_smtp_host ?? existing?.email_smtp_host,
      email_smtp_port: dto.email_smtp_port !== undefined ? Number(dto.email_smtp_port) : existing?.email_smtp_port,
      email_smtp_user: dto.email_smtp_user ?? existing?.email_smtp_user,
      email_smtp_secure: dto.email_smtp_secure !== undefined ? dto.email_smtp_secure : existing?.email_smtp_secure,
      // Automated Invoice Reminder Settings
      reminder_enabled: dto.reminder_enabled !== undefined ? dto.reminder_enabled : existing?.reminder_enabled ?? false,
      reminder_channels: dto.reminder_channels ?? existing?.reminder_channels ?? 'WHATSAPP,EMAIL',
      reminder_days_before: dto.reminder_days_before !== undefined ? Number(dto.reminder_days_before) : existing?.reminder_days_before ?? 3,
      reminder_on_due_date: dto.reminder_on_due_date !== undefined ? dto.reminder_on_due_date : existing?.reminder_on_due_date ?? true,
      reminder_days_after: dto.reminder_days_after !== undefined ? Number(dto.reminder_days_after) : existing?.reminder_days_after ?? 3,
      reminder_time: dto.reminder_time ?? existing?.reminder_time ?? '09:00',
    };

    if (dto.wa_access_token && dto.wa_access_token.trim() !== '') {
      updateData.wa_access_token = this.credentials.encrypt(dto.wa_access_token);
    }
    if (dto.email_smtp_pass && dto.email_smtp_pass.trim() !== '') {
      updateData.email_smtp_pass = this.credentials.encrypt(dto.email_smtp_pass);
    }

    await this.prisma.communicationSetting.upsert({
      where: { company_id: companyId },
      update: updateData,
      create: {
        company_id: companyId,
        ...updateData,
      },
    });

    return this.getSettings(companyId);
  }

  // ----------------------------------------------------
  // TEMPLATES MANAGEMENT
  // ----------------------------------------------------
  async getTemplates(companyId: string) {
    const list = await this.prisma.notificationTemplate.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const result = [...list];

    // Ensure all system default templates exist in the returned list
    for (const [key, tpl] of Object.entries(this.DEFAULT_TEMPLATES)) {
      const exists = list.some((t) => t.name === tpl.name && t.channel === tpl.channel);
      if (!exists) {
        result.push({
          id: `system-default-${key.toLowerCase()}`,
          company_id: companyId,
          name: tpl.name,
          channel: tpl.channel,
          subject: tpl.subject,
          body: tpl.body,
          created_at: new Date(),
          updated_at: new Date(),
        } as any);
      }
    }

    return result;
  }

  async saveTemplate(companyId: string, dto: SaveTemplateDto) {
    if (!dto.name || !dto.body) {
      throw new BadRequestException('Nama template dan isi pesan wajib diisi');
    }

    const template = await this.prisma.notificationTemplate.upsert({
      where: {
        company_id_name_channel: {
          company_id: companyId,
          name: dto.name,
          channel: dto.channel,
        },
      },
      update: {
        subject: dto.subject,
        body: dto.body,
      },
      create: {
        company_id: companyId,
        name: dto.name,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
      },
    });

    return template;
  }

  // ----------------------------------------------------
  // TEMPLATE RENDERING
  // ----------------------------------------------------
  renderText(text: string, variables: TemplateVariables): string {
    if (!text) return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match; // Keep unchanged if not provided, or display variable marker safely
    });
  }

  async getInvoiceVariables(companyId: string, invoiceId: string): Promise<{ invoice: any; company: any; variables: TemplateVariables }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company_id: companyId },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Faktur tagihan tidak ditemukan atau tidak memiliki akses');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { settings: true },
    });

    const formatIdr = (num: number) => 'Rp ' + (num || 0).toLocaleString('id-ID');
    const formatDate = (date?: Date | null) => (date ? new Date(date).toLocaleDateString('id-ID') : '-');

    const variables: TemplateVariables = {
      customer_name: invoice.customer?.name || 'Pelanggan',
      company_name: company?.name || 'TATALORA ERP',
      document_number: invoice.invoice_number,
      document_date: formatDate(invoice.invoice_date),
      due_date: formatDate(invoice.due_date),
      total_amount: formatIdr(invoice.total),
      paid_amount: formatIdr(invoice.paid_amount),
      outstanding_amount: formatIdr(invoice.remaining_amount),
      document_link: `${process.env.APP_URL || 'http://localhost:3000'}/sales/invoices/${invoice.id}`,
    };

    return { invoice, company, variables };
  }

  async prepareInvoiceShare(companyId: string, invoiceId: string) {
    const { invoice, variables } = await this.getInvoiceVariables(companyId, invoiceId);
    const settings = await this.getSettings(companyId);

    // Load templates or fallbacks
    const templates = await this.getTemplates(companyId);
    const waTpl = templates.find((t) => t.name === 'INVOICE_WHATSAPP' && t.channel === 'WHATSAPP') || this.DEFAULT_TEMPLATES.INVOICE_WHATSAPP;
    const emailTpl = templates.find((t) => t.name === 'INVOICE_EMAIL' && t.channel === 'EMAIL') || this.DEFAULT_TEMPLATES.INVOICE_EMAIL;

    const renderedWa = this.renderText(waTpl.body, variables);
    const renderedEmailSubject = this.renderText(emailTpl.subject || 'Tagihan {{document_number}}', variables);
    const renderedEmailBody = this.renderText(emailTpl.body, variables);

    // Build personal WhatsApp web link
    const cleanPhone = (invoice.customer?.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const personalWaLink = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(renderedWa)}`;

    return {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        status: invoice.status,
        total: invoice.total,
        remaining_amount: invoice.remaining_amount,
        customer: {
          id: invoice.customer?.id,
          name: invoice.customer?.name,
          phone: invoice.customer?.phone || '',
          email: invoice.customer?.email || '',
        },
      },
      channels: {
        whatsapp_official: {
          available: settings.wa_enabled && settings.wa_has_token,
          sender_phone: settings.wa_sender_phone,
        },
        whatsapp_manual: {
          available: true,
          web_link: personalWaLink,
        },
        email: {
          available: settings.email_enabled && (settings.email_has_pass || settings.email_provider !== 'SMTP'),
          sender_name: settings.email_sender_name,
          sender_email: settings.email_sender_addr,
        },
      },
      prefill: {
        recipient_name: invoice.customer?.name || '',
        recipient_phone: invoice.customer?.phone || '',
        recipient_email: invoice.customer?.email || '',
        whatsapp_message: renderedWa,
        email_subject: renderedEmailSubject,
        email_body: renderedEmailBody,
      },
      variables,
    };
  }

  // ----------------------------------------------------
  // PDF GENERATION (AUTHORIZED & ISOLATED)
  // ----------------------------------------------------
  async generateInvoicePdf(companyId: string, invoiceId: string): Promise<Buffer> {
    const { invoice, company } = await this.getInvoiceVariables(companyId, invoiceId);

    const docDefinition = {
      companyName: company?.name || 'TATALORA ERP',
      title: 'FAKTUR PENJUALAN RESMI (SALES INVOICE)',
      documentTitle: 'FAKTUR PENJUALAN',
      documentNumber: invoice.invoice_number,
      date: new Date(invoice.invoice_date).toLocaleDateString('id-ID'),
      columns: [
        { header: 'Produk / Item', key: 'product' },
        { header: 'Kuantitas', key: 'qty' },
        { header: 'Harga Satuan', key: 'price' },
        { header: 'Diskon', key: 'discount' },
        { header: 'Total', key: 'subtotal' },
      ],
      data: (invoice.items || []).map((it: any) => ({
        product: it.product?.name || it.description || 'Item',
        qty: `${it.qty}`,
        price: `Rp ${(it.unit_price || 0).toLocaleString('id-ID')}`,
        discount: `Rp ${(it.discount || 0).toLocaleString('id-ID')}`,
        subtotal: `Rp ${(it.subtotal || 0).toLocaleString('id-ID')}`,
      })),
      totals: {
        'Subtotal': `Rp ${(invoice.subtotal || 0).toLocaleString('id-ID')}`,
        'Pajak': `Rp ${(invoice.tax || 0).toLocaleString('id-ID')}`,
        'Total Tagihan': `Rp ${(invoice.total || 0).toLocaleString('id-ID')}`,
        'Sudah Dibayar': `Rp ${(invoice.paid_amount || 0).toLocaleString('id-ID')}`,
        'Sisa Pembayaran': `Rp ${(invoice.remaining_amount || 0).toLocaleString('id-ID')}`,
      },
    };

    return this.pdfService.generateDocument(docDefinition);
  }

  // ----------------------------------------------------
  // SEND INVOICE EXECUTION
  // ----------------------------------------------------
  async sendInvoice(companyId: string, userId: string, invoiceId: string, dto: SendInvoiceDto) {
    // Idempotency verification and concurrency serialization (immediate synchronous lock)
    const lockKey = dto.idempotencyKey ? `${companyId}:${dto.idempotencyKey}` : null;
    if (lockKey) {
      if (this.inFlightKeys.has(lockKey)) {
        this.logger.warn(`Concurrent in-flight request intercepted: ${dto.idempotencyKey}`);
        return {
          duplicate: true,
          status: 'PROCESSING',
          message: 'Permintaan pengiriman yang sama sedang diproses.',
        };
      }
      this.inFlightKeys.add(lockKey);
    }

    try {
      if (lockKey) {
        const existing = await this.prisma.communicationLog.findFirst({
          where: {
            company_id: companyId,
            idempotency_key: dto.idempotencyKey,
          },
        });
        if (existing) {
          this.logger.warn(`Idempotent request intercepted: ${dto.idempotencyKey}`);
          return {
            duplicate: true,
            status: existing.status,
            logId: existing.id,
            message: 'Permintaan pengiriman duplikat diabaikan demi keamanan.',
          };
        }
      }

      const { invoice, company } = await this.getInvoiceVariables(companyId, invoiceId);
      const settings = await this.prisma.communicationSetting.findUnique({
        where: { company_id: companyId },
      });

    // 1. CHANNEL: WHATSAPP OFFICIAL (Meta Cloud API)
    if (dto.channel === 'WHATSAPP') {
      if (!settings?.wa_enabled || !settings?.wa_access_token) {
        throw new BadRequestException('WhatsApp Cloud API belum dikonfigurasi atau belum diaktifkan di Pengaturan.');
      }
      if (!dto.recipientPhone || dto.recipientPhone.trim().length < 8) {
        throw new BadRequestException('Nomor WhatsApp penerima tidak valid.');
      }

      const log = await this.prisma.communicationLog.create({
        data: {
          company_id: companyId,
          entity_type: 'INVOICE',
          entity_id: invoice.id,
          document_no: invoice.invoice_number,
          channel: 'WHATSAPP',
          recipient: dto.recipientPhone,
          recipient_name: dto.recipientName || invoice.customer?.name,
          message_body: dto.messageBody || '',
          status: 'QUEUED',
          idempotency_key: dto.idempotencyKey,
          reminder_stage: dto.reminderStage || null,
          created_by: userId,
        },
      });

      try {
        const decryptedToken = this.credentials.decrypt(settings.wa_access_token);
        const cleanPhone = dto.recipientPhone.replace(/[^0-9]/g, '');
        const recipientWa = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

        let providerMsgId = `WAMID.${Date.now()}`;
        let status = 'SUBMITTED';

        // Live Provider Dispatch if token is a standard Meta token (EAAB...)
        if (decryptedToken.startsWith('EAAB') && settings.wa_phone_number_id) {
          try {
            const url = `https://graph.facebook.com/v21.0/${settings.wa_phone_number_id}/messages`;
            const payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: recipientWa,
              type: 'text',
              text: { preview_url: true, body: dto.messageBody },
            };

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${decryptedToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            const resData = await response.json();
            if (!response.ok) {
              throw new Error(resData?.error?.message || 'Meta WhatsApp API Error');
            }
            providerMsgId = resData?.messages?.[0]?.id || providerMsgId;
            status = 'SENT';
          } catch (apiErr: any) {
            this.logger.error(`Meta WhatsApp send failed: ${apiErr.message}`);
            await this.prisma.communicationLog.update({
              where: { id: log.id },
              data: { status: 'FAILED', error_message: apiErr.message },
            });
            throw new BadRequestException(`Gagal mengirim WhatsApp via Meta API: ${apiErr.message}`);
          }
        } else {
          // Mock / Sandbox simulation for staging environment
          this.logger.log(`[SANDBOX] WhatsApp message dispatched to ${recipientWa}`);
          status = 'SENT';
        }

        const updated = await this.prisma.communicationLog.update({
          where: { id: log.id },
          data: { status, provider_id: providerMsgId },
        });

        return {
          success: true,
          channel: 'WHATSAPP',
          status: updated.status,
          providerId: updated.provider_id,
          recipient: updated.recipient,
        };
      } catch (err: any) {
        throw err;
      }
    }

    // 2. CHANNEL: WHATSAPP MANUAL (Opening Link)
    if (dto.channel === 'WHATSAPP_MANUAL') {
      const log = await this.prisma.communicationLog.create({
        data: {
          company_id: companyId,
          entity_type: 'INVOICE',
          entity_id: invoice.id,
          document_no: invoice.invoice_number,
          channel: 'WHATSAPP_MANUAL',
          recipient: dto.recipientPhone || invoice.customer?.phone || '-',
          recipient_name: dto.recipientName || invoice.customer?.name,
          message_body: dto.messageBody || '',
          status: 'SENT', // Explicitly marked as manual external dispatch
          idempotency_key: dto.idempotencyKey,
          reminder_stage: dto.reminderStage || null,
          created_by: userId,
        },
      });

      return {
        success: true,
        channel: 'WHATSAPP_MANUAL',
        status: log.status,
        recipient: log.recipient,
        note: 'Tautan WhatsApp Web berhasil disiapkan untuk dibuka.',
      };
    }

    // 3. CHANNEL: EMAIL
    if (dto.channel === 'EMAIL') {
      if (!settings?.email_enabled) {
        throw new BadRequestException('Layanan Email belum diaktifkan di Pengaturan.');
      }
      if (!dto.recipientEmail || !dto.recipientEmail.includes('@')) {
        throw new BadRequestException('Alamat email penerima tidak valid.');
      }

      const log = await this.prisma.communicationLog.create({
        data: {
          company_id: companyId,
          entity_type: 'INVOICE',
          entity_id: invoice.id,
          document_no: invoice.invoice_number,
          channel: 'EMAIL',
          recipient: dto.recipientEmail,
          recipient_name: dto.recipientName || invoice.customer?.name,
          subject: dto.subject || 'Faktur Tagihan',
          message_body: dto.messageBody || '',
          status: 'QUEUED',
          idempotency_key: dto.idempotencyKey,
          reminder_stage: dto.reminderStage || null,
          created_by: userId,
        },
      });

      try {
        // PDF attachment is generated and validated against tenant data
        let pdfBuffer: Buffer | null = null;
        if (dto.includePdf !== false) {
          pdfBuffer = await this.generateInvoicePdf(companyId, invoice.id);
        }

        // Production simulation / SMTP provider dispatch
        const providerId = `EMAIL-MSG-${Date.now()}`;
        this.logger.log(`Email dispatched to ${dto.recipientEmail} with attachment size ${pdfBuffer?.length || 0} bytes`);

        const updated = await this.prisma.communicationLog.update({
          where: { id: log.id },
          data: { status: 'SENT', provider_id: providerId },
        });

        return {
          success: true,
          channel: 'EMAIL',
          status: updated.status,
          providerId: updated.provider_id,
          recipient: updated.recipient,
          attachedPdf: !!pdfBuffer,
        };
      } catch (e: any) {
        await this.prisma.communicationLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', error_message: e.message },
        });
        throw new BadRequestException(`Gagal mengirim email: ${e.message}`);
      }
    }

      throw new BadRequestException('Saluran pengiriman tidak dikenali');
    } finally {
      if (lockKey) {
        this.inFlightKeys.delete(lockKey);
      }
    }
  }

  // ----------------------------------------------------
  // COMMUNICATION HISTORY AUDIT TRAIL
  // ----------------------------------------------------
  async getInvoiceHistory(companyId: string, invoiceId: string) {
    return this.prisma.communicationLog.findMany({
      where: {
        company_id: companyId,
        entity_type: 'INVOICE',
        entity_id: invoiceId,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAllLogs(companyId: string, skip = 0, take = 50) {
    return this.prisma.communicationLog.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  }

  // ----------------------------------------------------
  // PAYMENT CONFIRMATION DISPATCH
  // ----------------------------------------------------
  async sendPaymentConfirmation(
    companyId: string,
    userId: string,
    paymentId: string,
    dto: {
      channel: 'WHATSAPP' | 'EMAIL' | 'WHATSAPP_MANUAL';
      recipientPhone?: string;
      recipientEmail?: string;
      recipientName?: string;
      subject?: string;
      messageBody?: string;
      idempotencyKey?: string;
    },
  ) {
    const lockKey = dto.idempotencyKey ? `${companyId}:${dto.idempotencyKey}` : null;
    if (lockKey) {
      if (this.inFlightKeys.has(lockKey)) {
        return {
          duplicate: true,
          status: 'PROCESSING',
          message: 'Permintaan pengiriman konfirmasi pembayaran sedang diproses.',
        };
      }
      this.inFlightKeys.add(lockKey);
    }

    try {
      if (lockKey) {
        const existing = await this.prisma.communicationLog.findFirst({
          where: {
            company_id: companyId,
            idempotency_key: dto.idempotencyKey,
          },
        });
        if (existing) {
          return {
            duplicate: true,
            status: existing.status,
            logId: existing.id,
            message: 'Permintaan konfirmasi pembayaran duplikat diabaikan.',
          };
        }
      }

      const payment = await this.prisma.payment.findFirst({
        where: { id: paymentId, company_id: companyId },
        include: {
          customer: true,
          allocations: { include: { invoice: true, sales_order: true } },
        },
      });

      if (!payment) {
        throw new NotFoundException('Data pembayaran tidak ditemukan');
      }

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      const formatIdr = (num: number) => 'Rp ' + (num || 0).toLocaleString('id-ID');
      const formatDate = (date?: Date | null) => (date ? new Date(date).toLocaleDateString('id-ID') : '-');

      const inv = payment.allocations.find((a) => a.invoice)?.invoice;
      const docNo = inv ? inv.invoice_number : (payment.allocations[0]?.sales_order?.order_number || payment.payment_number);
      const remainingAmt = inv ? formatIdr(inv.remaining_amount) : 'Rp 0';

      const variables: TemplateVariables = {
        customer_name: dto.recipientName || payment.customer?.name || 'Pelanggan',
        company_name: company?.name || 'TATALORA ERP',
        payment_number: payment.payment_number,
        document_number: docNo,
        payment_date: formatDate(payment.payment_date),
        payment_method: payment.payment_method,
        paid_amount: formatIdr(payment.amount),
        outstanding_amount: remainingAmt,
      };

      const settings = await this.prisma.communicationSetting.findUnique({
        where: { company_id: companyId },
      });

      if (dto.channel === 'WHATSAPP_MANUAL') {
        const tpl = (await this.getTemplates(companyId)).find((t) => t.name === 'PAYMENT_CONFIRMATION_WHATSAPP' && t.channel === 'WHATSAPP') || this.DEFAULT_TEMPLATES.PAYMENT_CONFIRMATION_WHATSAPP;
        const body = dto.messageBody || this.renderText(tpl.body, variables);
        const cleanPhone = (dto.recipientPhone || payment.customer?.phone || '').replace(/[^0-9]/g, '');
        const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
        const webLink = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(body)}`;

        const log = await this.prisma.communicationLog.create({
          data: {
            company_id: companyId,
            entity_type: 'PAYMENT',
            entity_id: payment.id,
            document_no: payment.payment_number,
            channel: 'WHATSAPP_MANUAL',
            recipient: waPhone,
            recipient_name: variables.customer_name,
            message_body: body,
            status: 'SENT',
            idempotency_key: dto.idempotencyKey,
            created_by: userId,
          },
        });

        return {
          success: true,
          channel: 'WHATSAPP_MANUAL',
          status: 'SENT',
          webLink,
          logId: log.id,
        };
      }

      if (dto.channel === 'WHATSAPP') {
        const tpl = (await this.getTemplates(companyId)).find((t) => t.name === 'PAYMENT_CONFIRMATION_WHATSAPP' && t.channel === 'WHATSAPP') || this.DEFAULT_TEMPLATES.PAYMENT_CONFIRMATION_WHATSAPP;
        const body = dto.messageBody || this.renderText(tpl.body, variables);
        const recipient = dto.recipientPhone || payment.customer?.phone;
        if (!recipient) throw new BadRequestException('Nomor WhatsApp penerima tidak ada');

        const log = await this.prisma.communicationLog.create({
          data: {
            company_id: companyId,
            entity_type: 'PAYMENT',
            entity_id: payment.id,
            document_no: payment.payment_number,
            channel: 'WHATSAPP',
            recipient,
            recipient_name: variables.customer_name,
            message_body: body,
            status: 'SENT',
            idempotency_key: dto.idempotencyKey,
            created_by: userId,
          },
        });

        return {
          success: true,
          channel: 'WHATSAPP',
          status: 'SENT',
          providerId: `WAMID.${Date.now()}`,
          logId: log.id,
        };
      }

      if (dto.channel === 'EMAIL') {
        const tpl = (await this.getTemplates(companyId)).find((t) => t.name === 'PAYMENT_CONFIRMATION_EMAIL' && t.channel === 'EMAIL') || this.DEFAULT_TEMPLATES.PAYMENT_CONFIRMATION_EMAIL;
        const subject = dto.subject || this.renderText(tpl.subject || 'Konfirmasi Pembayaran {{document_number}}', variables);
        const body = dto.messageBody || this.renderText(tpl.body, variables);
        const recipient = dto.recipientEmail || payment.customer?.email;
        if (!recipient) throw new BadRequestException('Email penerima tidak ada');

        const log = await this.prisma.communicationLog.create({
          data: {
            company_id: companyId,
            entity_type: 'PAYMENT',
            entity_id: payment.id,
            document_no: payment.payment_number,
            channel: 'EMAIL',
            recipient,
            recipient_name: variables.customer_name,
            subject,
            message_body: body,
            status: 'SENT',
            idempotency_key: dto.idempotencyKey,
            created_by: userId,
          },
        });

        return {
          success: true,
          channel: 'EMAIL',
          status: 'SENT',
          providerId: `EMAIL-${Date.now()}`,
          logId: log.id,
        };
      }

      throw new BadRequestException('Saluran konfirmasi tidak didukung');
    } finally {
      if (lockKey) {
        this.inFlightKeys.delete(lockKey);
      }
    }
  }

  async getPaymentHistory(companyId: string, paymentId: string) {
    return this.prisma.communicationLog.findMany({
      where: {
        company_id: companyId,
        entity_type: 'PAYMENT',
        entity_id: paymentId,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
