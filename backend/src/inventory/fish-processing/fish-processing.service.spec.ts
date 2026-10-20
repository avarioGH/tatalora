import { Test, TestingModule } from '@nestjs/testing';
import { FishProcessingService } from './fish-processing.service';

describe('FishProcessingService', () => {
  let service: FishProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FishProcessingService],
    }).compile();

    service = module.get<FishProcessingService>(FishProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
