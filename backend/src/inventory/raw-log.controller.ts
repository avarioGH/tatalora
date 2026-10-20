import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RawLogService } from './raw-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('inventory/logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RawLogController {
  constructor(private readonly rawLogService: RawLogService) {}

  @Get()
  @Permissions('read_inventory')
  async list(@Query() query: any) {
    return this.rawLogService.listRawLogs(query);
  }

  @Get(':id')
  @Permissions('read_inventory')
  async get(@Param('id') id: string) {
    return this.rawLogService.getRawLog(id);
  }

  @Post()
  @Permissions('write_inventory')
  async create(@Body() data: any) {
    return this.rawLogService.createRawLog(data);
  }

  @Post(':id/cancel')
  @Permissions('write_inventory')
  async cancel(@Param('id') id: string) {
    return this.rawLogService.cancelRawLog(id);
  }

  @Post('bulk')
  @Permissions('write_inventory')
  async createBulk(@Body() data: any) {
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Invalid payload. Expected { items: [...] }');
    }
    return this.rawLogService.createBulkRawLogs(data.items);
  }

  @Put(':id')
  @Permissions('write_inventory')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.rawLogService.updateRawLog(id, data);
  }

  @Delete(':id')
  @Permissions('write_inventory')
  async delete(@Param('id') id: string) {
    return this.rawLogService.deleteRawLog(id);
  }
}
