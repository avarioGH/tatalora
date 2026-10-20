import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { Permissions } from '../../../../auth/permissions.decorator';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { TripayService } from './tripay.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';

@Controller('integrations/tripay')
export class TripayController {
  constructor(
    private readonly tripayService: TripayService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('tripay.view')
  @Get('transactions')
  async getTransactions(@Request() req: any) {
    return this.prisma.externalReference.findMany({
      where: { company_id: req.user.company_id, entity_type: 'TRIPAY_REF' },
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('tripay.create')
  @Post('pay')
  async pay(@Request() req: any, @Body() body: any) {
    return this.tripayService.createPaymentRequest(
      req.user.company_id,
      req.user.id,
      body.invoiceId,
      body.method,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('tripay.payment.create')
  @Post('payments/:extRefId/sync')
  async sync(@Request() req: any, @Param('extRefId') extRefId: string) {
    return this.tripayService.syncPaymentStatus(req.user.company_id, extRefId);
  }

  @Permissions('tripay.create')
  @Post('webhook')
  async webhook(
    @Body() body: any,
    @Headers('x-callback-signature') signature: string,
  ) {
    return this.tripayService.handleWebhook(body, signature);
  }
}
