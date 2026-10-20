import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
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
import { PaymentService } from './payment.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/payments')
export class PaymentController {
  constructor(private service: PaymentService) {}

  @Permissions('payment.create')
  @Post()
  create(@Request() req, @Body() data: any) {
    return this.service.create(
      req.user.company_id || req.user.companyId,
      data,
      req.user.id || req.user.userId,
    );
  }

  @Permissions('payment.view')
  @Get('cash-accounts')
  getCashAccounts(@Request() req) {
    return this.service.getCashAccounts(
      req.user.company_id || req.user.companyId,
    );
  }

  @Permissions('payment.view')
  @Get('available-deposits')
  getAvailableDeposits(
    @Request() req,
    @Query('customerId') customerId?: string,
    @Query('salesOrderId') salesOrderId?: string,
  ) {
    return this.service.getAvailableDeposits(
      req.user.company_id || req.user.companyId,
      customerId,
      salesOrderId,
    );
  }

  @Permissions('payment.create')
  @Post('apply-deposit')
  applyDeposit(
    @Request() req,
    @Body() data: { invoiceId: string; paymentId: string; amount: number; notes?: string },
  ) {
    return this.service.applyDeposit(
      req.user.company_id || req.user.companyId,
      data.invoiceId,
      data,
      req.user.id || req.user.userId,
    );
  }

  @Permissions('payment.create')
  @Post('allocations/:id/unallocate')
  unallocate(
    @Request() req,
    @Param('id') allocationId: string,
  ) {
    return this.service.unallocate(
      req.user.company_id || req.user.companyId,
      allocationId,
      req.user.id || req.user.userId,
    );
  }

  @Permissions('payment.create')
  @Post(':id/reverse')
  reversePayment(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.reversePayment(
      req.user.company_id || req.user.companyId,
      id,
      body?.reason || 'Dibatalkan oleh pengguna',
      req.user.id || req.user.userId,
    );
  }

  @Permissions('payment.view')
  @Get()
  async findAll(@Request() req, @Query('type') type?: string) {
    const data = await this.service.findAll(
      req.user.company_id || req.user.companyId,
    );
    return { data };
  }

  @Permissions('payment.view')
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.company_id || req.user.companyId, id);
  }
}
