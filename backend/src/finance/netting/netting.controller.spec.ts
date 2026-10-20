import { Test, TestingModule } from '@nestjs/testing';
import { NettingController } from './netting.controller';

describe('NettingController', () => {
  let controller: NettingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NettingController],
    }).compile();

    controller = module.get<NettingController>(NettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
