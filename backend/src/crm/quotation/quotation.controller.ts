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
import { QuotationService } from './quotation.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/quotations')
export class QuotationController {
  constructor(private service: QuotationService) {}
  @Permissions('quotation.create')
  @Post()
  create(@Request() req, @Body() data: any) {
    return this.service.create(req.user.company_id, data);
  }
  @Permissions('quotation.view')
  @Get()
  findAll(
    @Request() req,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.service.findAll(req.user.company_id, +page || 1, +limit || 10);
  }
  @Permissions('quotation.view')
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.company_id, id);
  }
  @Permissions('quotation.create')
  @Post(':id/confirm')
  confirm(@Request() req, @Param('id') id: string) {
    return this.service.confirm(req.user.company_id, id);
  }
  @Permissions('quotation.create')
  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.service.cancel(req.user.company_id, id);
  }
  @Permissions('quotation.create')
  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.service.update(req.user.company_id, id, data);
  }
  @Permissions('quotation.create')
  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.company_id, id);
  }
}
