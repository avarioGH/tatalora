import { Test, TestingModule } from '@nestjs/testing';
import { AdjustmentAuditService } from './adjustment-audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdjustmentAuditService - Forensic Classification Logic', () => {
  let service: AdjustmentAuditService;
  let prisma: PrismaService;

  const mockPrisma = {
    stockAdjustment: {
      findMany: jest.fn(),
    },
    timberStockMovement: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustmentAuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdjustmentAuditService>(AdjustmentAuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TEST A - Historical ADJUSTMENT_IN + old REVERSAL -> NOT AFFECTED', async () => {
    mockPrisma.stockAdjustment.findMany.mockResolvedValue([
      {
        id: 'adj1',
        status: 'CANCELLED',
        locationId: 'loc1',
        items: [{ timberVariantId: 'tv1', differencePcs: 10, batch: 'B1' }],
      },
    ]);
    mockPrisma.timberStockMovement.findMany.mockResolvedValue([
      {
        referenceId: 'adj1',
        referenceType: 'ADJUSTMENT_IN',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B1',
      },
      {
        referenceId: 'adj1',
        referenceType: 'REVERSAL',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B1',
      },
    ]);

    const result = await service.runForensicAudit('comp1');
    expect(result.summary.notAffectedCount).toBe(1);
    expect(result.summary.confirmedAffectedCount).toBe(0);
  });

  it('TEST B - Historical ADJUSTMENT_OUT + old REVERSAL -> CONFIRMED AFFECTED', async () => {
    mockPrisma.stockAdjustment.findMany.mockResolvedValue([
      {
        id: 'adj2',
        status: 'CANCELLED',
        locationId: 'loc1',
        items: [{ timberVariantId: 'tv1', differencePcs: -20, batch: 'B2' }],
      },
    ]);
    mockPrisma.timberStockMovement.findMany.mockResolvedValue([
      {
        referenceId: 'adj2',
        referenceType: 'ADJUSTMENT_OUT',
        timberVariantId: 'tv1',
        quantityPcs: 20,
        batch: 'B2',
      },
      {
        referenceId: 'adj2',
        referenceType: 'REVERSAL',
        timberVariantId: 'tv1',
        quantityPcs: 20,
        batch: 'B2',
      },
    ]);

    const result = await service.runForensicAudit('comp1');
    expect(result.summary.confirmedAffectedCount).toBe(1);
    expect(result.aggregateImpact[0].distortionPcs).toBe(-40);
  });

  it('TEST C - Correct new ADJUSTMENT_IN cancellation -> NOT AFFECTED', async () => {
    mockPrisma.stockAdjustment.findMany.mockResolvedValue([
      {
        id: 'adj3',
        status: 'CANCELLED',
        locationId: 'loc1',
        items: [{ timberVariantId: 'tv1', differencePcs: 10, batch: 'B3' }],
      },
    ]);
    mockPrisma.timberStockMovement.findMany.mockResolvedValue([
      {
        referenceId: 'adj3',
        referenceType: 'ADJUSTMENT_IN',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B3',
      },
      {
        referenceId: 'adj3',
        referenceType: 'ADJUSTMENT_OUT',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B3',
      },
    ]);

    const result = await service.runForensicAudit('comp1');
    expect(result.summary.notAffectedCount).toBe(1);
  });

  it('TEST D - Correct new ADJUSTMENT_OUT cancellation -> NOT AFFECTED', async () => {
    mockPrisma.stockAdjustment.findMany.mockResolvedValue([
      {
        id: 'adj4',
        status: 'CANCELLED',
        locationId: 'loc1',
        items: [{ timberVariantId: 'tv1', differencePcs: -10, batch: 'B4' }],
      },
    ]);
    mockPrisma.timberStockMovement.findMany.mockResolvedValue([
      {
        referenceId: 'adj4',
        referenceType: 'ADJUSTMENT_OUT',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B4',
      },
      {
        referenceId: 'adj4',
        referenceType: 'ADJUSTMENT_IN',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B4',
      },
    ]);

    const result = await service.runForensicAudit('comp1');
    expect(result.summary.notAffectedCount).toBe(1);
  });

  it('TEST E - Missing cancellation linkage -> INSUFFICIENT DATA', async () => {
    mockPrisma.stockAdjustment.findMany.mockResolvedValue([
      {
        id: 'adj5',
        status: 'CANCELLED',
        locationId: 'loc1',
        items: [{ timberVariantId: 'tv1', differencePcs: -10, batch: 'B5' }],
      },
    ]);
    mockPrisma.timberStockMovement.findMany.mockResolvedValue([
      {
        referenceId: 'adj5',
        referenceType: 'ADJUSTMENT_OUT',
        timberVariantId: 'tv1',
        quantityPcs: 10,
        batch: 'B5',
      },
      // MISSING REVERSAL
    ]);

    const result = await service.runForensicAudit('comp1');
    expect(result.summary.insufficientDataCount).toBe(1);
  });
});
