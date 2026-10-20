import { Test, TestingModule } from '@nestjs/testing';
import { SawmillProductionController } from './sawmill-production.controller';
import { SawmillProductionService } from './sawmill-production.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';

describe('SawmillProductionController', () => {
  let controller: SawmillProductionController;
  let service: any;

  beforeEach(async () => {
    service = {
      listProductionRuns: jest.fn().mockResolvedValue({ items: [] }),
      getProductionRunDetail: jest.fn().mockResolvedValue({ id: '123' }),
      createProductionRun: jest.fn().mockResolvedValue({ id: '123' }),
      updateDraft: jest.fn().mockResolvedValue({ id: '123' }),
      postProductionRun: jest.fn().mockResolvedValue({ status: 'POSTED' }),
      cancelProductionRun: jest.fn().mockResolvedValue({ status: 'CANCELLED' }),
      listAvailableInputLogs: jest.fn().mockResolvedValue([{ id: 'log1' }]),
      getBundleDetail: jest.fn().mockResolvedValue({ bundleNumber: 'B1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SawmillProductionController],
      providers: [{ provide: SawmillProductionService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SawmillProductionController>(
      SawmillProductionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create draft', async () => {
    const data: any = { companyId: 'comp1', productionDate: '2026-09-12' };
    const req = { user: { company_id: 'comp1' } };
    expect(await controller.createProductionRun(data, req)).toEqual({
      id: '123',
    });
    expect(service.createProductionRun).toHaveBeenCalledWith(data);
  });

  it('should list runs', async () => {
    expect(await controller.listProductionRuns({ shift: '1' })).toEqual({
      items: [],
    });
    expect(service.listProductionRuns).toHaveBeenCalledWith({ shift: '1' });
  });

  it('should get run detail', async () => {
    expect(await controller.getProductionRunDetail('123')).toEqual({
      id: '123',
    });
  });

  it('should list available input logs', async () => {
    expect(await controller.listAvailableInputLogs()).toEqual([{ id: 'log1' }]);
  });

  it('should update draft', async () => {
    expect(
      await controller.updateProductionRun('123', { notes: 'test' }),
    ).toEqual({ id: '123' });
  });

  it('should post run', async () => {
    expect(await controller.postProductionRun('123', 'loc1')).toEqual({
      status: 'POSTED',
    });
  });

  it('should cancel run', async () => {
    expect(await controller.cancelProductionRun('123', 'loc1')).toEqual({
      status: 'CANCELLED',
    });
  });
});
