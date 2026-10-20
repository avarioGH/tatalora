import { TrimmedLogService } from './trimmed-log.service';
import { TimberCalculationService } from './timber-calculation.service';
import { BadRequestException } from '@nestjs/common';

describe('TrimmedLog Validation', () => {
  let service: TrimmedLogService;
  let prismaMock: any;
  let calcService: TimberCalculationService;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(async (callback) => {
        return callback(prismaMock);
      }),
      rawLog: { findUnique: jest.fn(), update: jest.fn() },
      auditLog: { create: jest.fn() },
      trimmedLog: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    calcService = new TimberCalculationService();
    auditMock = { createLog: jest.fn() };
    service = new TrimmedLogService(prismaMock, calcService, auditMock);
  });

  it('should reject trimming if child length exceeds remaining parent length', async () => {
    // Mock parent log with 11.00m length and existing child with 8.70m
    prismaMock.rawLog.findUnique.mockResolvedValue({
      id: 'parent1',
      logNumber: '199',
      originalLength: 11.0,
      trimmedLogs: [{ length: 4.4 }, { length: 4.3 }], // Total 8.70, Remaining 2.30
    });

    // Attempt to add 3.00m
    await expect(
      service.createTrimmedLog('parent1', {
        length: 3.0,
        diameter1: 39,
        diameter2: 43,
        diameter3: 25,
        diameter4: 32,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow trimming if child length fits within remaining parent length', async () => {
    prismaMock.rawLog.findUnique.mockResolvedValue({
      id: 'parent1',
      logNumber: '199',
      originalLength: 11.0,
      trimmedLogs: [{ length: 4.4 }, { length: 4.3 }], // Total 8.70, Remaining 2.30
    });

    prismaMock.trimmedLog.create.mockResolvedValue({
      id: 'child1',
      trimNumber: '199C',
    });
    prismaMock.trimmedLog.findUnique.mockResolvedValue(null);

    // Attempt to add 2.30m
    const res = await service.createTrimmedLog('parent1', {
      length: 2.3,
      diameter1: 39,
      diameter2: 43,
      diameter3: 25,
      diameter4: 32,
    });

    expect(prismaMock.trimmedLog.create).toHaveBeenCalled();
  });
});
