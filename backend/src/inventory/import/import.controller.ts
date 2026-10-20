import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

@Controller('inventory/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('history')
  @Permissions('read_inventory')
  async getHistory() {
    const items = await this.importService.getHistory();
    return { items };
  }

  @Post('upload')
  @Permissions('write_inventory')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const session = await this.importService.createSession(
      file.filename,
      file.originalname,
      body.userId || 'SYSTEM',
    );
    const sheets = this.importService.getSheets(file.filename);
    return { id: session.id, fileName: file.originalname, sheets };
  }

  @Post(':id/preview')
  @Permissions('write_inventory')
  async previewImport(
    @Param('id') id: string,
    @Body() body: { sheet: string; importType: string },
  ) {
    return this.importService.previewImport(id, body.sheet, body.importType);
  }

  @Post(':id/execute')
  @Permissions('write_inventory')
  async executeImport(
    @Param('id') id: string,
    @Body() body: { sheet: string; importType: string },
  ) {
    return this.importService.executeImport(id, body.sheet, body.importType);
  }
}
