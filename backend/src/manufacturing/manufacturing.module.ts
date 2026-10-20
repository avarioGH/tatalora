import { Module } from '@nestjs/common';
import { QualityController } from './quality/quality.controller';
import { QualityService } from './quality/quality.service';
import { MoController } from './mo/mo.controller';
import { MoService } from './mo/mo.service';
import { SchedulingController } from './scheduling/scheduling.controller';
import { SchedulingService } from './scheduling/scheduling.service';
import { BomController } from './bom/bom.controller';
import { BomService } from './bom/bom.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    QualityController,
    MoController,
    SchedulingController,
    BomController,
  ],
  providers: [QualityService, MoService, SchedulingService, BomService],
})
export class ManufacturingModule {}
