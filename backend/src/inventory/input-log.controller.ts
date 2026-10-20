import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { InputLogService } from './input-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('inventory/input-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InputLogController {
  @Post(':id/status')
  @Permissions('inventory.create')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.inputLogService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.inputLogService.deleteInputLog(id);
  }
  constructor(private readonly inputLogService: InputLogService) {}

  @Get()
  @Permissions('read_inventory')
  async listAll(@Query() query: any) {
    return this.inputLogService.listInputLogs(query);
  }

  @Get('available-trimmed-logs')
  @Permissions('read_inventory')
  async getAvailableTrimmedLogs() {
    return this.inputLogService.getAvailableTrimmedLogs();
  }

  @Get(':id')
  @Permissions('read_inventory')
  async getOne(@Param('id') id: string) {
    return this.inputLogService.getInputLog(id);
  }

  @Post()
  @Permissions('write_inventory')
  async create(@Body() data: any) {
    return this.inputLogService.createInputLog(data);
  }

  @Post(':id/cancel')
  @Permissions('write_inventory')
  async cancel(@Param('id') id: string) {
    return this.inputLogService.cancelInputLog(id);
  }
}
