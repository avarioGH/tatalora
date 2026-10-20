import { Test, TestingModule } from '@nestjs/testing';
import { GlService } from './gl.service';

describe('GlService', () => {
  let service: GlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlService],
    }).compile();

    service = module.get<GlService>(GlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
