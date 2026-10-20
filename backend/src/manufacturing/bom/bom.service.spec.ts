import { Test, TestingModule } from '@nestjs/testing';
import { BomService } from './bom.service';

describe('BomService', () => {
  let service: BomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BomService],
    }).compile();

    service = module.get<BomService>(BomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
