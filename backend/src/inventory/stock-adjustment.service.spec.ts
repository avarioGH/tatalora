import { AuditService } from '../core/audit.service';
import { Test, TestingModule } from '@nestjs/testing';
import { StockAdjustmentService } from './stock-adjustment.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { BadRequestException } from '@nestjs/common';

describe('StockAdjustmentService - Phase 45.6 Regression Tests', () => {
  let service: StockAdjustmentService;
  let prisma: PrismaService;
  let ledger: InventoryLedgerService;

  const mockPrisma = {
    $transaction: jest.fn(async (callback) => callback(mockPrisma)),
    stockAdjustment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockAudit = {
    logAction: jest.fn(),
  };
  const mockLedger = {
    createMovement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAdjustmentService,
        { provide: AuditService, useValue: mockAudit },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryLedgerService, useValue: mockLedger },
      ],
    }).compile();

    service = module.get<StockAdjustmentService>(StockAdjustmentService);
    prisma = module.get<PrismaService>(PrismaService);
    ledger = module.get<InventoryLedgerService>(InventoryLedgerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TEST A - Positive Adjustment Cancellation (ADJUSTMENT_IN -> ADJUSTMENT_OUT)', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj1',
      status: 'POSTED',
      locationId: 'locA',
      items: [
        {
          timberVariantId: 'tv1',
          differencePcs: 20,
          differenceM3: 1,
          batch: 'B001',
        },
      ],
    });

    await service.cancelAdjustment('adj1');

    expect(ledger.createMovement).toHaveBeenCalledWith(
      mockPrisma,
      'locA',
      'tv1',
      'ADJ',
      'ADJUSTMENT_OUT',
      'adj1',
      20,
      1,
      'B001',
    );
  });

  it('TEST B - Negative Adjustment Cancellation (ADJUSTMENT_OUT -> ADJUSTMENT_IN)', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj2',
      status: 'POSTED',
      locationId: 'locA',
      items: [
        {
          timberVariantId: 'tv1',
          differencePcs: -20,
          differenceM3: -1,
          batch: 'B002',
        },
      ],
    });

    await service.cancelAdjustment('adj2');

    expect(ledger.createMovement).toHaveBeenCalledWith(
      mockPrisma,
      'locA',
      'tv1',
      'ADJ',
      'ADJUSTMENT_IN',
      'adj2',
      20,
      1,
      'B002',
    );
  });

  it('TEST C - Exact Batch Preservation', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj3',
      status: 'POSTED',
      locationId: 'locA',
      items: [
        {
          timberVariantId: 'tv1',
          differencePcs: -10,
          differenceM3: -0.5,
          batch: ' p001 ',
        },
      ],
    });

    await service.cancelAdjustment('adj3');

    expect(ledger.createMovement).toHaveBeenCalledWith(
      mockPrisma,
      'locA',
      'tv1',
      'ADJ',
      'ADJUSTMENT_IN',
      'adj3',
      10,
      0.5,
      ' p001 ',
    );
  });

  it('TEST D - Warehouse Isolation', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj4',
      status: 'POSTED',
      locationId: 'Warehouse_A',
      items: [
        {
          timberVariantId: 'tv1',
          differencePcs: -5,
          differenceM3: -0.1,
          batch: 'B1',
        },
      ],
    });

    await service.cancelAdjustment('adj4');
    expect(ledger.createMovement).toHaveBeenCalledWith(
      mockPrisma,
      'Warehouse_A',
      'tv1',
      'ADJ',
      'ADJUSTMENT_IN',
      'adj4',
      5,
      0.1,
      'B1',
    );
  });

  it('TEST E - Variant Isolation', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj5',
      status: 'POSTED',
      locationId: 'locA',
      items: [
        {
          timberVariantId: 'Variant_A',
          differencePcs: -5,
          differenceM3: -0.1,
          batch: 'B1',
        },
      ],
    });

    await service.cancelAdjustment('adj5');
    expect(ledger.createMovement).toHaveBeenCalledWith(
      mockPrisma,
      'locA',
      'Variant_A',
      'ADJ',
      'ADJUSTMENT_IN',
      'adj5',
      5,
      0.1,
      'B1',
    );
  });

  it('TEST F - Double Cancellation', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj6',
      status: 'CANCELLED',
      items: [],
    });

    await expect(service.cancelAdjustment('adj6')).rejects.toThrow(
      BadRequestException,
    );
    expect(ledger.createMovement).not.toHaveBeenCalled();
  });

  it('TEST G - Transaction Failure', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj7',
      status: 'POSTED',
      locationId: 'locA',
      items: [
        {
          timberVariantId: 'tv1',
          differencePcs: 10,
          differenceM3: 0.5,
          batch: 'B1',
        },
      ],
    });

    mockLedger.createMovement.mockRejectedValueOnce(
      new Error('Simulated DB Failure'),
    );

    await expect(service.cancelAdjustment('adj7')).rejects.toThrow(
      'Simulated DB Failure',
    );
    expect(mockPrisma.stockAdjustment.update).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('TEST H - Reservation', async () => {
    mockPrisma.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj8',
      status: 'POSTED',
      locationId: 'locA',
      items: [
        {
          timberVariantId: 'tv1',
          differencePcs: -20,
          differenceM3: -1,
          batch: 'B1',
        },
      ],
    });

    await service.cancelAdjustment('adj8');

    expect(ledger.createMovement).toHaveBeenCalledWith(
      mockPrisma,
      'locA',
      'tv1',
      'ADJ',
      'ADJUSTMENT_IN',
      'adj8',
      20,
      1,
      'B1',
    );
  });
});
