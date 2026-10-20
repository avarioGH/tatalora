import { Test, TestingModule } from '@nestjs/testing';
import { FishProcessingController } from './fish-processing.controller';

describe('FishProcessingController', () => {
  let controller: FishProcessingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FishProcessingController],
    }).compile();

    controller = module.get<FishProcessingController>(FishProcessingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
