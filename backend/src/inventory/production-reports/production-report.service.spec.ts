import { Test, TestingModule } from '@nestjs/testing';
import { ProductionReportService } from './production-report.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductionReportService', () => {
  let service: ProductionReportService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionReportService,
        {
          provide: PrismaService,
          useValue: {
            sawmillProductionRun: { findMany: jest.fn() },
            timberStockMovement: { findMany: jest.fn() },
            sawmillOutputItem: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ProductionReportService>(ProductionReportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Reconciliation', () => {
    it('should MATCH when SawmillOutputItem has exact ledger movement', async () => {
      jest.spyOn(prisma.sawmillProductionRun, 'findMany').mockResolvedValue([
        {
          id: 'run1',
          productionNo: 'PR-1',
          status: 'POSTED',
          outputItems: [
            {
              id: 'out1',
              timberVariantId: 'tv1',
              quantityPcs: 10,
              volumeM3: 5,
              stockMovementId: 'mov1',
              timberVariant: { sku: 'TV-1' },
            },
          ],
        } as any,
      ]);

      jest.spyOn(prisma.timberStockMovement, 'findMany').mockResolvedValue([
        {
          id: 'mov1',
          referenceType: 'PRODUCTION_OUTPUT',
          referenceId: 'out1',
          type: 'IN',
          quantityPcs: 10,
          volumeM3: 5,
          timberStock: {
            timberVariantId: 'tv1',
            timberVariant: { sku: 'TV-1' },
            location: { name: 'Loc' },
          },
        } as any,
      ]);

      const result = await service.getReconciliation({});
      const item = result.data.find((d) => d.outputId === 'out1');
      expect(item).toBeDefined();
      expect(item.diffPcs).toBe(0);
      expect(item.diffM3).toBe(0);
      expect(item.status).toBe('MATCH');
    });
  });

  describe('Data Quality', () => {
    it('should detect MISSING_LEDGER when output has no stockMovementId', async () => {
      jest.spyOn(prisma.sawmillProductionRun, 'findMany').mockResolvedValue([
        {
          id: 'run1',
          productionNo: 'PR-1',
          status: 'POSTED',
          consumptions: [{ consumedM3: 10 }],
          outputItems: [
            {
              id: 'out1',
              timberVariantId: 'tv1',
              quantityPcs: 10,
              volumeM3: 5,
              stockMovementId: null,
            },
          ],
        } as any,
      ]);

      jest.spyOn(prisma.timberStockMovement, 'findMany').mockResolvedValue([]);

      const result = await service.getDataQuality({});
      const alert = result.data.find(
        (d) => d.type === 'MISSING_LEDGER' && d.refId === 'run1',
      );
      expect(alert).toBeDefined();
    });

    it('should detect ORPHAN_LEDGER when movement exists but no OutputItem exists', async () => {
      jest.spyOn(prisma.sawmillProductionRun, 'findMany').mockResolvedValue([]);

      jest
        .spyOn(prisma.timberStockMovement, 'findMany')
        .mockResolvedValue([
          {
            id: 'mov2',
            referenceType: 'PRODUCTION_OUTPUT',
            referenceId: 'ghost-out',
          } as any,
        ]);

      jest
        .spyOn(prisma.sawmillOutputItem, 'findUnique')
        .mockResolvedValue(null);

      const result = await service.getDataQuality({});
      const alert = result.data.find(
        (d) => d.type === 'ORPHAN_LEDGER' && d.refId === 'mov2',
      );
      expect(alert).toBeDefined();
    });
  });
});
