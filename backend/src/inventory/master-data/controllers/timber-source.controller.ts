import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TimberSourceService } from '../services/timber-source.service';
import {
  CreateTimberSourceDto,
  UpdateTimberSourceDto,
} from '../dto/master-data.dto';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/permissions.guard';
import { Permissions } from '../../../auth/permissions.decorator';

@Controller('inventory/master-data/timber-source')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimberSourceController {
  constructor(private readonly service: TimberSourceService) {}

  @Get()
  @Permissions('inventory.view')
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.company_id);
  }

  @Get(':id')
  @Permissions('inventory.view')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.company_id);
  }

  @Post()
  @Permissions('inventory.create')
  create(@Request() req: any, @Body() data: CreateTimberSourceDto) {
    data.company_id = req.user.company_id;
    return this.service.create(data);
  }

  @Patch(':id')
  @Permissions('inventory.update')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: Partial<UpdateTimberSourceDto>,
  ) {
    return this.service.update(id, data, req.user.company_id);
  }

  @Patch(':id/status')
  @Permissions('inventory.update')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.service.updateStatus(id, isActive, req.user.company_id);
  }
}
