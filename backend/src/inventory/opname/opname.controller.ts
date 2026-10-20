import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Put,
  Get,
} from '@nestjs/common';
import { OpnameService } from './opname.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../auth/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/opname')
export class OpnameController {
  constructor(private readonly opnameService: OpnameService) {}

  @Permissions('inventory.opname.create')
  @Post('draft/:warehouseId')
  createDraft(@Param('warehouseId') warehouseId: string, @Req() req) {
    return this.opnameService.createDraft(warehouseId, req.user?.id);
  }

  @Permissions('inventory.opname.update')
  @Put(':id/counts')
  updateCounts(
    @Param('id') id: string,
    @Body('items')
    items: {
      itemId: string;
      physicalQuantityPcs: number;
      physicalVolumeM3: number;
    }[],
  ) {
    return this.opnameService.updateCounts(id, items);
  }

  @Permissions('inventory.opname.confirm')
  @Post(':id/confirm')
  confirmOpname(@Param('id') id: string, @Req() req) {
    return this.opnameService.confirmOpname(id, req.user?.id);
  }

  @Permissions('inventory.opname.cancel')
  @Post(':id/cancel')
  cancelOpname(@Param('id') id: string) {
    return this.opnameService.cancelOpname(id);
  }

  @Permissions('inventory.opname.reconcile')
  @Get('reconcile')
  reconcile() {
    return this.opnameService.reconcile();
  }
}
