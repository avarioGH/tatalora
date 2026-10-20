import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('integrations.view')
  @Get()
  async findAll(@Request() req: any) {
    return this.integrationsService.findAll(req.user.company_id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('integrations.view')
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.integrationsService.findOne(req.user.company_id, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('integrations.create')
  @Post()
  async create(@Request() req: any, @Body() data: any) {
    return this.integrationsService.create(
      req.user.company_id,
      req.user.id,
      data,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('integrations.update')
  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.integrationsService.update(
      req.user.company_id,
      req.user.id,
      id,
      data,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('integrations.create')
  @Post(':id/activate')
  async activate(@Request() req: any, @Param('id') id: string) {
    return this.integrationsService.toggleStatus(
      req.user.company_id,
      req.user.id,
      id,
      true,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('integrations.create')
  @Post(':id/deactivate')
  async deactivate(@Request() req: any, @Param('id') id: string) {
    return this.integrationsService.toggleStatus(
      req.user.company_id,
      req.user.id,
      id,
      false,
    );
  }

  // Generic Webhook Receiver
  @Permissions('integrations.create')
  @Post('webhooks/:provider')
  async webhook(@Param('provider') provider: string, @Body() body: any) {
    // This is where future provider adapters will be hooked in.
    return { received: true };
  }
}
