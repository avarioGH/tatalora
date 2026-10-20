import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PosService } from './pos.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Permissions('pos.create')
  @Post('checkout')
  async checkout(@Request() req, @Body() data: any) {
    try {
      data.companyId = req.user.company_id || req.user.companyId;
      data.userId = req.user.userId || req.user.id;
      return await this.posService.processCheckout(data);
    } catch (error) {
      console.error('POS Checkout Error:', error);
      throw error;
    }
  }

  @Permissions('pos.view')
  @Get('history')
  async getHistory(@Request() req, @Query('warehouseId') warehouseId?: string) {
    return this.posService.getHistory(req.user.company_id, warehouseId);
  }

  @Permissions('pos.view')
  @Get('shift')
  async getCurrentShift(@Request() req) {
    return this.posService.getCurrentShift(
      req.user.company_id,
      req.user.userId || req.user.id,
    );
  }

  @Permissions('pos.create')
  @Post('shift/open')
  async openShift(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    data.userId = req.user.userId || req.user.id;
    return this.posService.openShift(data);
  }

  @Permissions('pos.create')
  @Post('shift/close')
  async closeShift(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    data.userId = req.user.userId || req.user.id;
    return this.posService.closeShift(data);
  }
}
