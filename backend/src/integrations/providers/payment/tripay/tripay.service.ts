import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IntegrationCredentialService } from '../../../integration-credential.service';
import { IntegrationWebhookService } from '../../../integration-webhook.service';
import { IntegrationIdempotencyService } from '../../../integration-idempotency.service';
import * as crypto from 'crypto';
import { GlService } from '../../../../gl/gl.service';
import { PaymentService } from '../../../../finance/payment/payment.service';

@Injectable()
export class TripayService {
  private readonly logger = new Logger(TripayService.name);

  constructor(
    private prisma: PrismaService,
    private creds: IntegrationCredentialService,
    private webhook: IntegrationWebhookService,
    private idempotency: IntegrationIdempotencyService,
    private gl: GlService,
    private paymentService: PaymentService,
  ) {}

  async getIntegration(companyId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { company_id: companyId, provider: 'TRIPAY', status: 'ACTIVE' },
    });
    if (!integration)
      throw new BadRequestException('Tripay integration not active');

    const config: any = integration.config || {};
    const apiKey = config.apiKey;
    const privateKey = config.privateKey;
    const merchantCode = config.merchantCode;

    if (!apiKey || !privateKey || !merchantCode) {
      throw new BadRequestException('Tripay credentials not fully configured');
    }
    return { integration, apiKey, privateKey, merchantCode };
  }

  async createPaymentRequest(
    companyId: string,
    userId: string,
    invoiceId: string,
    methodCode: string = 'QRISC',
  ) {
    const { integration, apiKey, privateKey, merchantCode } =
      await this.getIntegration(companyId);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, customer: true },
    });

    if (!invoice) throw new BadRequestException('Invoice not found');
    if (invoice.status === 'PAID')
      throw new BadRequestException('Invoice already paid');

    const amount = invoice.remaining_amount;
    const merchantRef = `INV-${invoice.id}-${Date.now()}`;

    const ext = await this.prisma.externalReference.create({
      data: {
        company_id: companyId,
        provider: 'TRIPAY',
        entity_type: 'INVOICE',
        entity_id: invoiceId,
        external_id: merchantRef,
      },
    });

    const apiUrl =
      integration.config &&
      (integration.config as any).environment === 'PRODUCTION'
        ? 'https://tripay.co.id/api/transaction/create'
        : 'https://tripay.co.id/api-sandbox/transaction/create';

    const payload = {
      method: methodCode,
      merchant_ref: merchantRef,
      amount: amount,
      customer_name: invoice.customer?.name || 'Customer',
      customer_email: invoice.customer?.email || 'customer@example.com',
      order_items: invoice.items.map((i) => ({
        name: i.description || 'Item',
        price: i.unit_price,
        quantity: i.qty,
      })),
      return_url: 'https://example.com/payment/success',
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      signature: crypto
        .createHmac('sha256', privateKey)
        .update(merchantCode + merchantRef + amount)
        .digest('hex'),
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create Tripay transaction');
      }

      return {
        success: true,
        redirect_url: data.data.checkout_url,
        reference: data.data.reference,
        merchant_ref: merchantRef,
      };
    } catch (err: any) {
      throw new BadRequestException('Tripay API error: ' + err.message);
    }
  }

  async handleWebhook(body: any, signatureHeader: string) {
    if (!body || !body.reference || !body.merchant_ref) {
      return { success: false, message: 'Invalid payload' };
    }

    const merchantRef = body.merchant_ref;

    const extRef = await this.prisma.externalReference.findFirst({
      where: { external_id: merchantRef },
    });

    if (!extRef) {
      this.logger.warn(`Unknown Tripay merchant_ref: ${merchantRef}`);
      return { success: false, message: 'Unknown reference' };
    }

    const companyId = extRef.company_id;

    const integration = await this.prisma.integration.findFirst({
      where: { company_id: companyId, provider: 'TRIPAY', status: 'ACTIVE' },
    });
    if (!integration)
      return { success: false, message: 'Tripay integration not active' };
    const integrationId = integration.id;

    const event = await this.webhook.recordIncoming(
      companyId,
      integrationId,
      'TRIPAY',
      body.reference,
      body.status,
      body,
    );

    const integrationData = await this.getIntegration(companyId);
    const config: any = integrationData.integration.config || {};
    const privateKey = config.privateKey;

    if (!privateKey) {
      await this.webhook.markFailed(event.id, 'Missing Private Key', 1);
      return { success: false, message: 'Internal config error' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', privateKey)
      .update(JSON.stringify(body))
      .digest('hex');
    if (signatureHeader !== expectedSignature) {
      return { success: false, message: 'Invalid signature' };
    }

    return this.reconcilePayment(
      companyId,
      integrationId,
      extRef,
      body,
      event.id,
      'WEBHOOK',
    );
  }

  async syncPaymentStatus(companyId: string, extRefId: string) {
    throw new Error('Not implemented for this mock');
  }

  private async reconcilePayment(
    companyId: string,
    integrationId: string,
    extRef: any,
    data: any,
    eventId: string,
    source: string,
  ) {
    const idempotencyKey = `tripay-${data.merchant_ref}-${data.status}`;
    try {
      await this.idempotency.checkAndLock(
        companyId,
        integrationId,
        idempotencyKey,
        'PROCESS_' + source,
      );
    } catch (err) {
      this.logger.warn(`Idempotency hit for ${idempotencyKey}`);
      return { success: true, message: 'Already processed' };
    }

    let finalStatus = 'PENDING';
    if (data.status === 'PAID') {
      finalStatus = 'PAID';
    } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      finalStatus = 'FAILED';
    }

    if (finalStatus === 'PAID') {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: extRef.entity_id },
      });
      if (!invoice) {
        await this.webhook.markFailed(eventId, 'Invoice not found', 1);
        return { success: false, message: 'Invoice not found' };
      }

      if (invoice.status === 'PAID') {
        await this.webhook.markProcessed(eventId);
        return { success: true, message: 'Invoice already paid' };
      }

      const paidAmount = parseFloat(data.amount);

      const payment = await this.paymentService.create(companyId, {
        invoiceId: invoice.id,
        amount: paidAmount,
        paymentMethod: 'BANK_TRANSFER',
        notes: data.reference,
        paymentDate: new Date(),
      });

      // GL Entry handled by Finance Module separately

      await this.webhook.markProcessed(eventId);
      await this.idempotency.complete(idempotencyKey, {
        success: true,
        payment_id: payment.id,
      });
      return { success: true, payment_id: payment.id };
    }

    await this.webhook.markProcessed(eventId);
    await this.idempotency.complete(idempotencyKey, {
      success: true,
      status: finalStatus,
    });
    return { success: true, status: finalStatus };
  }
}
