import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PartaiService } from './partai.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@Controller('inventory/timber-partai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PartaiController {
  constructor(private readonly partaiService: PartaiService) {}

  @Post()
  @Permissions('inventory.create')
  create(@Body() data: any, @Request() req) {
    return this.partaiService.create(req.user.companyId, data);
  }

  @Get('migrate-testing')
  @Permissions('inventory.read')
  migrateTesting(@Request() req) {
    return this.partaiService.migrateToTesting(req.user.companyId);
  }

  @Get()
  @Permissions('inventory.read')
  findAll(@Request() req) {
    return this.partaiService.findAll(req.user.companyId);
  }

  @Get(':id')
  @Permissions('inventory.read')
  findOne(@Param('id') id: string, @Request() req) {
    return this.partaiService.findOne(id, req.user.companyId);
  }

  @Put(':id')
  @Permissions('inventory.create')
  update(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.partaiService.update(id, req.user.companyId, data);
  }

  @Delete(':id')
  @Permissions('inventory.create')
  delete(@Param('id') id: string, @Request() req) {
    return this.partaiService.delete(id, req.user.companyId);
  }
}
