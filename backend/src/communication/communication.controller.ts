import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Response,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CommunicationService } from './communication.service';
import { InvoiceReminderService } from './invoice-reminder.service';
import type { SendInvoiceDto, SaveCommunicationSettingDto, SaveTemplateDto } from './communication.types';

@Controller('communication')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommunicationController {
  constructor(
    private readonly service: CommunicationService,
    private readonly reminderService: InvoiceReminderService,
  ) {}

  // 1. Settings Endpoints
  @Permissions('settings.view')
  @Get('settings')
  async getSettings(@Request() req: any) {
    return this.service.getSettings(req.user.company_id);
  }

  @Permissions('settings.edit')
  @Post('settings')
  async saveSettings(@Request() req: any, @Body() dto: SaveCommunicationSettingDto) {
    return this.service.saveSettings(req.user.company_id, dto);
  }

  // 2. Templates Endpoints
  @Permissions('settings.view')
  @Get('templates')
  async getTemplates(@Request() req: any) {
    return this.service.getTemplates(req.user.company_id);
  }

  @Permissions('settings.edit')
  @Post('templates')
  async saveTemplate(@Request() req: any, @Body() dto: SaveTemplateDto) {
    return this.service.saveTemplate(req.user.company_id, dto);
  }

  // 3. Invoice Share Preparation & Rendering Preview
  @Permissions('invoice.view')
  @Get('invoices/:id/prepare')
  async prepareInvoiceShare(@Request() req: any, @Param('id') id: string) {
    return this.service.prepareInvoiceShare(req.user.company_id, id);
  }

  // 4. Authorized Invoice PDF Download / Stream
  @Permissions('invoice.view')
  @Get('invoices/:id/pdf')
  async downloadInvoicePdf(@Request() req: any, @Param('id') id: string, @Response() res: any) {
    const pdfBuffer = await this.service.generateInvoicePdf(req.user.company_id, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  }

  // 5. Send Invoice Execution
  @Permissions('invoice.create')
  @Post('invoices/:id/send')
  async sendInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SendInvoiceDto,
  ) {
    return this.service.sendInvoice(req.user.company_id, req.user.userId || req.user.id, id, dto);
  }

  // 6. Communication History for Invoice
  @Permissions('invoice.view')
  @Get('invoices/:id/history')
  async getInvoiceHistory(@Request() req: any, @Param('id') id: string) {
    return this.service.getInvoiceHistory(req.user.company_id, id);
  }

  // 7. General Audit Logs
  @Permissions('settings.view')
  @Get('logs')
  async getAllLogs(@Request() req: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.service.getAllLogs(
      req.user.company_id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
  }

  // 8. Automated Invoice Reminders
  @Permissions('settings.edit')
  @Post('reminders/run')
  async runReminders(
    @Request() req: any,
    @Body() body: { dryRun?: boolean; forceSend?: boolean },
  ) {
    return this.reminderService.executeTenantReminders(req.user.company_id, {
      dryRun: body?.dryRun ?? false,
      forceSend: body?.forceSend ?? false,
      userId: 'SYSTEM_AUTO_REMINDER',
    });
  }

  @Permissions('settings.view')
  @Get('reminders/preview')
  async previewReminders(@Request() req: any) {
    return this.reminderService.executeTenantReminders(req.user.company_id, {
      dryRun: true,
      forceSend: true,
    });
  }

  // 9. Payment Confirmation Communication
  @Permissions('payment.view')
  @Post('payments/:id/send')
  async sendPaymentConfirmation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.sendPaymentConfirmation(
      req.user.company_id,
      req.user.userId || req.user.id,
      id,
      dto,
    );
  }

  @Permissions('payment.view')
  @Get('payments/:id/history')
  async getPaymentHistory(@Request() req: any, @Param('id') id: string) {
    return this.service.getPaymentHistory(req.user.company_id, id);
  }
}
