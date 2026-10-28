import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('finance/invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoiceController {
  constructor(
    private service: InvoiceService,
    private prisma: PrismaService,
  ) {}
  @Permissions('invoice.create')
  @Post()
  createStandardInvoice(@Request() req, @Body() data: any) {
    return this.service.create(req.user.company_id, data);
  }
  @Permissions('invoice.create')
  @Post('from-so')
  create(@Request() req, @Body() data: { salesOrderId: string; items?: any[]; notes?: string; paymentTerms?: string }) {
    return this.service.createFromSO(req.user.company_id, data.salesOrderId, data);
  }
  @Permissions('invoice.view')
  @Get()
  async findAll(@Request() req, @Query('type') type?: string) {
    const where: any = { company_id: req.user.company_id };
    if (type) where.type = type;
    const data = await this.prisma.invoice.findMany({
      where,
      include: { customer: true, supplier: true },
      orderBy: { created_at: 'desc' },
    });
    return { data };
  }
  @Permissions('invoice.view')
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.prisma.invoice.findFirst({
      where: { id, company_id: req.user.company_id },
      include: {
        items: { include: { product: true } },
        customer: true,
        supplier: true,
        payments: true,
        PaymentAllocation: {
          include: {
            payment: true,
            sales_order: true,
          },
        },
      },
    });
  }
  @Permissions('invoice.create')
  @Post(':id/post')
  post(@Request() req, @Param('id') id: string) {
    return this.service.post(req.user.company_id, id);
  }
  @Permissions('invoice.create')
  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.service.cancel(req.user.company_id, id);
  }
  @Permissions('invoice.create')
  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.service.update(req.user.company_id, id, data);
  }
  @Permissions('invoice.create')
  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.company_id, id);
  }
}
