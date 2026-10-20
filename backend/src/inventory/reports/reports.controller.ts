import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@Controller('inventory/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('inventory.view')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private async sendExcelResponse(
    res: Response,
    workbook: any,
    filename: string,
  ) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('movements')
  async getMovements(
    @Query('warehouseId') warehouseId?: string,
    @Query('variantId') variantId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('referenceType') referenceType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getMovements({
      warehouseId,
      variantId,
      dateFrom,
      dateTo,
      type,
      referenceType,
      page,
      limit,
    });
  }

  @Get('export/movements')
  async exportMovements(
    @Res() res: Response,
    @Query('warehouseId') warehouseId?: string,
    @Query('variantId') variantId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('referenceType') referenceType?: string,
  ) {
    const wb = await this.reportsService.exportMovements({
      warehouseId,
      variantId,
      dateFrom,
      dateTo,
      type,
      referenceType,
    });
    return this.sendExcelResponse(res, wb, 'Movements');
  }

  @Get('stock-card')
  async getStockCard(
    @Query('warehouseId') warehouseId: string,
    @Query('variantId') variantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.reportsService.getStockCard(
      warehouseId,
      variantId,
      dateFrom,
      dateTo,
    );
  }

  @Get('export/stock-card')
  async exportStockCard(
    @Res() res: Response,
    @Query('warehouseId') warehouseId: string,
    @Query('variantId') variantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const wb = await this.reportsService.exportStockCard(
      warehouseId,
      variantId,
      dateFrom,
      dateTo,
    );
    return this.sendExcelResponse(res, wb, 'StockCard');
  }

  @Get('production-yield')
  async getProductionYield(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getProductionYield(dateFrom, dateTo);
  }

  @Get('export/production')
  async exportProduction(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const wb = await this.reportsService.exportProduction(dateFrom, dateTo);
    return this.sendExcelResponse(res, wb, 'Production');
  }

  @Get('operations-summary')
  async getOperationsSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getOperationsSummary(dateFrom, dateTo);
  }

  @Get('export/purchase')
  async exportPurchase(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const wb = await this.reportsService.exportPurchase(dateFrom, dateTo);
    return this.sendExcelResponse(res, wb, 'Purchase');
  }

  @Get('export/shipment')
  async exportShipment(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const wb = await this.reportsService.exportShipment(dateFrom, dateTo);
    return this.sendExcelResponse(res, wb, 'Shipment');
  }

  @Get('export/opname')
  async exportOpname(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const wb = await this.reportsService.exportOpname(dateFrom, dateTo);
    return this.sendExcelResponse(res, wb, 'Opname');
  }
}
