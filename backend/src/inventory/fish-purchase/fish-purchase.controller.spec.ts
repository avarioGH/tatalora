import { Test, TestingModule } from '@nestjs/testing';
import { FishPurchaseController } from './fish-purchase.controller';

describe('FishPurchaseController', () => {
  let controller: FishPurchaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FishPurchaseController],
    }).compile();

    controller = module.get<FishPurchaseController>(FishPurchaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
