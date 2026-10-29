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

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/invoices')
export class InvoicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Permissions('finance.invoice.view')
  @Get()
  async getInvoices(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('customer_id') customerId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const companyId = req.user.company_id || req.user.companyId;
    const where: any = { company_id: companyId };
    if (type) where.type = type;
    if (status && status !== 'Semua') where.status = status;
    if (customerId) where.customer_id = customerId;
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        take: limit,
        orderBy: { invoice_date: 'desc' },
        include: {
          customer: true,
          supplier: true,
          sales_order: true,
          purchase_order: true,
          items: { include: { product: true } },
        },
      }),
    ]);

    return { total, limit, data };
  }

  @Permissions('finance.invoice.view')
  @Get(':id')
  async getInvoice(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.invoice.findFirst({
      where: { id, company_id: companyId },
      include: {
        customer: true,
        supplier: true,
        sales_order: true,
        purchase_order: true,
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('finance.invoice.create')
  @Post()
  async createInvoice(@Request() req: any, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    const items = data.items || [];
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.subtotal || it.total) || Number(it.qty || 1) * Number(it.unit_price || it.price || 0) || 0),
      0,
    );
    const tax = Number(data.tax || data.tax_amount || 0);
    const total = Number(data.total) || Number(data.total_amount) || (subtotal + tax);
    const paidAmount = Number(data.paid_amount || 0);
    const remainingAmount = total - paidAmount;

    const invoiceType = data.type || (data.supplier_id || (data.partner_id && !data.customer_id) ? 'AP' : 'AR');
    const supplierId = invoiceType === 'AP' ? (data.supplier_id || data.partner_id || data.customer_id) : (data.supplier_id || null);
    const customerId = invoiceType === 'AR' ? (data.customer_id || data.partner_id) : (data.customer_id || null);

    return this.prisma.invoice.create({
      data: {
        company_id: companyId,
        type: invoiceType,
        customer_id: customerId,
        supplier_id: supplierId,
        sales_order_id: data.sales_order_id || null,
        purchase_order_id: data.purchase_order_id || null,
        warehouse_id: data.warehouse_id || null,
        invoice_number: data.invoice_number || `INV-${Date.now()}`,
        invoice_date: data.invoice_date || data.issue_date ? new Date(data.invoice_date || data.issue_date) : new Date(),
        due_date: data.due_date ? new Date(data.due_date) : null,
        status: data.status || 'UNPAID',
        email: data.email || null,
        billing_address: data.billing_address || null,
        payment_terms: data.payment_terms || 'net30',
        subtotal: subtotal,
        tax: tax,
        total: total,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        discount_percent: Number(data.discount_percent || 0),
        discount_amount: Number(data.discount_amount || 0),
        items: {
          create: items.map((it: any) => ({
            product_id: it.product_id || it.productId,
            qty: Number(it.qty || it.quantity || 1),
            unit_price: Number(it.unit_price || it.price || 0),
            discount: Number(it.discount || it.discount_amount || 0),
            tax: Number(it.tax || it.tax_amount || 0),
            subtotal: Number(it.subtotal || it.total || Number(it.qty || 1) * Number(it.unit_price || it.price || 0)),
            description: it.description || null,
          })),
        },
      },
      include: {
        customer: true,
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  @Permissions('finance.invoice.create')
  @Post('bulk-import')
  async bulkImportInvoices(@Request() req: any, @Body() body: { invoices: any[] }) {
    const companyId = req.user.company_id || req.user.companyId;
    const invoices = body.invoices || [];
    const results: any[] = [];

    for (const inv of invoices) {
      const items = inv.items || [];
      const subtotal = items.reduce(
        (sum: number, it: any) => sum + (Number(it.subtotal || it.total) || Number(it.qty || 1) * Number(it.unit_price || it.price || 0) || 0),
        0,
      );
      const tax = Number(inv.tax || inv.tax_amount || 0);
      const total = Number(inv.total) || Number(inv.total_amount) || (subtotal + tax);
      const invoiceType = inv.type || 'AR';

      const created = await this.prisma.invoice.create({
        data: {
          company_id: companyId,
          type: invoiceType,
          customer_id: inv.customer_id || null,
          supplier_id: inv.supplier_id || null,
          invoice_number: inv.invoice_number || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          invoice_date: inv.invoice_date ? new Date(inv.invoice_date) : new Date(),
          due_date: inv.due_date ? new Date(inv.due_date) : null,
          status: inv.status || 'UNPAID',
          subtotal: subtotal,
          tax: tax,
          total: total,
          paid_amount: Number(inv.paid_amount || 0),
          remaining_amount: total - Number(inv.paid_amount || 0),
          items: {
            create: items.map((it: any) => ({
              product_id: it.product_id || it.productId,
              qty: Number(it.qty || 1),
              unit_price: Number(it.unit_price || it.price || 0),
              subtotal: Number(it.subtotal || it.total || Number(it.qty || 1) * Number(it.unit_price || it.price || 0)),
              description: it.description || null,
            })),
          },
        },
      });
      results.push(created);
    }

    return { count: results.length, data: results };
  }

  @Permissions('finance.invoice.edit')
  @Post(':id/post')
  async postInvoice(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.invoice.updateMany({
      where: { id, company_id: companyId },
      data: { status: 'POSTED' },
    });
  }

  @Permissions('finance.invoice.delete')
  @Delete(':id')
  async deleteInvoice(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id || req.user.companyId;
    await this.prisma.invoiceItem.deleteMany({ where: { invoice_id: id } });
    return this.prisma.invoice.deleteMany({ where: { id, company_id: companyId } });
  }
}
