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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import { SalesOrderService } from './sales-order.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Permissions('quotation.view')
  @Get()
  async findAll(@Request() req, @Query() query: any) {
    const compId = req.user.company_id || req.user.companyId;
    return this.salesOrderService.findAll(compId, query);
  }

  @Permissions('quotation.create')
  @Post()
  async createOrder(@Request() req, @Body() body: any) {
    const compId = req.user.company_id || req.user.companyId;
    const userId = req.user.userId || req.user.id;
    return this.salesOrderService.create(compId, body, userId);
  }

  @Permissions('quotation.view')
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const compId = req.user.company_id || req.user.companyId;
    return this.salesOrderService.findOne(compId, id);
  }
}
