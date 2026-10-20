import { InputLogService } from './input-log.service';
import { BadRequestException } from '@nestjs/common';

describe('InputLog Validation', () => {
  let service: InputLogService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(async (callback) => {
        return callback(prismaMock);
      }),
      inputLog: {
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      trimmedLog: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      inputLogItem: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    auditMock = { createLog: jest.fn() };
    service = new InputLogService(prismaMock, auditMock);
  });

  it('should reject if trimmed logs are missing or consumed', async () => {
    prismaMock.trimmedLog.findMany.mockResolvedValue([
      { id: '1', status: 'CONSUMED' },
    ]);

    await expect(
      service.createInputLog({ trimmedLogIds: ['1'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should process successfully with AVAILABLE trimmed logs', async () => {
    prismaMock.trimmedLog.findMany.mockResolvedValue([
      {
        id: '1',
        status: 'AVAILABLE',
        species: 'Ulin',
        length: 4,
        grossVolume: 1,
        netVolume: 0.9,
      },
    ]);
    prismaMock.inputLog.count.mockResolvedValue(0);
    prismaMock.inputLog.findUnique.mockResolvedValue(null);
    prismaMock.inputLog.create.mockResolvedValue({
      id: 'in1',
      inputNumber: 'I-MSAW-1-25-10-001',
    });

    const res = await service.createInputLog({ trimmedLogIds: ['1'] });
    expect(res).toBeDefined();
    expect(prismaMock.inputLog.create).toHaveBeenCalled();
    expect(prismaMock.inputLogItem.create).toHaveBeenCalled();
    expect(prismaMock.trimmedLog.update).toHaveBeenCalled();
  });
});
