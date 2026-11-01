import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CustomerCreditService } from './customer-credit.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Permissions } from '../../auth/permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sales/customer-credits')
export class CustomerCreditController {
  constructor(
    private readonly customerCreditService: CustomerCreditService,
  ) {}

  @Get()
  @Permissions('sales:view')
  async findAll(@Request() req: any, @Query() query: any) {
    const companyId = req.user.company_id;
    return this.customerCreditService.findAll(companyId, query);
  }

  @Get(':id')
  @Permissions('sales:view')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.customerCreditService.findOne(companyId, id);
  }

  @Post('from-sales-return')
  @Permissions('sales:update')
  async createFromSalesReturn(
    @Request() req: any,
    @Body('salesReturnId') salesReturnId: string,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.customerCreditService.createFromSalesReturn(
      companyId,
      salesReturnId,
      userId,
    );
  }

  @Post(':id/apply')
  @Permissions('sales:update')
  async applyCredit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { invoiceId: string; amount: number; notes?: string; idempotencyKey?: string },
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.customerCreditService.applyCredit(
      companyId,
      id,
      body,
      userId,
    );
  }

  @Post(':id/refund')
  @Permissions('sales:update')
  async refundCredit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { cashAccountId: string; amount: number; reference?: string; notes?: string; idempotencyKey?: string },
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.customerCreditService.refundCredit(
      companyId,
      id,
      body,
      userId,
    );
  }

  @Post('applications/:applicationId/reverse')
  @Permissions('sales:update')
  async reverseApplication(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
    @Body('reason') reason: string,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.customerCreditService.reverseApplication(
      companyId,
      applicationId,
      reason,
      userId,
    );
  }

  @Post(':id/reverse')
  @Permissions('sales:update')
  async reverseCreditNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.customerCreditService.reverseCreditNote(
      companyId,
      id,
      reason,
      userId,
    );
  }
}
