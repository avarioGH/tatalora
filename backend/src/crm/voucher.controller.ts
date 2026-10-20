import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getVouchers(@Request() req) {
    return this.prisma.voucher.findMany({
      where: { company_id: req.user.company_id },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post()
  async createVoucher(@Request() req, @Body() data: any) {
    return this.prisma.voucher.create({
      data: {
        company_id: req.user.company_id,
        code: data.code,
        name: data.name,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_purchase: data.min_purchase,
        max_discount: data.max_discount,
        quota: data.quota || 0,
        valid_from: new Date(data.valid_from),
        valid_until: new Date(data.valid_until),
        status: data.status !== undefined ? data.status : true,
      },
    });
  }
}
