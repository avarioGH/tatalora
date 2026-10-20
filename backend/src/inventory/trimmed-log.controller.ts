import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { TrimmedLogService } from './trimmed-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrimmedLogController {
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.trimService.deleteTrimmedLog(id);
  }
  constructor(private readonly trimService: TrimmedLogService) {}

  @Get('trimming')
  @Permissions('read_inventory')
  async listAll(@Query() query: any) {
    return this.trimService.listTrimmedLogs(query);
  }

  @Get('logs/:id/trimming')
  @Permissions('read_inventory')
  async getChildren(@Param('id') rawLogId: string) {
    return this.trimService.getChildrenByRawLog(rawLogId);
  }

  @Post('logs/:id/trimming')
  @Permissions('write_inventory')
  async createChild(@Param('id') rawLogId: string, @Body() data: any) {
    return this.trimService.createTrimmedLog(rawLogId, data);
  }

  @Get('trimming/:id')
  @Permissions('read_inventory')
  async getChild(@Param('id') id: string) {
    return this.trimService.getTrimmedLog(id);
  }

  @Post('trimming/:id/cancel')
  @Permissions('write_inventory')
  async cancelChild(@Param('id') id: string) {
    return this.trimService.cancelTrimmedLog(id);
  }
}
