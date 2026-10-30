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
import { SupplierCreditService } from './supplier-credit.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Permissions } from '../../auth/permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('purchasing/supplier-credits')
export class SupplierCreditController {
  constructor(
    private readonly supplierCreditService: SupplierCreditService,
  ) {}

  @Get()
  @Permissions('view:supplier_credit')
  findAll(
    @Request() req: any,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
  ) {
    return this.supplierCreditService.findAll(req.user.company_id, {
      supplierId,
      status,
    });
  }

  @Get(':id')
  @Permissions('view:supplier_credit')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.supplierCreditService.findOne(req.user.company_id, id);
  }

  @Post('from-return/:returnId')
  @Permissions('create:supplier_credit')
  createFromReturn(
    @Request() req: any,
    @Param('returnId') returnId: string,
  ) {
    return this.supplierCreditService.createFromPurchaseReturn(
      req.user.company_id,
      returnId,
      req.user.id,
    );
  }

  @Post(':id/apply')
  @Permissions('apply:supplier_credit')
  applyCredit(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      vendorBillId: string;
      amount: number;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.supplierCreditService.applyCredit(
      req.user.company_id,
      id,
      body,
      req.user.id,
    );
  }

  @Post(':id/refund')
  @Permissions('refund:supplier_credit')
  refundCredit(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      cashAccountId: string;
      amount: number;
      reference?: string;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.supplierCreditService.refundCredit(
      req.user.company_id,
      id,
      body,
      req.user.id,
    );
  }

  @Post('applications/:applicationId/reverse')
  @Permissions('reverse:supplier_credit')
  reverseApplication(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
    @Body('reason') reason: string,
  ) {
    return this.supplierCreditService.reverseApplication(
      req.user.company_id,
      applicationId,
      reason,
      req.user.id,
    );
  }

  @Post(':id/reverse')
  @Permissions('reverse:supplier_credit')
  reverseCreditNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.supplierCreditService.reverseCreditNote(
      req.user.company_id,
      id,
      reason,
      req.user.id,
    );
  }
}
