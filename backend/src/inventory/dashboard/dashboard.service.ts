import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    // 1. Stock (Sawn Timber)
    const stockAgg = await this.prisma.timberStock.aggregate({
      _sum: { currentPcs: true, currentVolumeM3: true },
    });
    const sawnPcs = stockAgg._sum.currentPcs || 0;
    const sawnM3 = stockAgg._sum.currentVolumeM3 || 0;

    // 2. Raw Logs
    const rawLogsAgg = await this.prisma.inputLog.aggregate({
      where: { status: { in: ['AVAILABLE'] } },
      _sum: { totalVolume: true, totalQty: true },
    });
    const rawPcs = rawLogsAgg._sum.totalQty || 0;
    const rawM3 = rawLogsAgg._sum.totalVolume || 0;

    // 3. Trimmed Logs
    const trimmedLogsAgg = await this.prisma.trimmedLog.aggregate({
      where: { status: { in: ['AVAILABLE'] } },
      _sum: { netVolume: true },
      _count: true,
    });
    const trimmedPcs = trimmedLogsAgg._count || 0;
    const trimmedM3 = trimmedLogsAgg._sum.netVolume || 0;

    const totalPcs = sawnPcs + rawPcs + trimmedPcs;
    const totalM3 = sawnM3 + rawM3 + trimmedM3;

    // 4. Warehouse Summary
    const warehouseData = await this.prisma.timberStock.groupBy({
      by: ['locationId'],
      _sum: { currentPcs: true, currentVolumeM3: true },
    });

    const warehouseSummary = await Promise.all(
      warehouseData.map(async (w) => {
        const loc = await this.prisma.warehouse.findUnique({
          where: { id: w.locationId },
        });
        return {
          warehouseName: loc?.name || 'Unknown',
          pcs: w._sum.currentPcs || 0,
          m3: w._sum.currentVolumeM3 || 0,
        };
      }),
    );

    // 5. Movements Today (for Sawn Timber)
    const todayMovements = await this.prisma.timberStockMovement.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      select: {
        type: true,
        referenceType: true,
        quantityPcs: true,
        volumeM3: true,
      },
    });

    let todayIn = 0,
      todayInM3 = 0;
    let todayOut = 0,
      todayOutM3 = 0;
    let production = 0,
      productionM3 = 0;

    for (const mov of todayMovements) {
      if (mov.type === 'IN') {
        todayIn += mov.quantityPcs;
        todayInM3 += mov.volumeM3;
        if (
          ['PRODUCTION_OUTPUT', 'PRODUCTION_PROCESS_OUTPUT'].includes(
            mov.referenceType,
          )
        ) {
          production += mov.quantityPcs;
          productionM3 += mov.volumeM3;
        }
      }
      if (mov.type === 'OUT') {
        todayOut += mov.quantityPcs;
        todayOutM3 += mov.volumeM3;
      }
    }

    // Recent Movements
    const recentMovements = await this.prisma.timberStockMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        timberStock: {
          include: {
            timberVariant: {
              include: { timberSpecies: true, timberGrade: true },
            },
            location: true,
          },
        },
      },
    });

    // Ledger Health
    const allMovementsAgg = await this.prisma.timberStockMovement.groupBy({
      by: ['type'],
      _sum: { quantityPcs: true },
    });
    let movementPcs = 0;
    for (const agg of allMovementsAgg) {
      if (agg.type === 'IN') movementPcs += agg._sum.quantityPcs || 0;
      else if (agg.type === 'OUT') movementPcs -= agg._sum.quantityPcs || 0;
      else if (agg.type === 'ADJ') movementPcs += agg._sum.quantityPcs || 0;
    }
    const stockSums = await this.prisma.timberStock.aggregate({
      _sum: { openingPcs: true, currentPcs: true },
    });
    const expectedCurrentPcs = (stockSums._sum.openingPcs || 0) + movementPcs;
    const actualCurrentPcs = stockSums._sum.currentPcs || 0;
    const ledgerHealth =
      expectedCurrentPcs === actualCurrentPcs
        ? 'BALANCED'
        : 'MISMATCH DETECTED';

    return {
      kpi: {
        stock: totalPcs,
        stockM3: totalM3,
        todayIn,
        todayInM3,
        todayOut,
        todayOutM3,
        production,
        productionM3,
        details: {
          sawnPcs,
          sawnM3,
          rawPcs,
          rawM3,
          trimmedPcs,
          trimmedM3,
        },
      },
      warehouseSummary,
      recentMovements,
      ledgerHealth,
    };
  }
}
