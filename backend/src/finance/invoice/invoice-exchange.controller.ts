import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import { InvoiceExchangeService } from './invoice-exchange.service';

@Controller('finance/invoice-exchanges')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoiceExchangeController {
  constructor(private service: InvoiceExchangeService) {}

  @Permissions('invoice.create')
  @Post()
  create(@Request() req, @Body() data: any) {
    return this.service.create(req.user.company_id, data);
  }

  @Permissions('invoice.view')
  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.company_id);
  }

  @Permissions('invoice.view')
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.company_id, id);
  }
}
