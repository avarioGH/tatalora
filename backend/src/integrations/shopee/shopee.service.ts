import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequenceService } from '../../reports/sequence.service';
import * as crypto from 'crypto';

@Injectable()
export class ShopeeService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
  ) {}

  async getStatus(companyId: string) {
    const integration = await this.prisma.marketplaceIntegration.findUnique({
      where: {
        company_id_platform: { company_id: companyId, platform: 'SHOPEE' },
      },
    });
    return {
      isConfigured: !!integration?.partner_id,
      isConnected: integration?.status === 'ACTIVE',
      partnerId: integration?.partner_id || '',
      shopId: integration?.shop_id || '',
    };
  }

  async saveCredentials(
    companyId: string,
    partnerId: string,
    partnerKey: string,
  ) {
    await this.prisma.marketplaceIntegration.upsert({
      where: {
        company_id_platform: { company_id: companyId, platform: 'SHOPEE' },
      },
      create: {
        company_id: companyId,
        platform: 'SHOPEE',
        partner_id: partnerId,
        partner_key: partnerKey,
        status: 'INACTIVE',
      },
      update: {
        partner_id: partnerId,
        partner_key: partnerKey,
      },
    });
    return { success: true, message: 'Shopee credentials saved' };
  }

  async generateAuthUrl(companyId: string) {
    const integration = await this.prisma.marketplaceIntegration.findUnique({
      where: {
        company_id_platform: { company_id: companyId, platform: 'SHOPEE' },
      },
    });

    if (!integration || !integration.partner_id || !integration.partner_key) {
      throw new BadRequestException('Kredensial Shopee belum dikonfigurasi');
    }

    // This is a mocked URL generation. In a real scenario, you'd use HMAC-SHA256
    // with partnerKey to generate the sign and redirect to open.shopee.com
    const timestamp = Math.floor(Date.now() / 1000);
    const redirectUrl = `https://avario-erp.com/settings/integrations/shopee/callback`;
    const mockAuthUrl = `https://open.shopee.com/api/v2/shop/auth_partner?partner_id=${integration.partner_id}&redirect=${redirectUrl}&timestamp=${timestamp}`;

    return { url: mockAuthUrl };
  }

  async exchangeToken(companyId: string, code: string, shopId: string) {
    // In a real scenario, make API call to /api/v2/auth/token/get
    // Here we mock the success response since there is no real app approved yet.
    await this.prisma.marketplaceIntegration.update({
      where: {
        company_id_platform: { company_id: companyId, platform: 'SHOPEE' },
      },
      data: {
        shop_id: shopId,
        access_token: 'mock_access_token_123',
        refresh_token: 'mock_refresh_token_456',
        status: 'ACTIVE',
        token_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    return { success: true };
  }

  async syncOrders(companyId: string) {
    const integration = await this.prisma.marketplaceIntegration.findUnique({
      where: {
        company_id_platform: { company_id: companyId, platform: 'SHOPEE' },
      },
    });

    if (!integration || integration.status !== 'ACTIVE') {
      throw new BadRequestException('Shopee belum terhubung');
    }

    // Mocking an order fetch from Shopee and saving to Finance
    const mockOrderAmount = 150000;
    const mockOrderNo = await this.sequenceService.generateNumber(
      this.prisma as any,
      companyId,
      'SHOPEE_ORDER',
      'SHP',
    );

    // Get default cash account for Shopee
    let shopeeAccount = await this.prisma.cashAccount.findFirst({
      where: { company_id: companyId, code: 'SHOPEE-01' },
    });

    if (!shopeeAccount) {
      shopeeAccount = await this.prisma.cashAccount.create({
        data: {
          company_id: companyId,
          name: 'Saldo Shopee',
          code: 'SHOPEE-INC',
          account_type: 'Digital Wallet',
        },
      });
    }

    // Record as Finance Transaction
    await this.prisma.financeTransaction.create({
      data: {
        company_id: companyId,
        transaction_no: mockOrderNo,
        transaction_type: 'Income',
        cash_account_id: shopeeAccount.id,
        reference_type: 'SHOPEE_ORDER',
        reference_id: mockOrderNo,
        transaction_date: new Date(),
        status: 'Approved',
        description: `Penjualan dari Shopee (${mockOrderNo})`,
        total_amount: mockOrderAmount,
        created_by: '000000000000000000000000', // Need to handle created_by properly in a real cron
      },
    });

    // CashAccount.current_balance is now synchronized via GL event pipeline.
    // The finance transaction above records the operational entry; balance is derived
    // from the sum of all FinanceTransactions, consistent with GL reconciliation.

    return { success: true, synced_orders: 1, total_amount: mockOrderAmount };
  }
}
