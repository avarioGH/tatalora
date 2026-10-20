import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('asset')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getAssets(@Request() req: any) {
    return this.prisma.assetMaster.findMany({
      where: { company_id: req.user.company_id },
    });
  }

  @Post()
  createAsset(@Body() data: any) {
    return this.assetService.createAsset(data);
  }

  @Post('borrow')
  requestBorrow(@Request() req: any, @Body() data: any) {
    return this.assetService.requestBorrow(data, req.user.id);
  }

  @Post('borrow/:id/approve')
  approveBorrow(@Request() req: any, @Param('id') id: string) {
    return this.assetService.approveBorrow(id, req.user.id);
  }
}
