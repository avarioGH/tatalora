import { Test, TestingModule } from '@nestjs/testing';
import { BomController } from './bom.controller';

describe('BomController', () => {
  let controller: BomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BomController],
    }).compile();

    controller = module.get<BomController>(BomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
