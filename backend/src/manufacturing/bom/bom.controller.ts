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
} from '@nestjs/common';
import { BomService } from './bom.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('manufacturing/bom')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Permissions('manufacturing.view')
  @Get()
  async getBoms(@Req() req: any) {
    return this.bomService.getBoms(req.user.companyId);
  }

  @Permissions('manufacturing.create')
  @Post()
  async createBom(@Req() req: any, @Body() data: any) {
    return this.bomService.createBom({
      ...data,
      company_id: req.user.companyId,
    });
  }
}
