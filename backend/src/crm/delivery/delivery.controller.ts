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
import { DeliveryService } from './delivery.service';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/deliveries')
export class DeliveryController {
  constructor(
    private service: DeliveryService,
    private prisma: PrismaService,
  ) {}

  @Permissions('delivery.create')
  @Post(':soId')
  create(@Request() req, @Param('soId') soId: string, @Body() data: any) {
    const compId = req.user.company_id || req.user.companyId;
    return this.service.create(compId, soId, data);
  }

  @Permissions('delivery.view')
  @Get()
  async findAll(@Request() req) {
    const compId = req.user.company_id || req.user.companyId;
    const data = await this.prisma.deliveryOrder.findMany({
      where: { company_id: compId },
      include: {
        sales_order: {
          include: { customer: true },
        },
        items: {
          include: { product: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return { data };
  }

  @Permissions('delivery.view')
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const compId = req.user.company_id || req.user.companyId;
    return this.prisma.deliveryOrder.findUnique({
      where: { id, company_id: compId },
      include: {
        items: {
          include: { product: true },
        },
        sales_order: {
          include: { customer: true },
        },
      },
    });
  }

  @Permissions('delivery.create')
  @Post(':id/validate')
  validate(
    @Request() req,
    @Param('id') id: string,
    @Body() body?: { warehouseId?: string },
  ) {
    const compId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.service.validate(compId, id, userId, body?.warehouseId);
  }

  @Permissions('delivery.create')
  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    const compId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.service.cancel(compId, id, userId);
  }
}
