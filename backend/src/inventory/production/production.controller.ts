import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Request,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Permissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';

@Controller('inventory/production')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @Permissions('production:create')
  async createProcess(@Body() data: any, @Request() req: any) {
    const user = req.user;
    return this.productionService.createProcess({
      ...data,
      company_id: user.company_id,
      createdBy: user.id,
    });
  }

  @Put(':id/confirm')
  @Permissions('production:confirm')
  async confirmProcess(@Param('id') id: string) {
    return this.productionService.confirmProcess(id);
  }

  @Put(':id/cancel')
  @Permissions('production:cancel')
  async cancelProcess(@Param('id') id: string) {
    return this.productionService.cancelProcess(id);
  }
}
