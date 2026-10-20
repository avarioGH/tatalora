import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StockInTallyService } from './stock-in-tally.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/stock-in-tally')
export class StockInTallyController {
  constructor(private readonly service: StockInTallyService) {}

  @Permissions('inventory.create')
  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.service.create(
      req.user.companyId || req.user.company_id,
      req.user.userId || req.user.id,
      data,
    );
  }

  @Permissions('inventory.view')
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.companyId || req.user.company_id);
  }

  @Permissions('inventory.delete')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(
      req.user.companyId || req.user.company_id,
      req.user.userId || req.user.id,
      id,
    );
  }
}
