import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockTransferService } from './stock-transfer.service';
import { StockAdjustmentService } from './stock-adjustment.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimberLedgerController {
  constructor(
    private readonly transferService: StockTransferService,
    private readonly adjustmentService: StockAdjustmentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('timber-movements')
  @Permissions('read_inventory')
  async listMovements(@Query() query: any) {
    const { skip = 0, take = 50, search, type, referenceType } = query;
    const where: any = {};
    if (type) where.type = type;
    if (referenceType) where.referenceType = referenceType;
    if (search) {
      where.referenceId = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.timberStockMovement.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          timberStock: { include: { location: true, timberVariant: true } },
        },
      }),
      this.prisma.timberStockMovement.count({ where }),
    ]);
    return { items, total, skip: Number(skip), take: Number(take) };
  }

  // --- TRANSFERS ---

  @Get('transfers')
  @Permissions('read_inventory')
  async listTransfers(@Query() query: any) {
    return this.transferService.listTransfers(query);
  }

  @Get('transfers/:id')
  @Permissions('read_inventory')
  async getTransfer(@Param('id') id: string) {
    return this.transferService.getTransfer(id);
  }

  @Post('transfers')
  @Permissions('write_inventory')
  async createTransfer(@Body() data: any) {
    return this.transferService.createTransfer(data);
  }

  @Post('transfers/:id/post')
  @Permissions('write_inventory')
  async postTransfer(@Param('id') id: string) {
    return this.transferService.postTransfer(id);
  }

  @Post('transfers/:id/cancel')
  @Permissions('write_inventory')
  async cancelTransfer(@Param('id') id: string) {
    return this.transferService.cancelTransfer(id);
  }

  // --- ADJUSTMENTS ---

  @Get('adjustments')
  @Permissions('read_inventory')
  async listAdjustments(@Query() query: any) {
    return this.adjustmentService.listAdjustments(query);
  }

  @Get('adjustments/:id')
  @Permissions('read_inventory')
  async getAdjustment(@Param('id') id: string) {
    return this.adjustmentService.getAdjustment(id);
  }

  @Post('adjustments')
  @Permissions('write_inventory')
  async createAdjustment(@Body() data: any) {
    return this.adjustmentService.createAdjustment(data);
  }

  @Post('adjustments/:id/post')
  @Permissions('write_inventory')
  async postAdjustment(@Param('id') id: string) {
    return this.adjustmentService.postAdjustment(id);
  }

  @Post('adjustments/:id/cancel')
  @Permissions('write_inventory')
  async cancelAdjustment(@Param('id') id: string) {
    return this.adjustmentService.cancelAdjustment(id);
  }
}
