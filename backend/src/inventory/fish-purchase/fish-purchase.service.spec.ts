import { Test, TestingModule } from '@nestjs/testing';
import { FishPurchaseService } from './fish-purchase.service';

describe('FishPurchaseService', () => {
  let service: FishPurchaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FishPurchaseService],
    }).compile();

    service = module.get<FishPurchaseService>(FishPurchaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
