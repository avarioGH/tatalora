import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CrmService } from './crm.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  @Permissions('crm.lead.view')
  async getLeads(@Request() req: any) {
    return this.crmService.getLeads(req.user.company_id);
  }

  @Post('leads')
  @Permissions('crm.lead.create')
  async createLead(@Request() req: any, @Body() data: any) {
    return this.crmService.createLead(req.user.company_id, data);
  }

  @Get('leads/:id')
  @Permissions('crm.lead.view')
  async getLead(@Request() req: any, @Param('id') id: string) {
    return this.crmService.getLead(req.user.company_id, id);
  }

  @Patch('leads/:id')
  @Permissions('crm.lead.update')
  async updateLead(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crmService.updateLead(req.user.company_id, id, data);
  }

  @Post('leads/:id/convert')
  @Permissions('crm.lead.convert')
  async convertLead(@Request() req: any, @Param('id') id: string) {
    return this.crmService.convertLead(req.user.company_id, id);
  }

  @Get('opportunities')
  @Permissions('crm.opportunity.view')
  async getOpportunities(@Request() req: any) {
    return this.crmService.getOpportunities(req.user.company_id);
  }

  @Post('opportunities')
  @Permissions('crm.opportunity.create')
  async createOpportunity(@Request() req: any, @Body() data: any) {
    return this.crmService.createOpportunity(req.user.company_id, data);
  }

  @Get('opportunities/:id')
  @Permissions('crm.opportunity.view')
  async getOpportunity(@Request() req: any, @Param('id') id: string) {
    return this.crmService.getOpportunity(req.user.company_id, id);
  }

  @Patch('opportunities/:id')
  @Permissions('crm.opportunity.update')
  async updateOpportunity(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crmService.updateOpportunity(req.user.company_id, id, data);
  }

  @Post('opportunities/:id/quotation')
  @Permissions('crm.opportunity.update')
  async createQuotationFromOpportunity(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.crmService.createQuotationFromOpportunity(
      req.user.company_id,
      id,
    );
  }

  @Get('activities')
  @Permissions('crm.activity.view')
  async getActivities(@Request() req: any) {
    return this.crmService.getActivities(req.user.company_id);
  }

  @Post('activities')
  @Permissions('crm.activity.create')
  async createActivity(@Request() req: any, @Body() data: any) {
    return this.crmService.createActivity(req.user.company_id, data);
  }

  @Patch('activities/:id')
  @Permissions('crm.activity.update')
  async updateActivity(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crmService.updateActivity(req.user.company_id, id, data);
  }

  @Get('customers/:id/360')
  @Permissions('crm.customer360.view')
  async getCustomer360(@Request() req: any, @Param('id') id: string) {
    return this.crmService.getCustomer360(req.user.company_id, id);
  }
}
