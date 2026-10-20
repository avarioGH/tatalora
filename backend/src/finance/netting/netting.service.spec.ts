import { Test, TestingModule } from '@nestjs/testing';
import { NettingService } from './netting.service';

describe('NettingService', () => {
  let service: NettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NettingService],
    }).compile();

    service = module.get<NettingService>(NettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
