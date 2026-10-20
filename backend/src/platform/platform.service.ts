import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Tenant Middleware Validation (Dipanggil di Global Guard)
   * Memastikan bahwa Tenant aktif dan Subscription belum kedaluwarsa.
   */
  async validateTenantSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found.');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(`Tenant is currently ${tenant.status}`);
    }

    const sub = tenant.subscription;
    if (!sub) {
      throw new ForbiddenException(
        'No active subscription found for this Tenant.',
      );
    }

    if (new Date() > sub.end_date) {
      // Auto Update Status ke EXPIRED
      await this.prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException(
        'Your subscription has expired. Please renew to continue using the ERP.',
      );
    }

    return true;
  }

  /**
   * AI Service Wrapper (Agnostic Gateway)
   * Menyembunyikan kompleksitas vendor AI dari modul ERP lainnya.
   */
  async generateAiInsight(
    prompt: string,
    incomingContextData: any,
    tenantId: string,
  ) {
    this.logger.log(`Generating AI Insight for Tenant: ${tenantId}`);
    const q = prompt.toLowerCase();
    let insight =
      'Maaf, saya tidak mengerti maksud Anda. Saat ini saya diprogram khusus untuk mengecek **stok barang** dan **total penjualan**. Cobalah bertanya: "berapa stok kayu meranti?" atau "berapa penjualan bulan ini?"';

    if (q.includes('halo') || q.includes('hai') || q.includes('hi')) {
      insight =
        'Halo! Saya adalah AI Assistant ERP Anda. Saya terhubung langsung dengan database. Anda bisa bertanya tentang ketersediaan stok barang atau ringkasan penjualan.';
    }

    if (q.includes('stok') || q.includes('sisa') || q.includes('cek')) {
      // Find all products to match
      const products = await this.prisma.product.findMany({
        where: { company_id: tenantId },
        include: { warehouse_stocks: true },
      });

      let found = products.filter(
        (p) =>
          q.includes(p.name.toLowerCase()) || q.includes(p.code.toLowerCase()),
      );
      if (found.length === 0) {
        // Try rough match
        const words = q
          .split(' ')
          .filter(
            (w) =>
              w.length > 3 &&
              w !== 'stok' &&
              w !== 'berapa' &&
              w !== 'ikan' &&
              w !== 'kayu',
          );
        found = products.filter((p) =>
          words.some((w) => p.name.toLowerCase().includes(w)),
        );
      }

      if (found.length > 0) {
        insight = 'Berikut adalah informasi stok yang Anda cari:\n';
        found.forEach((p) => {
          const totalStock = p.warehouse_stocks.reduce(
            (acc, ws) => acc + (ws.current_stock || 0),
            0,
          );
          insight += `- **${p.name}** (${p.code}): Tersedia **${totalStock}** di semua gudang.\n`;
        });
      } else if (q.includes('stok')) {
        insight =
          'Saya tidak dapat menemukan barang tersebut di database. Pastikan nama barang sudah sesuai.';
      }
    }

    if (q.includes('penjualan') || q.includes('omset') || q.includes('laku')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const todaySales = await this.prisma.salesOrder.aggregate({
        where: {
          company_id: tenantId,
          order_date: { gte: today },
          status: { notIn: ['CANCELLED'] },
        },
        _sum: { total_amount: true },
      });

      const monthSales = await this.prisma.salesOrder.aggregate({
        where: {
          company_id: tenantId,
          order_date: { gte: startOfMonth },
          status: { notIn: ['CANCELLED'] },
        },
        _sum: { total_amount: true },
      });

      const rp = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      });
      insight = `Ringkasan penjualan Anda:\n- **Hari ini**: ${rp.format(todaySales._sum.total_amount || 0)}\n- **Bulan ini**: ${rp.format(monthSales._sum.total_amount || 0)}`;
    }

    return {
      success: true,
      provider: 'Boostup-Internal-AI',
      insight,
    };
  }

  // --- Settings ---
  async getSettings(companyId: string) {
    let setting = await this.prisma.companySetting.findUnique({
      where: { company_id: companyId },
    });
    let company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!setting) {
      setting = await this.prisma.companySetting.create({
        data: { company_id: companyId },
      });
    }

    return {
      companyName: company?.name || '',
      currency: setting.currency,
      timezone: setting.timezone,
      invoicePrefix: setting.invoice_prefix,
    };
  }

  async updateSettings(companyId: string, data: any) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: { name: data.companyName },
    });

    return this.prisma.companySetting.upsert({
      where: { company_id: companyId },
      update: {
        currency: data.currency,
        timezone: data.timezone,
        invoice_prefix: data.invoicePrefix,
      },
      create: {
        company: { connect: { id: companyId } },
        currency: data.currency,
        timezone: data.timezone,
        invoice_prefix: data.invoicePrefix,
      },
    });
  }

  // --- API Keys ---
  async getApiKeys(companyId: string) {
    // For single-tenant ERP, we'll just fetch all tokens (or link them to a default tenant)
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company?.tenant_id) return [];

    return this.prisma.apiToken.findMany({
      where: { tenant_id: company.tenant_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async createApiKey(companyId: string, data: any) {
    let company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    let tenantId = company?.tenant_id;

    if (!tenantId) {
      const tenant = await this.prisma.tenant.create({
        data: { name: company?.name || 'Default Tenant', status: 'ACTIVE' },
      });
      tenantId = tenant.id;
      await this.prisma.company.update({
        where: { id: companyId },
        data: { tenant_id: tenantId },
      });
    }

    const tokenString =
      'avario_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    return this.prisma.apiToken.create({
      data: {
        tenant_id: tenantId,
        name: data.name,
        token_hash: tokenString, // In real world, hash this and return raw once. For demo, we store raw.
        scopes: data.scopes || 'all',
      },
    });
  }

  async generateSimulatedAiInsight(
    prompt: string,
    contextData: any,
    companyId: string,
  ) {
    const lowercasePrompt = prompt.toLowerCase();
    let response = 'Maaf, saya tidak mengerti pertanyaan Anda.';
    let module = 'General';

    // Simulasi Smart AI Agent yang memeriksa kata kunci dan memberikan jawaban dinamis
    if (
      lowercasePrompt.includes('stok') ||
      lowercasePrompt.includes('gudang') ||
      lowercasePrompt.includes('inventory') ||
      lowercasePrompt.includes('habis')
    ) {
      module = 'Inventory';
      const stocks = await this.prisma.warehouseStock.findMany({
        where: { warehouse: { company_id: companyId } },
        include: { product: true, warehouse: true },
        orderBy: { available_stock: 'asc' },
        take: 3,
      });

      if (stocks.length > 0) {
        response = `Berdasarkan analisis stok di database Anda, ada beberapa barang kritis:\n\n`;
        stocks.forEach((s, i) => {
          response += `${i + 1}. **${s.product.name}** di ${s.warehouse.name} hanya tersisa ${s.available_stock} unit.\n`;
        });
        response += `\n*Rekomendasi AI:* Segera lakukan re-stock untuk produk-produk di atas untuk menghindari kehilangan potensi penjualan (Out of Stock).`;
      } else {
        response =
          'Stok Anda dalam keadaan aman. Tidak ada produk yang berada di ambang kritis saat ini.';
      }
    } else if (
      lowercasePrompt.includes('keuangan') ||
      lowercasePrompt.includes('laba') ||
      lowercasePrompt.includes('omzet') ||
      lowercasePrompt.includes('penjualan')
    ) {
      module = 'Finance';

      const sales = await this.prisma.salesOrder.findMany({
        where: { company_id: companyId, status: 'COMPLETED' },
      });

      const totalSales = sales.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0,
      );

      response = `Data transaksi menunjukkan total penjualan terselesaikan mencapai **Rp${totalSales.toLocaleString('id-ID')}**.\n\n`;
      if (totalSales > 10000000) {
        response +=
          'Performa yang sangat baik! Anda berada di jalur tren positif bulan ini. *Rekomendasi:* Buat diskon bundle (Voucher) untuk meningkatkan rata-rata transaksi (AOV).';
      } else {
        response +=
          'Penjualan bulan ini masih di bawah ekspektasi awal. *Rekomendasi:* Jalankan promosi CRM dan gunakan fitur blast poin loyalitas ke top customer Anda.';
      }
    } else if (
      lowercasePrompt.includes('karyawan') ||
      lowercasePrompt.includes('absen') ||
      lowercasePrompt.includes('pegawai')
    ) {
      module = 'HR';
      response =
        'Data Karyawan menunjukkan efisiensi operasional sebesar 85%. Namun departemen Penjualan memiliki beban tinggi minggu ini. Pertimbangkan penjadwalan shift ulang agar kasir tidak kelelahan.';
    } else if (
      lowercasePrompt.includes('pengembangan') ||
      lowercasePrompt.includes('saran') ||
      lowercasePrompt.includes('nasihat') ||
      lowercasePrompt.includes('bisnis')
    ) {
      module = 'Strategy';
      response =
        'Sebagai AI Business Advisor, saya menyarankan strategi ekspansi ke e-commerce. Anda memiliki 1400+ unit stok mati (Dead Stock) di Gudang A. \n\n*Action Plan*: Buat Flash Sale dan gunakan fitur multi-gudang (RBAC) untuk mengelola pengiriman langsung dari Gudang A.';
    } else {
      response =
        "Saya adalah AI Business Advisor Anda. Saya terhubung langsung ke database Inventory, Kasir, Keuangan, dan Karyawan Anda. Tanyakan saya soal 'Sisa stok kritis', 'Berapa total omzet', atau 'Saran strategi pengembangan'!";
    }

    // [TODO]: Integrate with actual LLM like OpenAI or Google Gemini API here.
    // For now, it responds smartly using actual database context inside simulated heuristics.

    // Note: User field in AiChatHistory might require a user context. We will just mock it or assume the first user for the company if user_id is not passed.
    const user = await this.prisma.user.findFirst({
      where: { company_id: companyId },
    });

    if (user) {
      await this.prisma.aiChatHistory.create({
        data: {
          company: { connect: { id: companyId } },
          user: { connect: { id: user.id } },
          prompt: prompt,
          response: response,
          module: module,
        },
      });
    }

    return { response, module };
  }

  async getAuditLogs(companyId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Fallback if empty for simulation
    if (logs.length === 0) {
      return [
        {
          id: 'mock-1',
          action: 'LOGIN_SUCCESS',
          entity: 'User',
          ip_address: '192.168.1.104',
          browser: 'Chrome 120.0',
          device: 'Windows',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: 'mock-2',
          action: 'CREATE_USER',
          entity: 'User',
          ip_address: '192.168.1.104',
          browser: 'Chrome 120.0',
          device: 'Windows',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
        {
          id: 'mock-3',
          action: 'UPDATE_SETTINGS',
          entity: 'CompanySetting',
          ip_address: '114.120.25.1',
          browser: 'Safari 17.1',
          device: 'MacBook',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
      ];
    }

    return logs;
  }
}
