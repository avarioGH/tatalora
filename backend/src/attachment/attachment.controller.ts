import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentService, AllowedEntityType } from './attachment.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Permissions('attachment.create')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: any,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const companyId = req.user.company_id;
    const userId = req.user.id;

    return this.attachmentService.uploadAttachment(
      companyId,
      userId,
      entityType as AllowedEntityType,
      entityId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Permissions('attachment.view')
  @Get('entity/:entityType/:entityId')
  async getByEntity(
    @Request() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.attachmentService.getAttachments(
      req.user.company_id,
      entityType,
      entityId,
    );
  }

  @Permissions('attachment.view')
  @Get(':id/download')
  async download(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const { buffer, mimeType, fileName } =
      await this.attachmentService.downloadAttachment(
        req.user.company_id,
        req.user.id,
        id,
      );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': 'attachment; filename="' + fileName + '"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Permissions('attachment.delete')
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.attachmentService.deleteAttachment(
      req.user.company_id,
      req.user.id,
      id,
    );
  }
}
