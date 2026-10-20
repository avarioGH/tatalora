import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';
import { PdfService } from './pdf.service';
import { DocumentService } from './document.service';
import { FinancialReportService } from './services/financial-report.service';
import { SalesReportService } from './services/sales-report.service';
import { InventoryReportService } from './services/inventory-report.service';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ReportController {
  constructor(
    private exportService: ExportService,
    private pdfService: PdfService,
    private documentService: DocumentService,
    private financialReport: FinancialReportService,
    private salesReport: SalesReportService,
    private inventoryReport: InventoryReportService,
  ) {}

  async resolveReport(req: any, module: string, type: string, filters: any) {
    const f = { company_id: req.user.company_id, ...filters };
    if (module === 'finance') {
      if (type === 'trial-balance')
        return this.financialReport.getTrialBalance(f);
      if (type === 'profit-and-loss')
        return this.financialReport.getProfitAndLoss(f);
      if (type === 'balance-sheet')
        return this.financialReport.getBalanceSheet(f);
    } else if (module === 'sales') {
      if (type === 'sales-report') return this.salesReport.getSalesReport(f);
      if (type === 'gross-margin')
        return this.salesReport.getGrossMarginReport(f);
    } else if (module === 'inventory') {
      if (type === 'valuation')
        return this.inventoryReport.getInventoryValuation(f);
      if (type === 'stock-on-hand')
        return this.inventoryReport.getStockOnHand(f);
    }
    throw new BadRequestException('Report type not supported');
  }

  @Permissions('reports.view')
  @Get('reports/:module/:type')
  async getReport(
    @Request() req: any,
    @Param('module') module: string,
    @Param('type') type: string,
    @Query() query: any,
  ) {
    return this.resolveReport(req, module, type, query);
  }

  @Permissions('reports.view')
  @Get('reports/:module/:type/export')
  async exportReport(
    @Request() req: any,
    @Res() res: Response,
    @Param('module') module: string,
    @Param('type') type: string,
    @Query('format') format: string,
    @Query() query: any,
  ) {
    const reportData = await this.resolveReport(req, module, type, query);

    if (format === 'xlsx') {
      const buffer = await this.exportService.toXlsx(
        reportData.title,
        reportData.columns,
        reportData.data,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${reportData.title}.xlsx"`,
      );
      res.send(buffer);
    } else if (format === 'csv') {
      const buffer = this.exportService.toCsv(
        reportData.columns,
        reportData.data,
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${reportData.title}.csv"`,
      );
      res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await this.pdfService.generateDocument({
        title: reportData.title,
        documentTitle: reportData.title,
        columns: reportData.columns,
        data: reportData.data,
        totals: reportData.totals,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${reportData.title}.pdf"`,
      );
      res.send(buffer);
    } else {
      throw new BadRequestException('Format not supported');
    }
  }

  @Permissions('reports.view')
  @Get('documents/:type/:id/pdf')
  async downloadDocumentPdf(
    @Request() req: any,
    @Res() res: Response,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    let docDef: any;
    if (type === 'invoices')
      docDef = await this.documentService.getInvoicePdfDefinition(
        req.user.company_id,
        id,
      );
    else throw new BadRequestException('Document type not supported');

    const buffer = await this.pdfService.generateDocument(docDef);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${docDef.documentNumber}.pdf"`,
    );
    res.send(buffer);
  }
}
