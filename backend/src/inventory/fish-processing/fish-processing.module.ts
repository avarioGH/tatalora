import { Module } from '@nestjs/common';
import { FishProcessingService } from './fish-processing.service';
import { FishProcessingController } from './fish-processing.controller';

@Module({
  providers: [FishProcessingService],
  controllers: [FishProcessingController]
})
export class FishProcessingModule {}
