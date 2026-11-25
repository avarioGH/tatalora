import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../crm/delivery/delivery.service';
import { SequenceService } from '../reports/sequence.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: DeliveryService,
    private readonly sequenceService: SequenceService,
  ) {}

  // ----------------------------------------------------
  // 1. QUOTATIONS (Penawaran Penjualan)
  // ----------------------------------------------------
  @Permissions('sales.quotation.view')
  @Get('quotations')
  async getQuotations(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const companyId = req.user.company_id || req.user.companyId;
    const where: any = { company_id: companyId };
    if (status && status !== 'Semua') where.status = status;
    if (search) {
      where.OR = [
        { quotation_number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.quotation.count({ where }),
      this.prisma.quotation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { quotation_date: 'desc' },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      }),
    ]);

    return { total, page, limit, data };
  }

  @Permissions('sales.quotation.view')
  @Get('quotations/:id')
  async getQuotation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
      include: {
        customer: true,
        items: { include: { product: true } },
        sales_orders: {
          select: { id: true, order_number: true, status: true, order_date: true, total_amount: true, deliveries: { select: { id: true, delivery_number: true, status: true } }, invoices: { select: { id: true, invoice_number: true, status: true } } },
        },
      },
    });
  }

  @Permissions('sales.quotation.create')
  @Post('quotations')
  async createQuotation(@Request() req: any, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    const customerId = data.customer_id || data.customerId;
    const items = data.items || [];
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.subtotal) || Number(it.qty) * Number(it.unit_price || it.price) || 0),
      0,
    );
    const totalAmount = Number(data.total_amount ?? data.total) || subtotal;

    return this.prisma.quotation.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        quotation_number: data.quotation_number || data.quotationNumber || await this.sequenceService.generateNumber(this.prisma, companyId, 'QUOTATION', 'SQ', 4),
        quotation_date: (data.quotation_date || data.quotationDate) ? new Date(data.quotation_date || data.quotationDate) : new Date(),
        expiration_date: (data.expiration_date || data.expirationDate) ? new Date(data.expiration_date || data.expirationDate) : null,
        status: data.status || 'DRAFT',
        total_amount: totalAmount,
        notes: data.notes || null,
        billing_address: data.billing_address || data.billingAddress || null,
        delivery_address: data.delivery_address || data.deliveryAddress || null,
        payment_terms: data.payment_terms || data.paymentTerms || 'net30',
        email: data.email || null,
        tag: data.tag || null,
        client_ref: data.client_ref || data.clientRef || null,
        currency: data.currency || 'IDR',
        message: data.message || null,
        memo: data.memo || null,
        subtotal: Number(data.subtotal) > 0 ? Number(data.subtotal) : subtotal,
        discount_percent: Number(data.discount_percent || data.discountPercent || 0),
        discount_amount: Number(data.discount_amount || data.discountAmount || 0),
        tax: Number(data.tax || 0),
        items: {
          create: items.map((it: any) => ({
            product_id: it.product_id || it.productId,
            qty: Number(it.qty || 1),
            unit: it.unit || 'Pcs',
            unit_price: Number(it.unit_price || it.price || 0),
            discount: Number(it.discount || 0),
            tax: Number(it.tax || 0),
            subtotal: Number(it.subtotal || Number(it.qty || 1) * Number(it.unit_price || it.price || 0)),
            description: it.description || null,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('sales.quotation.edit')
  @Put('quotations/:id')
  async updateQuotation(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    const customerId = data.customer_id || data.customerId;

    if (data.items) {
      await this.prisma.quotationItem.deleteMany({ where: { quotation_id: id } });
    }

    const items = data.items || [];
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.subtotal) || Number(it.qty) * Number(it.unit_price || it.price) || 0),
      0,
    );
    const totalAmount = data.total_amount !== undefined ? Number(data.total_amount) : (data.total !== undefined ? Number(data.total) : (items.length > 0 ? subtotal : undefined));

    return this.prisma.quotation.update({
      where: { id },
      data: {
        customer_id: customerId || undefined,
        status: data.status || undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        billing_address: (data.billing_address || data.billingAddress) !== undefined ? (data.billing_address || data.billingAddress) : undefined,
        delivery_address: (data.delivery_address || data.deliveryAddress) !== undefined ? (data.delivery_address || data.deliveryAddress) : undefined,
        payment_terms: (data.payment_terms || data.paymentTerms) !== undefined ? (data.payment_terms || data.paymentTerms) : undefined,
        email: data.email !== undefined ? data.email : undefined,
        tag: data.tag !== undefined ? data.tag : undefined,
        client_ref: (data.client_ref || data.clientRef) !== undefined ? (data.client_ref || data.clientRef) : undefined,
        quotation_date: (data.quotation_date || data.quotationDate) ? new Date(data.quotation_date || data.quotationDate) : undefined,
        expiration_date: (data.expiration_date || data.expirationDate) ? new Date(data.expiration_date || data.expirationDate) : undefined,
        total_amount: totalAmount,
        subtotal: Number(data.subtotal) > 0 ? Number(data.subtotal) : (subtotal || undefined),
        discount_percent: data.discount_percent !== undefined ? Number(data.discount_percent) : (data.discountPercent !== undefined ? Number(data.discountPercent) : undefined),
        discount_amount: data.discount_amount !== undefined ? Number(data.discount_amount) : (data.discountAmount !== undefined ? Number(data.discountAmount) : undefined),
        tax: data.tax !== undefined ? Number(data.tax) : undefined,
        items: items.length > 0 ? {
          create: items.map((it: any) => ({
            product_id: it.product_id || it.productId,
            qty: Number(it.qty || 1),
            unit: it.unit || 'Pcs',
            unit_price: Number(it.unit_price || it.price || 0),
            discount: Number(it.discount || 0),
            tax: Number(it.tax || 0),
            subtotal: Number(it.subtotal || Number(it.qty || 1) * Number(it.unit_price || it.price || 0)),
            description: it.description || null,
          })),
        } : undefined,
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('sales.quotation.delete')
  @Delete('quotations/:id')
  async deleteQuotation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    await this.prisma.quotationItem.deleteMany({ where: { quotation_id: id } });
    return this.prisma.quotation.deleteMany({ where: { id, company_id: companyId } });
  }

  @Permissions('sales.quotation.edit')
  @Post('quotations/:id/confirm')
  async confirmQuotation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });
    if (!quotation) {
      throw new Error('Penawaran tidak ditemukan');
    }

    if (quotation.status === 'CONVERTED') {
      const existingSo = await this.prisma.salesOrder.findFirst({
        where: { quotation_id: quotation.id },
      });
      if (existingSo) return { success: true, quotationId: id, salesOrder: existingSo };
    }

    let soNo: string;
    try {
      soNo = await this.sequenceService.generateNumber(this.prisma, companyId, 'SALES_ORDER', 'SO', 4);
    } catch {
      soNo = `SO/${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`;
    }

    // Check duplicate order_number
    const clash = await this.prisma.salesOrder.findFirst({
      where: { company_id: companyId, order_number: soNo },
    });
    if (clash) {
      soNo = `SO/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    }

    // Create Sales Order directly from quotation
    const salesOrder = await this.prisma.salesOrder.create({
      data: {
        company_id: companyId,
        customer_id: quotation.customer_id,
        order_number: soNo,
        order_date: new Date(),
        status: 'CONFIRMED',
        total_amount: quotation.total_amount,
        notes: quotation.notes,
        quotation_id: quotation.id,
        billing_address: quotation.billing_address,
        payment_method: 'Transfer',
        payment_status: 'UNPAID',
        items: {
          create: (quotation.items || []).map((it: any) => ({
            product_id: it.product_id,
            qty: Number(it.qty || 1),
            unit_price: Number(it.unit_price || 0),
            subtotal: Number(it.subtotal || Number(it.qty || 1) * Number(it.unit_price || 0)),
          })),
        },
      },
    });

    // Update quotation status
    await this.prisma.quotation.update({
      where: { id },
      data: { status: 'CONVERTED' },
    });

    return { success: true, quotationId: id, salesOrder };
  }

  @Permissions('sales.quotation.edit')
  @Post('quotations/:id/cancel')
  async cancelQuotation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.quotation.updateMany({
      where: { id, company_id: companyId },
      data: { status: 'CANCELLED' },
    });
  }

  @Permissions('sales.quotation.edit')
  @Post('quotations/:id/send')
  async sendQuotation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.quotation.updateMany({
      where: { id, company_id: companyId },
      data: { status: 'SENT' },
    });
  }

  // ----------------------------------------------------
  // 2. SALES ORDERS (Pesanan Penjualan)
  // ----------------------------------------------------
  @Permissions('sales.order.view')
  @Get('orders')
  async getSalesOrders(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const companyId = req.user.company_id || req.user.companyId;
    const where: any = { company_id: companyId };
    if (status && status !== 'Semua') where.status = status;
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.salesOrder.count({ where }),
      this.prisma.salesOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { order_date: 'desc' },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      }),
    ]);

    return { total, page, limit, data };
  }

  @Permissions('sales.order.view')
  @Get('orders/:id')
  async getSalesOrder(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.salesOrder.findFirst({
      where: { id, company_id: companyId },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('sales.order.create')
  @Post('orders')
  async createSalesOrder(@Request() req: any, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    const items = data.items || [];
    const totalAmount =
      Number(data.total_amount) ||
      items.reduce(
        (sum: number, it: any) => sum + (Number(it.subtotal) || Number(it.qty) * Number(it.unit_price) || 0),
        0,
      );

    return this.prisma.salesOrder.create({
      data: {
        company_id: companyId,
        customer_id: data.customer_id,
        order_number: data.order_number || await this.sequenceService.generateNumber(this.prisma, companyId, 'SALES_ORDER', 'SO', 4),
        order_date: data.order_date ? new Date(data.order_date) : new Date(),
        status: data.status || 'CONFIRMED',
        total_amount: totalAmount,
        notes: data.notes || null,
        warehouse_id: data.warehouse_id || null,
        quotation_id: data.quotation_id || null,
        billing_address: data.billing_address || null,
        payment_method: data.payment_method || 'Transfer',
        payment_status: data.payment_status || 'UNPAID',
        items: {
          create: items.map((it: any) => ({
            product_id: it.product_id,
            qty: Number(it.qty || 1),
            unit_price: Number(it.unit_price || 0),
            subtotal: Number(it.subtotal || Number(it.qty || 1) * Number(it.unit_price || 0)),
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('sales.order.delete')
  @Delete('orders/:id')
  async deleteSalesOrder(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    await this.prisma.salesOrderItem.deleteMany({ where: { sales_order_id: id } });
    return this.prisma.salesOrder.deleteMany({ where: { id, company_id: companyId } });
  }

  // ----------------------------------------------------
  // 3. DELIVERIES (Surat Jalan / Pengiriman)
  // ----------------------------------------------------
  @Permissions('sales.delivery.view')
  @Get('deliveries')
  async getDeliveries(@Request() req: any) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.deliveryOrder.findMany({
      where: { company_id: companyId },
      orderBy: { delivery_date: 'desc' },
      include: {
        sales_order: { include: { customer: true } },
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('sales.delivery.create')
  @Post('deliveries/:soId')
  async createDelivery(@Request() req: any, @Param('soId') soId: string, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.deliveryService.create(companyId, soId, data);
  }
}
