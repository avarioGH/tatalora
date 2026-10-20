import { Module } from '@nestjs/common';
import { TimberSpeciesController } from './controllers/timber-species.controller';
import { TimberSpeciesService } from './services/timber-species.service';
import { TimberGradeController } from './controllers/timber-grade.controller';
import { TimberGradeService } from './services/timber-grade.service';
import { TimberSourceController } from './controllers/timber-source.controller';
import { TimberSourceService } from './services/timber-source.service';
import { LocationController } from './controllers/location.controller';
import { LocationService } from './services/location.service';
import { VehicleController } from './controllers/vehicle.controller';
import { TimberVariantController } from './controllers/timber-variant.controller';
import { VehicleService } from './services/vehicle.service';
import { DriverController } from './controllers/driver.controller';
import { DriverService } from './services/driver.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    TimberSpeciesController,
    TimberGradeController,
    TimberSourceController,
    LocationController,
    VehicleController,
    TimberVariantController,
    DriverController,
  ],
  providers: [
    TimberSpeciesService,
    TimberGradeService,
    TimberSourceService,
    LocationService,
    VehicleService,
    DriverService,
  ],
})
export class MasterDataModule {}
