import { Test, TestingModule } from '@nestjs/testing';
import { MoService } from './mo.service';

describe('MoService', () => {
  let service: MoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoService],
    }).compile();

    service = module.get<MoService>(MoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
