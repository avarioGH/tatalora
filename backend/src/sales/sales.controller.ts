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
          select: { id: true, order_number: true, status: true },
        },
      },
    });
  }

  @Permissions('sales.quotation.create')
  @Post('quotations')
  async createQuotation(@Request() req: any, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    const items = data.items || [];
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.subtotal) || Number(it.qty) * Number(it.unit_price) || 0),
      0,
    );
    const totalAmount = Number(data.total_amount) || subtotal;

    return this.prisma.quotation.create({
      data: {
        company_id: companyId,
        customer_id: data.customer_id,
        quotation_number: data.quotation_number || await this.sequenceService.generateNumber(this.prisma, companyId, 'QUOTATION', 'SQ', 4),
        quotation_date: data.quotation_date ? new Date(data.quotation_date) : new Date(),
        expiration_date: data.expiration_date ? new Date(data.expiration_date) : null,
        status: data.status || 'DRAFT',
        total_amount: totalAmount,
        notes: data.notes || null,
        billing_address: data.billing_address || null,
        delivery_address: data.delivery_address || null,
        payment_terms: data.payment_terms || 'net30',
        email: data.email || null,
        subtotal: subtotal,
        discount_percent: Number(data.discount_percent || 0),
        discount_amount: Number(data.discount_amount || 0),
        tax: Number(data.tax || 0),
        items: {
          create: items.map((it: any) => ({
            product_id: it.product_id,
            qty: Number(it.qty || 1),
            unit: it.unit || 'Pcs',
            unit_price: Number(it.unit_price || 0),
            discount: Number(it.discount || 0),
            tax: Number(it.tax || 0),
            subtotal: Number(it.subtotal || Number(it.qty || 1) * Number(it.unit_price || 0)),
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

    if (data.items) {
      await this.prisma.quotationItem.deleteMany({ where: { quotation_id: id } });
    }

    const items = data.items || [];
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.subtotal) || Number(it.qty) * Number(it.unit_price) || 0),
      0,
    );
    const totalAmount = data.total_amount !== undefined ? Number(data.total_amount) : (items.length > 0 ? subtotal : undefined);

    return this.prisma.quotation.update({
      where: { id },
      data: {
        customer_id: data.customer_id || undefined,
        status: data.status || undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        quotation_date: data.quotation_date ? new Date(data.quotation_date) : undefined,
        expiration_date: data.expiration_date ? new Date(data.expiration_date) : undefined,
        total_amount: totalAmount,
        items: items.length > 0 ? {
          create: items.map((it: any) => ({
            product_id: it.product_id,
            qty: Number(it.qty || 1),
            unit: it.unit || 'Pcs',
            unit_price: Number(it.unit_price || 0),
            discount: Number(it.discount || 0),
            tax: Number(it.tax || 0),
            subtotal: Number(it.subtotal || Number(it.qty || 1) * Number(it.unit_price || 0)),
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

    const soNo = await this.sequenceService.generateNumber(this.prisma, companyId, 'SALES_ORDER', 'SO', 4);

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
      data: { status: 'CONFIRMED' },
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
