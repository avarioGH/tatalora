import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('manufacturing/quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Permissions('manufacturing.view')
  @Get('points')
  async getPoints(@Req() req: any) {
    return this.qualityService.getPoints(req.user.companyId);
  }

  @Permissions('manufacturing.view')
  @Get('checks')
  async getChecks(@Req() req: any) {
    return this.qualityService.getChecks(req.user.companyId);
  }

  @Permissions('manufacturing.create')
  @Post('checks')
  async createCheck(@Req() req: any, @Body() data: any) {
    return this.qualityService.createCheck(req.user.companyId, data);
  }

  @Permissions('manufacturing.create')
  @Post('checks/:id/complete')
  async completeCheck(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.qualityService.completeCheck(
      req.user.companyId,
      id,
      req.user.id,
      data,
    );
  }

  @Permissions('manufacturing.create')
  @Post('checks/:id/disposition')
  async addDisposition(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.qualityService.addDisposition(
      req.user.companyId,
      id,
      req.user.id,
      data,
    );
  }
}
