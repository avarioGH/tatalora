import { Test, TestingModule } from '@nestjs/testing';
import { MoController } from './mo.controller';

describe('MoController', () => {
  let controller: MoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoController],
    }).compile();

    controller = module.get<MoController>(MoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
