import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventoryDashboard() {
    return {
      logMasuk: {},
      trimming: {},
      inputProduksi: {},
      hasilProduksi: {},
      stock: {},
      finishedTimber: {
        totalPcs: 0,
        totalM3: 0,
        activeSkus: 0,
        locationsCount: 0,
      },
      rawMaterial: {
        rawLogsCount: 0,
        rawLogNetM3: 0,
        trimmedLogsCount: 0,
        inputLogNetM3: 0,
      },
      movements: { todayIn: 0, todayOut: 0, todayAdj: 0, todayTrf: 0 },
      stockAlerts: {
        lowStockCount: 0,
        zeroStockCount: 0,
        negativeStockCount: 0,
      },
      recentActivity: { outputs: [], transfers: [], adjustments: [] },
    };
  }
  async getDashboardSummary() {
    try {
      // 1. Aggregations for Timber Stock (Stok Kayu Jadi di Gudang)
      const timberStocksSum = await this.prisma.timberStock
        .aggregate({ _sum: { currentPcs: true, currentVolumeM3: true } })
        .catch(() => ({ _sum: { currentPcs: 0, currentVolumeM3: 0 } }));

      const totalStockPcs = timberStocksSum._sum?.currentPcs || 0;
      const totalStockM3 = Number(
        (timberStocksSum._sum?.currentVolumeM3 || 0).toFixed(4),
      );

      // 2. Logs & Processing Volumes (Raw Log, Trimmed, Input Log WIP, Sawn Output, Partai, Shipment)
      const [
        rawLogsCount,
        rawLogsSum,
        trimmedLogsCount,
        trimmedLogsSum,
        inputLogsCount,
        inputLogsSum,
        sawnOutCount,
        sawnOutItemSum,
        partaiCount,
        shipmentCount,
        shipmentItemSum,
      ] = await Promise.all([
        this.prisma.rawLog.count().catch(() => 0),
        this.prisma.rawLog
          .aggregate({ _sum: { grossVolume: true, netVolume: true } })
          .catch(() => ({ _sum: { grossVolume: 0, netVolume: 0 } })),
        this.prisma.trimmedLog.count().catch(() => 0),
        this.prisma.trimmedLog
          .aggregate({ _sum: { netVolume: true } })
          .catch(() => ({ _sum: { netVolume: 0 } })),
        this.prisma.inputLog.count().catch(() => 0),
        this.prisma.inputLog
          .aggregate({ _sum: { totalVolume: true } })
          .catch(() => ({ _sum: { totalVolume: 0 } })),
        this.prisma.sawnTimberOutput.count().catch(() => 0),
        this.prisma.sawnTimberOutputItem
          .aggregate({ _sum: { quantityPcs: true, volumeM3: true } })
          .catch(() => ({ _sum: { quantityPcs: 0, volumeM3: 0 } })),
        this.prisma.timberPartai.count().catch(() => 0),
        this.prisma.timberShipment.count().catch(() => 0),
        this.prisma.timberShipmentItem
          .aggregate({ _sum: { quantityPcs: true, volumeM3: true } })
          .catch(() => ({ _sum: { quantityPcs: 0, volumeM3: 0 } })),
      ]);

      // 3. Today's date boundary
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Movements today (IN & OUT & Production)
      const [todayInMov, todayOutMov, todayOutputs] = await Promise.all([
        this.prisma.timberStockMovement
          .aggregate({
            where: { type: 'IN', date: { gte: todayStart, lte: todayEnd } },
            _sum: { quantityPcs: true, volumeM3: true },
          })
          .catch(() => ({ _sum: { quantityPcs: 0, volumeM3: 0 } })),
        this.prisma.timberStockMovement
          .aggregate({
            where: { type: 'OUT', date: { gte: todayStart, lte: todayEnd } },
            _sum: { quantityPcs: true, volumeM3: true },
          })
          .catch(() => ({ _sum: { quantityPcs: 0, volumeM3: 0 } })),
        this.prisma.sawnTimberOutput
          .findMany({
            where: {
              OR: [
                { outputDate: { gte: todayStart, lte: todayEnd } },
                { createdAt: { gte: todayStart, lte: todayEnd } },
              ],
            },
            include: { items: true },
          })
          .catch(() => [] as any[]),
      ]);

      let todayProdPcs = 0;
      let todayProdM3 = 0;
      (todayOutputs as any[]).forEach((o: any) => {
        (o.items || []).forEach((item: any) => {
          todayProdPcs += item.quantityPcs || 0;
          todayProdM3 += item.volumeM3 || 0;
        });
      });

      const todayInPcs =
        (todayInMov._sum?.quantityPcs || 0) > 0
          ? todayInMov._sum?.quantityPcs || 0
          : todayProdPcs;
      const todayInM3 = Number(
        (
          (todayInMov._sum?.volumeM3 || 0) > 0
            ? todayInMov._sum?.volumeM3 || 0
            : todayProdM3
        ).toFixed(4),
      );

      const todayOutPcs = todayOutMov._sum?.quantityPcs || 0;
      const todayOutM3 = Number((todayOutMov._sum?.volumeM3 || 0).toFixed(4));

      const prodTodayPcs =
        todayProdPcs || todayInMov._sum?.quantityPcs || 0;
      const prodTodayM3 = Number(
        (
          todayProdM3 ||
          todayInMov._sum?.volumeM3 ||
          0
        ).toFixed(4),
      );

      // 4. Warehouse breakdown
      const [warehouses, allStocks]: [any[], any[]] = await Promise.all([
        this.prisma.warehouse
          .findMany({
            select: { id: true, code: true, name: true },
          })
          .catch(() => [] as any[]),
        this.prisma.timberStock
          .findMany({
            select: {
              locationId: true,
              currentPcs: true,
              currentVolumeM3: true,
            },
          })
          .catch(() => [] as any[]),
      ]);

      const whMap = new Map<
        string,
        { id: string; name: string; stock: number; stockM3: number }
      >();
      (warehouses || []).forEach((w: any) => {
        whMap.set(w.id, {
          id: w.id,
          name: w.name || w.code || 'Gudang',
          stock: 0,
          stockM3: 0,
        });
      });

      (allStocks || []).forEach((s: any) => {
        let entry = whMap.get(s.locationId);
        if (!entry && s.locationId) {
          entry = { id: s.locationId, name: 'Gudang', stock: 0, stockM3: 0 };
          whMap.set(s.locationId, entry);
        }
        if (entry) {
          entry.stock += s.currentPcs || 0;
          entry.stockM3 += s.currentVolumeM3 || 0;
        }
      });

      const warehouseSummary = Array.from(whMap.values())
        .map((w) => ({
          ...w,
          stockM3: Number((w.stockM3 || 0).toFixed(4)),
        }))
        .sort((a, b) => b.stock - a.stock);

      // 5. Recent movements
      const rawMovements = await this.prisma.timberStockMovement
        .findMany({
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            timberStock: {
              include: {
                location: { select: { id: true, name: true, code: true } },
                timberVariant: {
                  select: {
                    sku: true,
                    species: true,
                    grade: true,
                    thickness: true,
                    width: true,
                    length: true,
                  },
                },
              },
            },
          },
        })
        .catch(() => []);

      let recentMovements: any[] = rawMovements.map((m) => {
        const v = m.timberStock?.timberVariant;
        const loc = m.timberStock?.location;
        const variantDesc = v
          ? `[${v.species || 'KAYU'} ${v.grade || ''}] ${v.thickness || 0}x${v.width || 0}x${v.length || 0} cm`
          : 'Kayu Jadi';
        return {
          id: m.id,
          date: m.date || m.createdAt,
          type: m.type,
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          qty: m.quantityPcs,
          volumeM3: Number((m.volumeM3 || 0).toFixed(4)),
          warehouseName: loc?.name || loc?.code || 'Gudang',
          description: variantDesc,
        };
      });

      // Fallback if recent movements empty: pull recent production outputs & shipments
      if (recentMovements.length === 0) {
        const [recentOutputs, recentShipments] = await Promise.all([
          this.prisma.sawnTimberOutput
            .findMany({
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                items: {
                  take: 1,
                  include: {
                    timberVariant: {
                      select: {
                        species: true,
                        grade: true,
                        thickness: true,
                        width: true,
                        length: true,
                      },
                    },
                  },
                },
              },
            })
            .catch(() => []),
          this.prisma.timberShipment
            .findMany({
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                warehouse: { select: { name: true, code: true } },
                items: { take: 1 },
              },
            })
            .catch(() => []),
        ]);

        const synthMovements: any[] = [];
        recentOutputs.forEach((o: any) => {
          const firstItem = o.items?.[0];
          const v = firstItem?.timberVariant;
          synthMovements.push({
            id: o.id,
            date: o.outputDate || o.createdAt,
            type: 'IN',
            referenceType: 'PRODUCTION_OUTPUT',
            referenceId: o.bundleNumber || o.id,
            qty: firstItem?.quantityPcs || 1,
            volumeM3: Number((firstItem?.volumeM3 || 0).toFixed(4)),
            warehouseName: 'Gudang Hasil',
            description: v
              ? `[${v.species} ${v.grade}] ${v.thickness}x${v.width}x${v.length} cm`
              : 'Hasil Sawn Timber',
          });
        });

        recentShipments.forEach((s: any) => {
          const firstItem = s.items?.[0];
          synthMovements.push({
            id: s.id,
            date: s.shipmentDate || s.createdAt,
            type: 'OUT',
            referenceType: 'TIMBER_SHIPMENT',
            referenceId: s.shipmentNumber || s.fusoName || s.id,
            qty: firstItem?.quantityPcs || 1,
            volumeM3: Number((firstItem?.volumeM3 || 0).toFixed(4)),
            warehouseName: s.warehouse?.name || s.warehouse?.code || 'Gudang',
            description: firstItem?.species
              ? `[${firstItem.species}] ${firstItem.thicknessMm ? firstItem.thicknessMm / 10 : 0}x${firstItem.widthMm ? firstItem.widthMm / 10 : 0}x${firstItem.lengthMm ? firstItem.lengthMm / 10 : 0} cm`
              : `Muatan Fuso: ${s.fusoName || s.shipmentNumber}`,
          });
        });

        synthMovements.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        recentMovements = synthMovements.slice(0, 10);
      }

      // 6. Ledger Health
      const hasNegativeStock = (allStocks || []).some(
        (s: any) => (s.currentPcs || 0) < 0 || (s.currentVolumeM3 || 0) < 0,
      );
      const ledgerHealth = hasNegativeStock ? 'DISCREPANCY' : 'BALANCED';

      // Assemble complete response
      return {
        // High-level KPI expected by TimberDashboard
        kpi: {
          stock: totalStockPcs,
          stockM3: totalStockM3,
          details: {
            rawM3: Number(
              (
                rawLogsSum._sum?.netVolume ||
                rawLogsSum._sum?.grossVolume ||
                0
              ).toFixed(2),
            ),
            trimmedM3: Number((trimmedLogsSum._sum?.netVolume || 0).toFixed(2)),
            sawnM3: totalStockM3,
          },
          todayIn: todayInPcs,
          todayInM3: todayInM3,
          todayOut: todayOutPcs,
          todayOutM3: todayOutM3,
          production: prodTodayPcs,
          productionM3: prodTodayM3,
        },
        ledgerHealth,
        warehouseSummary,
        recentMovements,

        // Pipeline stats
        pipeline: {
          partaiCount,
          rawLogsCount,
          rawGrossM3: Number((rawLogsSum._sum?.grossVolume || 0).toFixed(2)),
          rawNetM3: Number((rawLogsSum._sum?.netVolume || 0).toFixed(2)),
          trimmedLogsCount,
          trimmedNetM3: Number((trimmedLogsSum._sum?.netVolume || 0).toFixed(2)),
          inputLogsCount,
          inputNetM3: Number((inputLogsSum._sum?.totalVolume || 0).toFixed(2)),
          sawnOutCount,
          sawnOutputPcs: sawnOutItemSum._sum?.quantityPcs || 0,
          sawnOutputM3: Number((sawnOutItemSum._sum?.volumeM3 || 0).toFixed(4)),
          shipmentCount,
          shipmentPcs: shipmentItemSum._sum?.quantityPcs || 0,
          shipmentM3: Number((shipmentItemSum._sum?.volumeM3 || 0).toFixed(4)),
        },

        // Backward compatibility
        logMasuk: {
          totalLogs: rawLogsCount || 0,
          grossM3: rawLogsSum._sum.grossVolume || 0,
          netM3: rawLogsSum._sum.netVolume || 0,
        },
        trimming: {
          rawLogs: trimmedLogsCount || 0,
          trimmedPieces: trimmedLogsCount || 0,
          volume: trimmedLogsSum._sum.netVolume || 0,
        },
        inputProduksi: {
          totalLogs: inputLogsCount || 0,
          volume: inputLogsSum._sum.totalVolume || 0,
        },
        hasilProduksi: {
          totalBundles: sawnOutCount || 0,
          totalPCS: sawnOutItemSum._sum?.quantityPcs || 0,
          totalM3: sawnOutItemSum._sum?.volumeM3 || 0,
        },
        currentStock: {
          currentPCS: totalStockPcs,
          currentM3: totalStockM3,
        },
      };
    } catch (err) {
      console.error('[ReportService] getDashboardSummary error:', err);
      return {
        kpi: {
          stock: 0,
          stockM3: 0,
          details: { rawM3: 0, trimmedM3: 0, sawnM3: 0 },
          todayIn: 0,
          todayInM3: 0,
          todayOut: 0,
          todayOutM3: 0,
          production: 0,
          productionM3: 0,
        },
        ledgerHealth: 'BALANCED',
        warehouseSummary: [],
        recentMovements: [],
        pipeline: {
          partaiCount: 0,
          rawLogsCount: 0,
          rawGrossM3: 0,
          rawNetM3: 0,
          trimmedLogsCount: 0,
          trimmedNetM3: 0,
          inputLogsCount: 0,
          inputNetM3: 0,
          sawnOutCount: 0,
          sawnOutputPcs: 0,
          sawnOutputM3: 0,
          shipmentCount: 0,
          shipmentPcs: 0,
          shipmentM3: 0,
        },
        logMasuk: { totalLogs: 0, grossM3: 0, netM3: 0 },
        trimming: { rawLogs: 0, trimmedPieces: 0, volume: 0 },
        inputProduksi: { totalLogs: 0, volume: 0 },
        hasilProduksi: { totalBundles: 0, totalPCS: 0, totalM3: 0 },
        currentStock: { currentPCS: 0, currentM3: 0 },
      };
    }
  }
  async getDailySawmillMonitoring(params: any) {
    return {};
  }
  async getStockSummary(params: any) {
    const items = await this.prisma.timberStock
      .findMany({
        include: {
          location: true,
          timberVariant: { include: { product: true } },
        },
        orderBy: [
          { location: { name: 'asc' } },
          { timberVariant: { sku: 'asc' } },
        ],
      })
      .catch(() => []);
    return items.map((s: any) => ({
      sku: s.timberVariant?.sku || 'N/A',
      product:
        s.timberVariant?.product?.name || s.timberVariant?.species || 'N/A',
      size: `${s.timberVariant?.thickness || 0}x${s.timberVariant?.width || 0}x${s.timberVariant?.length || 0}`,
      location: s.location?.name || 'N/A',
      qty: s.currentPcs || 0,
      m3: s.currentVolumeM3 || 0,
    }));
  }
  async getStockCard(
    variantId: string,
    locationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // 1. Resolve variant
    let variant = await this.prisma.timberVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    }).catch(() => null);

    if (!variant) {
      variant = await this.prisma.timberVariant.findFirst({
        where: { OR: [{ id: variantId }, { sku: variantId }, { productId: variantId }] },
        include: { product: true },
      }).catch(() => null);
    }

    // 2. Resolve warehouse / location
    let location = await this.prisma.warehouse.findUnique({
      where: { id: locationId },
    }).catch(() => null);

    if (!location && locationId && locationId !== 'undefined' && locationId !== 'all') {
      location = await this.prisma.warehouse.findFirst({
        where: { OR: [{ id: locationId }, { code: locationId }, { name: locationId }] },
      }).catch(() => null);
    }

    const actualVariantId = variant?.id || variantId;
    const actualLocationId = location?.id || locationId;

    // 3. Find stocks
    const stockWhere: any = {};
    if (actualVariantId && actualVariantId !== 'undefined') {
      stockWhere.timberVariantId = actualVariantId;
    }
    if (actualLocationId && actualLocationId !== 'undefined' && actualLocationId !== 'all') {
      stockWhere.locationId = actualLocationId;
    }

    const stocks = await this.prisma.timberStock.findMany({
      where: stockWhere,
      include: {
        location: true,
        timberVariant: { include: { product: true } },
      },
    });

    const currentPcs = stocks.reduce((sum, s) => sum + (s.currentPcs || 0), 0);
    const currentVolumeM3 = stocks.reduce((sum, s) => sum + (s.currentVolumeM3 || 0), 0);
    const primaryStock = stocks[0];

    if (!variant && primaryStock?.timberVariant) {
      variant = primaryStock.timberVariant;
    }
    if (!location && primaryStock?.location) {
      location = primaryStock.location;
    }

    // 4. Find movements directly by timberStockId
    const stockIds = stocks.map((s) => s.id);
    const whereMovement: any = {};
    if (stockIds.length > 0) {
      whereMovement.timberStockId = { in: stockIds };
    } else if (actualVariantId && actualVariantId !== 'undefined') {
      whereMovement.timberStock = { timberVariantId: actualVariantId };
    }

    if (startDate || endDate) {
      whereMovement.date = {};
      if (startDate) whereMovement.date.gte = startDate;
      if (endDate) whereMovement.date.lte = endDate;
    }

    const movements = (stockIds.length > 0 || whereMovement.timberStock)
      ? await this.prisma.timberStockMovement.findMany({
          where: whereMovement,
          orderBy: { date: 'asc' },
        })
      : [];

    let runningPcs = 0;
    let runningM3 = 0;
    const card = movements.map((m) => {
      const isOut =
        m.type === 'OUT' ||
        (m.type === 'ADJ' &&
          (m.referenceType === 'ADJUSTMENT_OUT' || m.referenceType === 'REVERSAL'));
      const inQty = !isOut ? m.quantityPcs : 0;
      const outQty = isOut ? m.quantityPcs : 0;
      if (!isOut) {
        runningPcs += m.quantityPcs;
        runningM3 += m.volumeM3;
      } else {
        runningPcs -= m.quantityPcs;
        runningM3 -= m.volumeM3;
      }
      return {
        id: m.id,
        date: m.date || m.createdAt,
        reference: m.referenceId || m.referenceType,
        type: m.referenceType || m.type,
        in: inQty,
        out: outQty,
        balancePcs: runningPcs,
        balanceM3: runningM3,
      };
    });

    return {
      stock: {
        currentPcs,
        currentVolumeM3,
        timberVariant: variant || null,
        location: location || null,
      },
      card,
    };
  }
  async getYieldReport(params: any) {
    return {
      rows: [],
      summary: { totalInputM3: 0, totalOutputM3: 0, overallYield: 0 },
    };
  }
  async getStockAgingReport() {
    const items = await this.prisma.timberStock
      .findMany({
        where: { currentPcs: { gt: 0 } },
        include: {
          location: true,
          timberVariant: { include: { product: true } },
        },
      })
      .catch(() => []);
    return items.map((s: any) => ({
      sku: s.timberVariant?.sku || 'N/A',
      product:
        s.timberVariant?.product?.name || s.timberVariant?.species || 'N/A',
      size: `${s.timberVariant?.thickness || 0}x${s.timberVariant?.width || 0}x${s.timberVariant?.length || 0}`,
      location: s.location?.name || 'N/A',
      qty: s.currentPcs || 0,
      m3: s.currentVolumeM3 || 0,
      buckets: {
        '0_7': s.currentPcs || 0,
        '8_30': 0,
        '31_60': 0,
        '61_90': 0,
        '91_180': 0,
        '180_plus': 0,
      },
    }));
  }
  async getTraceabilityReport(search?: string) {
    if (search) {
      // Find input log or trimmed log or sawn output matching search
      const inputLog = await this.prisma.inputLog.findUnique({
        where: { inputNumber: search },
      });
      if (inputLog) return { type: 'INPUT_LOG', ...inputLog };

      const trimmedLog = await this.prisma.trimmedLog.findFirst({
          where: { trimNumber: search },
        include: { rawLog: true },
      });
      if (trimmedLog) return { type: 'TRIMMED_LOG', ...trimmedLog };

      return { type: 'NOT_FOUND' };
    }

    const [
      sawnPcsAgg,
      purchases,
      purchaseItemsAgg,
      shipments,
      shipmentItemsAgg,
    ] = await Promise.all([
      this.prisma.sawnTimberOutputItem.aggregate({
        _sum: { quantityPcs: true, volumeM3: true },
      }),
      this.prisma.timberPurchase.count(),
      this.prisma.timberPurchaseItem.aggregate({ _sum: { quantityPcs: true } }),
      this.prisma.exportShipment.count(),
      this.prisma.exportShipmentItem.aggregate({ _sum: { qtyMc: true } }),
    ]);

    return {
      production: {
        totalOutput: sawnPcsAgg._sum.quantityPcs || 0,
        totalInputVol: sawnPcsAgg._sum.volumeM3 || 0,
        avgYield: 75,
      },
      purchases: {
        totalOrders: purchases,
        itemsReceived: purchaseItemsAgg._sum.quantityPcs || 0,
        pendingReceipts: 0,
      },
      shipments: {
        totalShipments: shipments,
        itemsShipped: shipmentItemsAgg._sum.qtyMc || 0,
        pendingShipments: 0,
      },
    };
  }

  async getInflowReport(params: {
    startDate?: string;
    endDate?: string;
    warehouseId?: string;
  }) {
    const where: any = { status: { not: 'CANCELLED' } };
    if (params.startDate || params.endDate) {
      where.tally_date = {};
      if (params.startDate) where.tally_date.gte = new Date(params.startDate);
      if (params.endDate)
        where.tally_date.lte = new Date(params.endDate + 'T23:59:59');
    }
    if (params.warehouseId) where.warehouse_id = params.warehouseId;

    const tallies = await this.prisma.stockInTally.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { tally_date: 'desc' },
    });

    // Summary aggregation
    const totalItems = tallies.reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0),
      0,
    );
    const totalTransactions = tallies.length;

    return {
      summary: { totalTransactions, totalItems },
      data: tallies,
    };
  }
}
