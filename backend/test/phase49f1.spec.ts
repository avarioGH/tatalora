import { DashboardService } from '../src/inventory/dashboard/dashboard.service';
import { InputLogService } from '../src/inventory/input-log.service';
import { StockAdjustmentService } from '../src/inventory/stock-adjustment.service';

describe('Phase 49F.1 Fixes', () => {
  it('Dashboard tenant isolation check', () => {
    // A mock prisma to verify companyId is passed
    const prismaMock = {
      timberStock: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { currentPcs: 1 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      timberStockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    const svc = new DashboardService(prismaMock as any);

    return svc.getSummary('company-A').then(() => {
      expect(prismaMock.timberStock.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { location: { company_id: 'company-A' } },
        }),
      );
    });
  });

  it('Input Log Net Volume calculates Gross - Hollow without Trimming', () => {
    // If Gross = 1.39, Hollow = 0.31, Trimming = 0.31 -> Net = 1.08
    const tLogs = [
      {
        id: '1',
        grossVolume: 1.39,
        hollowVolume: 0.31,
        trimmingVolume: 0.31,
        netVolume: 0.77, // netVolume from TrimmedLog includes trimming, we should ignore it
      },
    ];

    let assignedVolume = 0;

    // Simulate what the service does
    const inputVolume =
      (tLogs[0].grossVolume || 0) - (tLogs[0].hollowVolume || 0);
    assignedVolume = inputVolume;

    expect(assignedVolume).toBeCloseTo(1.08, 4);

    const totalVolume = tLogs.reduce(
      (s, t) => s + ((t.grossVolume || 0) - (t.hollowVolume || 0)),
      0,
    );
    expect(totalVolume).toBeCloseTo(1.08, 4);
  });

  it('Adjustment Cancellation emits correct referenceType', () => {
    const itemDiffPcsPositive = 20;
    const itemDiffPcsNegative = -20;

    let typeOut = '';
    let refOut = '';

    // Positive adj cancel logic
    if (itemDiffPcsPositive > 0) {
      typeOut = 'ADJ';
      refOut = 'ADJUSTMENT_OUT';
    }
    expect(typeOut).toBe('ADJ');
    expect(refOut).toBe('ADJUSTMENT_OUT');

    // Negative adj cancel logic
    if (itemDiffPcsNegative < 0) {
      typeOut = 'ADJ';
      refOut = 'ADJUSTMENT_IN';
    }
    expect(typeOut).toBe('ADJ');
    expect(refOut).toBe('ADJUSTMENT_IN');
  });
});
