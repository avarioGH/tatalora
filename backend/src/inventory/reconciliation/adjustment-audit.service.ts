import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdjustmentAuditService {
  constructor(private prisma: PrismaService) {}

  async runForensicAudit(companyId: string) {
    const cancellations = await this.prisma.stockAdjustment.findMany({
      where: {
        status: 'CANCELLED',
        location: { company_id: companyId },
      },
      include: { items: true, location: true },
    });

    const adjustmentIds = cancellations.map((c) => c.id);

    const movements = await this.prisma.timberStockMovement.findMany({
      where: {
        referenceId: { in: adjustmentIds },
      },
    });

    const movementMap = new Map<string, any[]>();
    for (const mov of movements) {
      if (!movementMap.has(mov.referenceId))
        movementMap.set(mov.referenceId, []);
      movementMap.get(mov.referenceId)!.push(mov);
    }

    const report = {
      totalCancelledAdjustments: cancellations.length,
      notAffectedCount: 0,
      potentiallyAffectedCount: 0,
      confirmedAffectedCount: 0,
      insufficientDataCount: 0,
      confirmedRecords: [] as any[],
      aggregateDistortion: new Map<string, number>(),
    };

    for (const adj of cancellations) {
      const adjMovements = movementMap.get(adj.id) || [];

      for (const item of adj.items) {
        const itemMovements = adjMovements.filter(
          (m) =>
            m.timberVariantId === item.timberVariantId &&
            (m.batch || 'UNKNOWN') === (item.batch || 'UNKNOWN') &&
            m.quantityPcs === Math.abs(item.differencePcs),
        );

        const isNegativeDiff = item.differencePcs < 0;

        let classification = 'INSUFFICIENT_DATA';
        let distortion = 0;
        let expectedReversalDelta = isNegativeDiff
          ? Math.abs(item.differencePcs)
          : -Math.abs(item.differencePcs);
        let actualReversalDelta = 0;

        const originalMov = itemMovements.find(
          (m) =>
            m.referenceType ===
            (isNegativeDiff ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN'),
        );
        const reversalMov = itemMovements.find(
          (m) =>
            m.referenceType === 'REVERSAL' ||
            (isNegativeDiff && m.referenceType === 'ADJUSTMENT_IN') ||
            (!isNegativeDiff && m.referenceType === 'ADJUSTMENT_OUT'),
        );

        if (!originalMov || !reversalMov) {
          classification = 'INSUFFICIENT_DATA';
          report.insufficientDataCount++;
        } else {
          if (reversalMov.referenceType === 'REVERSAL') {
            if (isNegativeDiff) {
              classification = 'CONFIRMED_AFFECTED';
              report.confirmedAffectedCount++;
              actualReversalDelta = -Math.abs(item.differencePcs);
              distortion = actualReversalDelta - expectedReversalDelta;
            } else {
              classification = 'NOT_AFFECTED';
              report.notAffectedCount++;
              actualReversalDelta = -Math.abs(item.differencePcs);
              distortion = 0;
            }
          } else {
            classification = 'NOT_AFFECTED';
            report.notAffectedCount++;
            actualReversalDelta = expectedReversalDelta;
            distortion = 0;
          }
        }

        if (classification === 'CONFIRMED_AFFECTED') {
          const identityKey =
            companyId +
            '_' +
            adj.locationId +
            '_' +
            item.timberVariantId +
            '_' +
            (item.batch || 'UNKNOWN');
          const currentDist = report.aggregateDistortion.get(identityKey) || 0;
          report.aggregateDistortion.set(identityKey, currentDist + distortion);

          report.confirmedRecords.push({
            adjustmentId: adj.id,
            locationId: adj.locationId,
            timberVariantId: item.timberVariantId,
            batch: item.batch || 'UNKNOWN',
            originalDirection: isNegativeDiff ? 'OUT' : 'IN',
            quantity: Math.abs(item.differencePcs),
            originalMovement: originalMov,
            cancellationMovement: reversalMov,
            expectedCancellationDelta: expectedReversalDelta,
            actualCancellationDelta: actualReversalDelta,
            distortion,
          });
        } else if (
          classification === 'INSUFFICIENT_DATA' &&
          adjMovements.length > 0
        ) {
          const hasReversal = adjMovements.some(
            (m) => m.referenceType === 'REVERSAL',
          );
          if (hasReversal && isNegativeDiff) {
            report.insufficientDataCount--;
            report.potentiallyAffectedCount++;
            classification = 'POTENTIALLY_AFFECTED';
          }
        }
      }
    }

    const aggregateArray = Array.from(report.aggregateDistortion.entries()).map(
      ([key, distortion]) => {
        const [compId, locId, varId, batch] = key.split('_');
        return {
          companyId: compId,
          locationId: locId,
          timberVariantId: varId,
          batch,
          distortionPcs: distortion,
        };
      },
    );

    return {
      summary: {
        totalCancelledAdjustments: report.totalCancelledAdjustments,
        notAffectedCount: report.notAffectedCount,
        potentiallyAffectedCount: report.potentiallyAffectedCount,
        confirmedAffectedCount: report.confirmedAffectedCount,
        insufficientDataCount: report.insufficientDataCount,
      },
      confirmedRecords: report.confirmedRecords,
      aggregateImpact: aggregateArray,
    };
  }
}
