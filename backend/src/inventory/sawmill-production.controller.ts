import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  BadRequestException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SawmillProductionService } from './sawmill-production.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateConsumptionDto {
  @IsString() inputLogId: string;
  @IsNumber() consumedM3: number;
}

class CreateVariantDto {
  @IsString() timberVariantId: string;
  @IsString() partai: string;
  @IsNumber() quantityPcs: number;
  @IsOptional() @IsString() remarks?: string;
}

class CreateBundleItemDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}

class CreateProductionRunDto {
  @IsDateString() productionDate: string;
  @IsString() shift: string;
  @IsString() operatorId: string;
  @IsString() workCenterId: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsumptionDto)
  consumptions: CreateConsumptionDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items: CreateBundleItemDto[];
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('production/sawmill')
export class SawmillProductionController {
  constructor(private readonly sawmillService: SawmillProductionService) {}

  @Permissions('production.sawmill.view')
  @Get('runs')
  async listProductionRuns(@Query() query: any) {
    return this.sawmillService.listProductionRuns(query);
  }

  @Permissions('production.sawmill.view')
  @Get('input-logs/available')
  async listAvailableInputLogs() {
    return this.sawmillService.listAvailableInputLogs();
  }

  @Permissions('production.sawmill.view')
  @Get('bundles/:id')
  async getBundleDetail(@Param('id') id: string) {
    return this.sawmillService.getBundleDetail(id);
  }

  @Permissions('production.sawmill.view')
  @Get('runs/:id')
  async getProductionRunDetail(@Param('id') id: string) {
    return this.sawmillService.getProductionRunDetail(id);
  }

  @Permissions('production.sawmill.create')
  @Post('runs')
  async createProductionRun(
    @Body() data: CreateProductionRunDto,
    @Request() req: any,
  ) {
    const payload = { ...data, companyId: req.user?.company_id };
    return this.sawmillService.createProductionRun(payload);
  }

  @Permissions('production.sawmill.edit')
  @Patch('runs/:id')
  async updateProductionRun(@Param('id') id: string, @Body() data: any) {
    return this.sawmillService.updateDraft(id, data);
  }

  @Permissions('production.sawmill.post')
  @Post('runs/:id/post')
  async postProductionRun(
    @Param('id') id: string,
    @Body('locationId') locationId: string,
  ) {
    if (!locationId)
      throw new BadRequestException(
        'locationId is required for stock movement',
      );
    return this.sawmillService.postProductionRun(id, locationId);
  }

  @Permissions('production.sawmill.cancel')
  @Post('runs/:id/cancel')
  async cancelProductionRun(
    @Param('id') id: string,
    @Body('locationId') locationId: string,
  ) {
    if (!locationId)
      throw new BadRequestException(
        'locationId is required for stock reversal',
      );
    return this.sawmillService.cancelProductionRun(id, locationId);
  }
}
