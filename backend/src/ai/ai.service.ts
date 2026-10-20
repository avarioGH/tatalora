import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { SequenceService } from '../reports/sequence.service';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  // Fallback models from Juan Router based on user request
  private readonly fallbackModels = [
    'agnes-2.5-flash',
    'agnes-3.0-flash',
    'diffusiongemma-26b-a4b-it',
    'dots-3-note-preview',
    'gemma-4-31b-it',
    'gpt-oss:120b',
    'laguna-s-2.1',
    'laguna-xs-2.1',
    'mistral-large',
    'muse-glimmer',
    'nemotron-3.5-lightning',
    'qwen3-8b',
  ];

  constructor(
    private prisma: PrismaService,
    private financeService: FinanceService,
    private sequenceService: SequenceService,
  ) {
    // API key ditaruh di .env dengan nama JUAN_API_KEY
    // Jika tidak ada di .env, kita pakai default fallback key
    const apiKey =
      process.env.JUAN_API_KEY ||
      'sk-p8GXAXmljYonz0t5fvS0r09aN9K6iPvkCpR9UWyhXuU9ykf8';
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://router.juan.web.id/v1',
    });
  }

  private getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_financial_summary',
          description:
            'Get the summary of cash and bank account balances for the company.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_timber_logs_summary',
          description:
            'Get a summary of timber and logs inventory including raw logs, trimmed logs, and sawn timber stock.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_inventory_status',
          description:
            'Get overall inventory status including finished products (Product A, etc) AND timber/logs (raw wood, trimmed, sawn timber).',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'integer',
                description: 'Number of items to return',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_product_price',
          description:
            'Propose an update to the selling price of a product by its exact name. THIS REQUIRES USER PERMISSION.',
          parameters: {
            type: 'object',
            properties: {
              product_name: {
                type: 'string',
                description: 'The exact name of the product',
              },
              new_price: {
                type: 'number',
                description: 'The new selling price',
              },
            },
            required: ['product_name', 'new_price'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_product',
          description:
            'Propose creating a new product. THIS REQUIRES USER PERMISSION.',
          parameters: {
            type: 'object',
            properties: {
              product_name: {
                type: 'string',
                description: 'Name of the product',
              },
              category: {
                type: 'string',
                description: 'Category of the product (optional)',
              },
              selling_price: { type: 'number', description: 'Selling price' },
              size: {
                type: 'string',
                description: 'Size or description (optional)',
              },
            },
            required: ['product_name', 'selling_price'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_income',
          description:
            'Add a new income/cash-in transaction (tambah data keuangan, pemasukan, cash in, uang masuk). THIS REQUIRES USER PERMISSION.',
          parameters: {
            type: 'object',
            properties: {
              amount: {
                type: 'number',
                description: 'The amount of income to add',
              },
              description: {
                type: 'string',
                description:
                  'Description or notes for the income (e.g., transfer dari PT ABC)',
              },
            },
            required: ['amount', 'description'],
          },
        },
      },
    ];
  }

  // Helper untuk memanggil API dengan fallback model
  private async executeWithFallback(
    messages: any[],
    useTools: boolean = false,
  ): Promise<any> {
    let errors: string[] = [];
    for (const modelName of this.fallbackModels) {
      try {
        const payload: any = {
          model: modelName,
          messages: messages,
        };
        if (useTools) {
          payload.tools = this.getTools() as any;
          payload.tool_choice = 'auto';
        }

        const result = await this.openai.chat.completions.create(payload);
        return result.choices[0].message;
      } catch (error: any) {
        errors.push(`${modelName}: ${error.message}`);
        this.logger.warn(
          `Model ${modelName} failed: ${error.message}. Trying next fallback model...`,
        );
      }
    }
    throw new Error('Semua model gagal: ' + errors.join(' | '));
  }

  async handleChat(user: any, prompt: string, chatHistory: any[]) {
    try {
      
      const companyId = user.company_id || user.companyId || user.id;
      const stocks = await this.prisma.warehouseStock.findMany({
        where: { company_id: companyId },
        include: { product: true, warehouse: true }
      });
      let stockInfo = stocks.map(s => `- ${s.product?.name || 'Ikan'} (${s.product?.code || ''}): ${s.current_stock} pcs (Gudang: ${s.warehouse?.name || '-'}) `).join('\n');
      if (!stockInfo) stockInfo = 'Belum ada stok barang.';

      const today = new Date();
      today.setHours(0,0,0,0);
      const inflows = await this.prisma.stockInTally.findMany({
        where: { company_id: companyId, tally_date: { gte: today } },
        include: { items: { include: { product: true } } }
      });
      let inflowInfo = inflows.map(t => `- Teli ${t.tally_number}: ${t.items.map(i => i.qty + ' ' + (i.product?.name || 'Ikan')).join(', ')}`).join('\n');
      if (!inflowInfo) inflowInfo = 'Belum ada ikan masuk hari ini.';

const messages: any[] = [
        {
          role: 'system',
          content: `Anda adalah AI Assistant cerdas untuk sistem ERP. 
Jawablah pertanyaan user dengan sangat singkat, jelas, dan luwes (seperti chat biasa), tanpa template atau basa-basi robot.
Jika ditanya tentang data, baca langsung dari DATABASE LIVE berikut:

-- DATA STOK SAAT INI --
${stockInfo}

-- DATA IKAN MASUK (TELI) HARI INI --
${inflowInfo}

HANYA jawab sesuai dengan pertanyaan yang diajukan. Jangan menawarkan hal lain. Jangan bilang tidak menemukan data jika datanya ada di atas.`
        },
      ];

      for (const h of chatHistory) {
        messages.push({
          role: h.role === 'model' ? 'assistant' : h.role,
          content: h.text,
        });
      }

      messages.push({ role: 'user', content: prompt });

      // Panggilan pertama dengan fallback logic
      let responseMessage = await this.executeWithFallback(messages, true);
      let pendingAction: any = null;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage);

        for (const rawToolCall of responseMessage.tool_calls) {
          const toolCall = rawToolCall as any;
          const args = JSON.parse(toolCall.function.arguments);
          let apiResponse: any;

          if (toolCall.function.name === 'get_timber_logs_summary') {
            apiResponse = await this.getTimberLogsSummary(user.company_id);
          } else if (toolCall.function.name === 'get_financial_summary') {
            apiResponse = await this.getFinancialSummary(user.company_id);
          } else if (toolCall.function.name === 'get_inventory_status') {
            apiResponse = await this.getInventoryStatus(
              user.company_id,
              args.limit as number,
            );
          } else if (toolCall.function.name === 'update_product_price') {
            const proposal = await this.proposeUpdateProductPrice(
              user.company_id,
              args.product_name,
              args.new_price,
            );
            if (proposal.success) {
              pendingAction = proposal.action;
              apiResponse = {
                status: 'PROPOSAL_CREATED_WAITING_FOR_USER_APPROVAL',
                message:
                  'Tolong beritahu user bahwa tombol persetujuan sudah muncul di layar.',
              };
            } else {
              apiResponse = { status: 'FAILED', message: proposal.message };
            }
          } else if (toolCall.function.name === 'create_product') {
            const proposal = await this.proposeCreateProduct(
              user.company_id,
              args.product_name,
              args.selling_price,
              args.category,
              args.size,
            );
            if (proposal.success) {
              pendingAction = proposal.action;
              apiResponse = {
                status: 'PROPOSAL_CREATED_WAITING_FOR_USER_APPROVAL',
                message:
                  'Tolong beritahu user bahwa tombol persetujuan penambahan produk sudah muncul di layar.',
              };
            } else {
              apiResponse = { status: 'FAILED', message: proposal.message };
            }
          } else if (toolCall.function.name === 'add_income') {
            const proposal = await this.proposeAddIncome(
              user.company_id,
              args.amount,
              args.description,
            );
            if (proposal.success) {
              pendingAction = proposal.action;
              apiResponse = {
                status: 'PROPOSAL_CREATED_WAITING_FOR_USER_APPROVAL',
                message:
                  'Tolong beritahu user bahwa tombol konfirmasi penambahan pemasukan sudah muncul di layar.',
              };
            } else {
              apiResponse = { status: 'FAILED', message: proposal.message };
            }
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(apiResponse),
          });
        }

        // Panggilan kedua (setelah function executed) dengan fallback logic
        responseMessage = await this.executeWithFallback(messages, false);
      }

      const finalResponse = responseMessage.content || '';

      await this.prisma.aiChatHistory.create({
        data: {
          company: { connect: { id: user.company_id || user.companyId } },
          user: { connect: { id: user.userId || user.id } },
          prompt: prompt,
          response: finalResponse,
          module: 'General',
        },
      });

      return { response: finalResponse, action: pendingAction };
    } catch (error: any) {
      this.logger.error(`AI Chat Error: ${error.message}`);
      return { response: `Maaf, terjadi error: ${error.message}` };
    }
  }

  // --- Read Tools ---
  private async getFinancialSummary(companyId: string) {
    const accounts = await this.prisma.cashAccount.findMany({
      where: { company_id: companyId },
    });
    return {
      accounts: accounts.map((a) => ({
        name: a.name,
        balance: Number(a.current_balance),
      })),
      total: accounts.reduce((sum, a) => sum + Number(a.current_balance), 0),
    };
  }

  private async getTimberLogsSummary(companyId: string) {
    const rawLogs = await this.prisma.rawLog.count({
      where: { status: 'AVAILABLE' },
    });
    const trimmedLogs = await this.prisma.trimmedLog.count({
      where: { status: 'AVAILABLE' },
    });
    const inputLogs = await this.prisma.inputLog.count({
      where: { status: { in: ['AVAILABLE', 'IN_PROCESS'] } },
    });
    const timberStocks = await this.prisma.timberStock.findMany({
      include: { timberVariant: true },
    });

    let currentStockM3 = 0;
    let currentStockPcs = 0;
    for (const stock of timberStocks) {
      currentStockPcs += stock.currentPcs;
      currentStockM3 += stock.currentVolumeM3;
    }

    return {
      raw_logs_available: rawLogs,
      trimmed_logs_available: trimmedLogs,
      input_logs_in_production: inputLogs,
      sawn_timber_stock: {
        total_pcs: currentStockPcs,
        total_m3: currentStockM3,
        variants_count: timberStocks.length,
      },
    };
  }

  private async getInventoryStatus(companyId: string, limit: number = 10) {
    const products = await this.prisma.product.findMany({
      where: { company_id: companyId },
      include: { warehouse_stocks: true },
      take: limit || 10,
    });

    const rawLogs = await this.prisma.rawLog.count({
      where: { status: 'AVAILABLE' },
    });
    const trimmedLogs = await this.prisma.trimmedLog.count({
      where: { status: 'AVAILABLE' },
    });
    const inputLogs = await this.prisma.inputLog.count({
      where: { status: { in: ['AVAILABLE', 'IN_PROCESS'] } },
    });
    const timberStocks = await this.prisma.timberStock.findMany({
      include: { timberVariant: true },
    });

    let currentStockM3 = 0;
    let currentStockPcs = 0;
    for (const stock of timberStocks) {
      currentStockPcs += stock.currentPcs;
      currentStockM3 += stock.currentVolumeM3;
    }

    return {
      finished_products: products.map((p) => ({
        name: p.name,
        price: p.selling_price,
        stock: p.warehouse_stocks.reduce((sum, s) => sum + s.current_stock, 0),
      })),
      raw_logs_available: rawLogs,
      trimmed_logs_available: trimmedLogs,
      input_logs_in_production: inputLogs,
      sawn_timber_stock: {
        total_pcs: currentStockPcs,
        total_m3: currentStockM3,
        variants_count: timberStocks.length,
      },
    };
  }

  // --- Write Tools (Propose & Execute) ---
  private async proposeUpdateProductPrice(
    companyId: string,
    productName: string,
    newPrice: number,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        company_id: companyId,
        name: { contains: productName, mode: 'insensitive' },
      },
    });

    if (!product)
      return {
        success: false,
        message: `Produk '${productName}' tidak ditemukan.`,
      };

    return {
      success: true,
      action: {
        type: 'UPDATE_PRODUCT_PRICE',
        title: `Ubah Harga: ${product.name}`,
        description: `Harga akan diubah dari Rp ${product.selling_price} menjadi Rp ${newPrice}`,
        payload: { productId: product.id, newPrice: newPrice },
        undoData: { productId: product.id, oldPrice: product.selling_price },
      },
    };
  }

  private async proposeCreateProduct(
    companyId: string,
    productName: string,
    sellingPrice: number,
    categoryName?: string,
    size?: string,
  ) {
    return {
      success: true as boolean,
      message: '',
      action: {
        type: 'CREATE_PRODUCT',
        title: `Tambah Produk Baru: ${productName}`,
        description: `Harga: Rp ${sellingPrice}${categoryName ? ` | Kategori: ${categoryName}` : ''}${size ? ` | Info: ${size}` : ''}`,
        payload: { companyId, productName, sellingPrice, categoryName, size },
      },
    };
  }

  private async proposeAddIncome(
    companyId: string,
    amount: number,
    description: string,
  ) {
    return {
      success: true,
      message: '',
      action: {
        type: 'ADD_INCOME',
        title: `Tambah Pemasukan`,
        description: `Nominal: Rp ${amount.toLocaleString('id-ID')} | Keterangan: ${description}`,
        payload: { companyId, amount, description },
      },
    };
  }

  async executeAction(companyId: string, actionData: any, userId?: string) {
    if (actionData.type === 'UPDATE_PRODUCT_PRICE') {
      await this.prisma.product.update({
        where: { id: actionData.payload.productId, company_id: companyId },
        data: { selling_price: actionData.payload.newPrice },
      });
      return { success: true, message: 'Harga berhasil diperbarui.' };
    } else if (actionData.type === 'CREATE_PRODUCT') {
      const { productName, sellingPrice, categoryName, size } =
        actionData.payload;

      // Get or create unit
      let unit = await this.prisma.unit.findFirst({
        where: { company_id: companyId },
      });
      if (!unit) {
        unit = await this.prisma.unit.create({
          data: { company_id: companyId, name: 'Pcs' },
        });
      }

      // Get or create category
      let categoryId: string | null = null;
      if (categoryName) {
        let category = await this.prisma.category.findFirst({
          where: {
            company_id: companyId,
            name: { equals: categoryName, mode: 'insensitive' },
          },
        });
        if (!category) {
          category = await this.prisma.category.create({
            data: { company_id: companyId, name: categoryName },
          });
        }
        categoryId = category.id;
      }

      const productCode = await this.sequenceService.generateNumber(
        this.prisma,
        companyId,
        'PRODUCT',
        'PRD',
      );

      await this.prisma.product.create({
        data: {
          company_id: companyId,
          name: productName,
          description: size || '',
          selling_price: sellingPrice,
          purchase_price: sellingPrice * 0.8, // Estimate
          code: productCode,
          barcode: `AI-${productCode}-${Date.now()}`,
          unit_id: unit.id,
          category_id: categoryId,
        },
      });
      return { success: true, message: 'Produk berhasil ditambahkan.' };
    } else if (actionData.type === 'ADD_INCOME') {
      const { amount, description } = actionData.payload;
      const transactionNo = await this.sequenceService.generateNumber(
        this.prisma,
        companyId,
        'INCOME',
        'INC',
      );
      await this.financeService.createCashIn({
        companyId,
        cashAccountId: '', // Will auto-resolve
        transactionNo: transactionNo,
        transactionDate: new Date(),
        description: description,
        amount: amount,
        categoryId: '', // Will auto-resolve
        userId:
          userId ||
          (await this.prisma.user.findFirst({
            where: { company_id: companyId },
          }))!.id, // In a real app this should always be provided
        debitAccountId: '',
        creditAccountId: '',
      });
      return { success: true, message: 'Pemasukan berhasil ditambahkan.' };
    }
    return { success: false, message: 'Tindakan tidak dikenal.' };
  }

  async undoAction(companyId: string, actionData: any) {
    if (actionData.type === 'UPDATE_PRODUCT_PRICE') {
      await this.prisma.product.update({
        where: { id: actionData.undoData.productId, company_id: companyId },
        data: { selling_price: actionData.undoData.oldPrice },
      });
      return {
        success: true,
        message: 'Perubahan harga berhasil dibatalkan (Undo).',
      };
    }
    return { success: false, message: 'Tindakan tidak dikenal.' };
  }

  async getHistory(companyId: string, userId: string) {
    return this.prisma.aiChatHistory.findMany({
      where: { company_id: companyId, user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }
}
