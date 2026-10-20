import { Test, TestingModule } from '@nestjs/testing';
import { SawmillProductionService } from './sawmill-production.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SawmillProductionService', () => {
  let service: SawmillProductionService;
  let prisma: any;
  let ledger: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (cb) => cb(prisma)),
      inputLog: { findUnique: jest.fn() },
      documentSequence: { upsert: jest.fn() },
      sawmillProductionRun: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sawmillBundle: { create: jest.fn() },
      timberVariant: { findUnique: jest.fn() },
      sawmillOutputItem: { create: jest.fn(), update: jest.fn() },
    };

    ledger = {
      createMovement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SawmillProductionService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryLedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get<SawmillProductionService>(SawmillProductionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProductionRun', () => {
    it('should calculate volume strictly and not exceed input limits', async () => {
      prisma.documentSequence.upsert.mockResolvedValue({ last_value: 1 });
      prisma.inputLog.findUnique.mockResolvedValue({
        id: 'input1',
        totalVolume: 10,
        sawmillConsumptions: [{ consumedM3: 5 }],
      });
      prisma.sawmillProductionRun.create.mockResolvedValue({ id: 'run1' });
      prisma.sawmillBundle.create.mockResolvedValue({ id: 'b1' });
      prisma.timberVariant.findUnique.mockResolvedValue({
        id: 'v1',
        thickness: 20,
        width: 30,
        length: 1000,
      });

      const data = {
        companyId: 'c1',
        productionDate: new Date(),
        shift: '1',
        operatorId: 'o1',
        workCenterId: 'w1',
        consumptions: [{ inputLogId: 'input1', consumedM3: 2 }],
        items: [
          {
            variants: [
              { timberVariantId: 'v1', quantityPcs: 10, partai: 'p1' },
            ],
          },
        ],
      };

      await service.createProductionRun(data);

      expect(prisma.sawmillOutputItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          volumeM3: (20 * 30 * 1000 * 10) / 1000000000,
        }),
      });
    });

    it('should throw if consumed exceeds remaining', async () => {
      prisma.documentSequence.upsert.mockResolvedValue({ last_value: 1 });
      prisma.inputLog.findUnique.mockResolvedValue({
        id: 'input1',
        totalVolume: 10,
        sawmillConsumptions: [{ consumedM3: 5 }],
      });

      const data = {
        companyId: 'c1',
        productionDate: new Date(),
        shift: '1',
        operatorId: 'o1',
        workCenterId: 'w1',
        consumptions: [{ inputLogId: 'input1', consumedM3: 6 }],
        items: [],
      };

      await expect(service.createProductionRun(data)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('postProductionRun', () => {
    it('should call ledger and update stockMovementId', async () => {
      prisma.sawmillProductionRun.findUnique.mockResolvedValue({
        id: 'run1',
        status: 'DRAFT',
        outputItems: [
          {
            id: 'item1',
            timberVariantId: 'v1',
            quantityPcs: 10,
            volumeM3: 0.006,
            stockMovementId: null,
          },
        ],
      });
      ledger.createMovement.mockResolvedValue({ id: 'mov1' });

      await service.postProductionRun('run1', 'loc1');

      expect(ledger.createMovement).toHaveBeenCalledWith(
        prisma,
        'loc1',
        'v1',
        'IN',
        'PRODUCTION_OUTPUT',
        'run1',
        10,
        0.006,
      );
      expect(prisma.sawmillOutputItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { stockMovementId: 'mov1' },
      });
    });

    it('should reject if already posted', async () => {
      prisma.sawmillProductionRun.findUnique.mockResolvedValue({
        status: 'POSTED',
      });
      await expect(service.postProductionRun('run1', 'loc1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelProductionRun', () => {
    it('should call ledger for OUT movement if it was posted', async () => {
      prisma.sawmillProductionRun.findUnique.mockResolvedValue({
        id: 'run1',
        status: 'POSTED',
        outputItems: [
          {
            id: 'item1',
            timberVariantId: 'v1',
            quantityPcs: 10,
            volumeM3: 0.006,
            stockMovementId: 'mov1',
          },
        ],
      });
      ledger.createMovement.mockResolvedValue({ id: 'mov2' });

      await service.cancelProductionRun('run1', 'loc1');

      expect(ledger.createMovement).toHaveBeenCalledWith(
        prisma,
        'loc1',
        'v1',
        'OUT',
        'REVERSAL',
        'run1',
        10,
        0.006,
      );
      expect(prisma.sawmillOutputItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { reversalMovementId: 'mov2' },
      });
    });
  });
});
