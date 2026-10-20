import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assume standard AuthGuard

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchasing')
export class PurchasingController {
  constructor(
    private service: PurchasingService,
    private prisma: PrismaService,
  ) {}

  @Permissions('purchasing.view')
  @Get('requests')
  getPurchaseRequests(
    @Request() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getPurchaseRequests(
      req.user.companyId,
      +page || 1,
      +limit || 50,
      search,
      status,
    );
  }

  @Permissions('purchasing.create')
  @Post('requests')
  createPurchaseRequest(@Request() req: any, @Body() data: any) {
    return this.service.createPurchaseRequest(req.user.companyId, data);
  }

  @Permissions('purchasing.create')
  @Post('suppliers/price')
  setSupplierPrice(@Request() req: any, @Body() data: any) {
    return this.service.setSupplierProductPrice(req.user.companyId, data);
  }

  @Permissions('purchasing.product.view')
  @Get('products/:id/vendor-comparison')
  getVendorComparison(@Request() req: any, @Param('id') id: string) {
    return this.service.getVendorComparison(req.user.companyId, id);
  }

  @Permissions('purchasing.create')
  @Post('rfq')
  createRFQ(@Request() req: any, @Body() data: any) {
    return this.service.createRFQ(req.user.companyId, data);
  }

  @Permissions('purchasing.create')
  @Post('rfq/:id/confirm')
  confirmPO(@Request() req: any, @Param('id') id: string) {
    return this.service.confirmPO(req.user.companyId, id);
  }

  @Permissions('purchasing.order.view')
  @Get('orders')
  findOrders(
    @Request() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findOrders(
      req.user.companyId,
      +page || 1,
      +limit || 10,
      search,
      status,
    );
  }

  @Permissions('purchasing.order.view')
  @Get('orders/:id')
  findOrder(@Request() req: any, @Param('id') id: string) {
    return this.service.findOrder(req.user.companyId, id);
  }

  @Permissions('purchasing.order.create')
  @Post('orders/:id/receive')
  receiveGoods(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.receiveGoods(req.user.companyId, id, data);
  }

  @Permissions('purchasing.order.create')
  @Post('orders/:id/bill')
  createVendorBill(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.createVendorBill(req.user.companyId, id, data);
  }

  @Permissions('purchasing.invoice.create')
  @Post('invoices/:id/pay')
  payVendorBill(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.payVendorBill(req.user.companyId, id, data);
  }

  @Permissions('purchasing.view')
  @Get('analytics')
  getAnalytics(@Request() req: any) {
    return this.service.getProcurementAnalytics(req.user.companyId);
  }

  @Permissions('purchasing.view')
  @Get('receipts')
  async getReceipts(@Request() req: any) {
    const data = await this.prisma.goodsReceipt.findMany({
      where: { company_id: req.user.companyId },
      include: { supplier: true, purchase_order: true },
      orderBy: { created_at: 'desc' },
    });
    return { data };
  }

  @Permissions('purchasing.view')
  @Get('receipts/:id')
  getReceipt(@Request() req: any, @Param('id') id: string) {
    return this.prisma.goodsReceipt.findUnique({
      where: { id, company_id: req.user.companyId },
      include: {
        items: { include: { product: true } },
        supplier: true,
        purchase_order: true,
      },
    });
  }
}
