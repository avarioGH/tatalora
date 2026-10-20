import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductionReportService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateRange(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.productionDate = {};
      if (startDate) where.productionDate.gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        where.productionDate.lte = e;
      }
    }
    return where;
  }

  async getSummary(query: {
    startDate?: string;
    endDate?: string;
    shift?: string;
    workCenterId?: string;
    locationId?: string;
  }) {
    const where = this.parseDateRange(query.startDate, query.endDate);
    if (query.shift) where.shift = query.shift;
    if (query.workCenterId) where.workCenterId = query.workCenterId;
    where.status = 'POSTED';

    const runs = await this.prisma.sawmillProductionRun.findMany({
      where,
      include: {
        consumptions: true,
        outputItems: true,
      },
    });

    let consumedM3 = 0;
    let outputPcs = 0;
    let outputM3 = 0;

    for (const run of runs) {
      run.consumptions.forEach((c: any) => {
        consumedM3 += c.consumedM3;
      });
      run.outputItems.forEach((o: any) => {
        outputPcs += o.quantityPcs;
        outputM3 += o.volumeM3;
      });
    }

    const rendement = consumedM3 > 0 ? (outputM3 / consumedM3) * 100 : null;

    // Input Logs (registered)
    const logWhere: any = {};
    if (query.startDate || query.endDate) {
      logWhere.date = {};
      if (query.startDate) logWhere.date.gte = new Date(query.startDate);
      if (query.endDate) {
        const e = new Date(query.endDate);
        e.setHours(23, 59, 59, 999);
        logWhere.date.lte = e;
      }
    }
    const inputLogs = await this.prisma.inputLog.findMany({ where: logWhere });
    const inputLogCount = inputLogs.length;
    const inputLogM3 = inputLogs.reduce(
      (sum: number, l: any) => sum + l.totalVolume,
      0,
    );

    return {
      inputLogCount,
      inputLogM3,
      consumedM3,
      outputPcs,
      outputM3,
      rendement,
    };
  }

  async getRendement(query: { startDate?: string; endDate?: string }) {
    const where = this.parseDateRange(query.startDate, query.endDate);
    where.status = 'POSTED';

    const runs = await this.prisma.sawmillProductionRun.findMany({
      where,
      include: {
        operator: true,
        workCenter: true,
        consumptions: true,
        outputItems: true,
      },
      orderBy: { productionDate: 'desc' },
    });

    let totalConsumedM3 = 0;
    let totalOutputM3 = 0;

    const data = runs.map((run: any) => {
      const consumedM3 = run.consumptions.reduce(
        (sum: number, c: any) => sum + c.consumedM3,
        0,
      );
      const outputM3 = run.outputItems.reduce(
        (sum: number, o: any) => sum + o.volumeM3,
        0,
      );
      const rendement = consumedM3 > 0 ? (outputM3 / consumedM3) * 100 : null;

      totalConsumedM3 += consumedM3;
      totalOutputM3 += outputM3;

      return {
        id: run.id,
        productionNo: run.productionNo,
        date: run.productionDate,
        shift: run.shift,
        operatorName: run.operator
          ? `${run.operator.first_name} ${run.operator.last_name || ''}`.trim()
          : null,
        machineName: run.workCenter?.name,
        inputM3: consumedM3,
        outputM3: outputM3,
        rendement,
      };
    });

    const overallRendement =
      totalConsumedM3 > 0 ? (totalOutputM3 / totalConsumedM3) * 100 : null;

    return {
      data,
      totals: {
        inputM3: totalConsumedM3,
        outputM3: totalOutputM3,
        overallRendement,
      },
    };
  }

  async getProducts(query: { startDate?: string; endDate?: string }) {
    const where = this.parseDateRange(query.startDate, query.endDate);
    where.status = 'POSTED';

    const runs = await this.prisma.sawmillProductionRun.findMany({
      where,
      include: {
        outputItems: {
          include: {
            timberVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    const productsMap = new Map<string, any>();
    let totalOutputM3 = 0;

    for (const run of runs) {
      for (const item of run.outputItems) {
        const tv = (item as any).timberVariant;
        if (!tv) continue;
        const key = tv.id;
        if (!productsMap.has(key)) {
          productsMap.set(key, {
            variantId: tv.id,
            productName: tv.product?.name || 'Unknown',
            species: tv.species,
            grade: tv.grade,
            thickness: tv.thickness,
            width: tv.width,
            length: tv.length,
            pcs: 0,
            m3: 0,
          });
        }
        const g = productsMap.get(key);
        g.pcs += item.quantityPcs;
        g.m3 += item.volumeM3;
        totalOutputM3 += item.volumeM3;
      }
    }

    const data = Array.from(productsMap.values()).map((p) => ({
      ...p,
      percentage: totalOutputM3 > 0 ? (p.m3 / totalOutputM3) * 100 : null,
    }));

    data.sort((a, b) => b.m3 - a.m3);
    return { data, totalOutputM3 };
  }

  async getShifts(query: { startDate?: string; endDate?: string }) {
    const where = this.parseDateRange(query.startDate, query.endDate);
    where.status = 'POSTED';

    const runs = await this.prisma.sawmillProductionRun.findMany({
      where,
      include: {
        operator: true,
        workCenter: true,
        consumptions: true,
        outputItems: true,
      },
    });

    const shiftMap = new Map<string, any>();

    for (const run of runs) {
      const key = `${run.shift}_${run.operatorId}_${run.workCenterId}`;
      if (!shiftMap.has(key)) {
        shiftMap.set(key, {
          shift: run.shift,
          operatorName: run.operator
            ? `${run.operator.first_name} ${run.operator.last_name || ''}`.trim()
            : null,
          machineName: run.workCenter?.name,
          productionRuns: 0,
          inputM3: 0,
          outputPcs: 0,
          outputM3: 0,
        });
      }
      const g = shiftMap.get(key);
      g.productionRuns += 1;
      g.inputM3 += run.consumptions.reduce(
        (sum: number, c: any) => sum + c.consumedM3,
        0,
      );
      g.outputPcs += run.outputItems.reduce(
        (sum: number, o: any) => sum + o.quantityPcs,
        0,
      );
      g.outputM3 += run.outputItems.reduce(
        (sum: number, o: any) => sum + o.volumeM3,
        0,
      );
    }

    const data = Array.from(shiftMap.values()).map((s) => ({
      ...s,
      rendement: s.inputM3 > 0 ? (s.outputM3 / s.inputM3) * 100 : null,
    }));

    return { data };
  }

  async getChamber() {
    const chamberWarehouses = await this.prisma.warehouse.findMany({
      where: { code: { startsWith: 'CH-' } },
    });

    const chamberLocIds = chamberWarehouses.map((w) => w.id);

    const stocks = await this.prisma.timberStock.findMany({
      where: { locationId: { in: chamberLocIds } },
      include: {
        location: true,
        timberVariant: { include: { product: true } },
      },
    });

    const currentStock = stocks
      .filter((s) => s.currentPcs > 0)
      .map((s) => ({
        chamber: s.location.code,
        chamberName: s.location.name,
        variant: s.timberVariant.sku,
        product: s.timberVariant.product?.name,
        thickness: s.timberVariant.thickness,
        width: s.timberVariant.width,
        length: s.timberVariant.length,
        pcs: s.currentPcs,
        m3: s.currentVolumeM3,
      }));

    const transfers = await this.prisma.stockTransfer.findMany({
      where: {
        OR: [
          { fromLocation: { code: { startsWith: 'CH-' } } },
          { toLocation: { code: { startsWith: 'CH-' } } },
        ],
      },
      include: {
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            timberVariant: true,
          },
        },
      },
      orderBy: { transferDate: 'desc' },
      take: 200,
    });

    const movements: any[] = [];
    for (const t of transfers) {
      const isOut = t.fromLocation?.code?.startsWith('CH-');
      const isIn = t.toLocation?.code?.startsWith('CH-');
      let direction = '';
      if (isOut && !isIn) direction = 'OUT';
      else if (isIn && !isOut) direction = 'IN';
      else direction = 'INTERNAL';

      for (const item of t.items) {
        movements.push({
          date: t.transferDate,
          transferNumber: t.transferNumber,
          direction,
          from: t.fromLocation?.code,
          to: t.toLocation?.code,
          variant: (item as any).timberVariant?.sku,
          pcs: item.quantityPcs,
          m3: item.volumeM3,
          status: t.status,
        });
      }
    }

    return { currentStock, movements };
  }

  async getDaily(query: { startDate?: string; endDate?: string }) {
    const map = new Map<string, any>();
    const getDayObj = (d: Date) => {
      const k = d.toISOString().split('T')[0];
      if (!map.has(k)) {
        map.set(k, {
          date: k,
          logSupplyM3: 0,
          trimmingM3: 0,
          inputLogM3: 0,
          consumedM3: 0,
          sawnOutputM3: 0,
          chamberInM3: 0,
          chamberOutM3: 0,
        });
      }
      return map.get(k);
    };

    const logsWhere: any = {};
    if (query.startDate)
      logsWhere.receivingDate = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      logsWhere.receivingDate = { ...logsWhere.receivingDate, lte: e };
    }
    const logs = await this.prisma.rawLog.findMany({ where: logsWhere });
    logs.forEach((l) => {
      getDayObj(l.receivingDate).logSupplyM3 += l.netVolume;
    });

    const trimWhere: any = {};
    if (query.startDate) trimWhere.date = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      trimWhere.date = { ...trimWhere.date, lte: e };
    }
    const trims = await this.prisma.trimmedLog.findMany({ where: trimWhere });
    trims.forEach((t) => {
      getDayObj(t.date).trimmingM3 += t.netVolume;
    });

    const ilWhere: any = {};
    if (query.startDate) ilWhere.date = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      ilWhere.date = { ...ilWhere.date, lte: e };
    }
    const ils = await this.prisma.inputLog.findMany({ where: ilWhere });
    ils.forEach((l) => {
      getDayObj(l.date).inputLogM3 += l.totalVolume;
    });

    const runWhere = this.parseDateRange(query.startDate, query.endDate);
    runWhere.status = 'POSTED';
    const runs = await this.prisma.sawmillProductionRun.findMany({
      where: runWhere,
      include: { consumptions: true, outputItems: true },
    });
    runs.forEach((r) => {
      const day = getDayObj(r.productionDate);
      r.consumptions.forEach((c: any) => {
        day.consumedM3 += c.consumedM3;
      });
      r.outputItems.forEach((o: any) => {
        day.sawnOutputM3 += o.volumeM3;
      });
    });

    const txWhere: any = { status: 'POSTED' };
    if (query.startDate)
      txWhere.transferDate = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      txWhere.transferDate = { ...txWhere.transferDate, lte: e };
    }
    txWhere.OR = [
      { fromLocation: { code: { startsWith: 'CH-' } } },
      { toLocation: { code: { startsWith: 'CH-' } } },
    ];
    const transfers = await this.prisma.stockTransfer.findMany({
      where: txWhere,
      include: { fromLocation: true, toLocation: true, items: true },
    });
    transfers.forEach((tx) => {
      const isOut = tx.fromLocation?.code?.startsWith('CH-');
      const isIn = tx.toLocation?.code?.startsWith('CH-');
      const day = getDayObj(tx.transferDate);
      tx.items.forEach((item) => {
        if (isIn) day.chamberInM3 += item.volumeM3;
        if (isOut) day.chamberOutM3 += item.volumeM3;
      });
    });

    const data = Array.from(map.values()).map((d) => ({
      ...d,
      rendement:
        d.consumedM3 > 0 ? (d.sawnOutputM3 / d.consumedM3) * 100 : null,
    }));
    data.sort((a, b) => a.date.localeCompare(b.date));

    return { data };
  }

  async getReconciliation(query: { startDate?: string; endDate?: string }) {
    const runWhere = this.parseDateRange(query.startDate, query.endDate);
    runWhere.status = 'POSTED';
    const runs = await this.prisma.sawmillProductionRun.findMany({
      where: runWhere,
      include: { outputItems: { include: { timberVariant: true } } },
    });

    const movWhere: any = { referenceType: 'PRODUCTION_OUTPUT' };
    if (query.startDate) movWhere.date = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      movWhere.date = { ...movWhere.date, lte: e };
    }
    const movements = await this.prisma.timberStockMovement.findMany({
      where: movWhere,
      include: {
        timberStock: { include: { timberVariant: true, location: true } },
      },
    });

    const data: any[] = [];

    // Grouping by Reference ID (which is the output item ID) to show detailed mismatches
    const outMap = new Map<string, any>();
    runs.forEach((r) => {
      r.outputItems.forEach((o: any) => {
        outMap.set(o.id, {
          productionNo: r.productionNo,
          outputId: o.id,
          variantId: o.timberVariantId,
          variantSku: o.timberVariant?.sku,
          prodPcs: o.quantityPcs,
          prodM3: o.volumeM3,
          invPcs: 0,
          invM3: 0,
          stockMovementId: o.stockMovementId,
        });
      });
    });

    movements.forEach((m) => {
      const outId = m.referenceId;
      if (outMap.has(outId)) {
        const o = outMap.get(outId);
        if (m.type === 'IN') {
          o.invPcs += m.quantityPcs;
          o.invM3 += m.volumeM3;
        } else if (m.type === 'OUT') {
          o.invPcs -= m.quantityPcs;
          o.invM3 -= m.volumeM3;
        }
      } else {
        data.push({
          productionNo: 'UNKNOWN (ORPHAN LEDGER)',
          outputId: outId,
          variantId: m.timberStock.timberVariantId,
          variantSku: m.timberStock.timberVariant.sku,
          location: m.timberStock.location?.name,
          prodPcs: 0,
          prodM3: 0,
          invPcs: m.type === 'IN' ? m.quantityPcs : -m.quantityPcs,
          invM3: m.type === 'IN' ? m.volumeM3 : -m.volumeM3,
          diffPcs: m.type === 'IN' ? -m.quantityPcs : m.quantityPcs,
          diffM3: m.type === 'IN' ? -m.volumeM3 : m.volumeM3,
          status: 'MISMATCH',
        });
      }
    });

    Array.from(outMap.values()).forEach((o) => {
      const diffPcs = o.prodPcs - o.invPcs;
      const diffM3 =
        Math.abs(o.prodM3 - o.invM3) > 0.0001 ? o.prodM3 - o.invM3 : 0;
      data.push({
        ...o,
        diffPcs,
        diffM3,
        status: diffPcs === 0 && diffM3 === 0 ? 'MATCH' : 'MISMATCH',
      });
    });

    return { data };
  }

  async getDataQuality(query: { startDate?: string; endDate?: string }) {
    const runWhere = this.parseDateRange(query.startDate, query.endDate);
    const runs = await this.prisma.sawmillProductionRun.findMany({
      where: runWhere,
      include: {
        consumptions: { include: { inputLog: true } },
        outputItems: true,
      },
    });

    const warnings: any[] = [];

    runs.forEach((r) => {
      if (r.status === 'POSTED') {
        const cTotal = r.consumptions.reduce(
          (sum: number, c: any) => sum + c.consumedM3,
          0,
        );
        const oTotal = r.outputItems.reduce(
          (sum: number, o: any) => sum + o.volumeM3,
          0,
        );

        if (cTotal === 0 && oTotal > 0) {
          warnings.push({
            type: 'ZERO_CONSUMPTION',
            severity: 'HIGH',
            message: `Production ${r.productionNo} has output but 0 consumption.`,
            refId: r.id,
          });
        }
        if (cTotal > 0 && oTotal === 0) {
          warnings.push({
            type: 'NO_OUTPUT',
            severity: 'LOW',
            message: `Production ${r.productionNo} has consumption but 0 output.`,
            refId: r.id,
          });
        }

        r.consumptions.forEach((c: any) => {
          if (c.consumedM3 < 0) {
            warnings.push({
              type: 'NEGATIVE_CONSUMPTION',
              severity: 'HIGH',
              message: `Production ${r.productionNo} has negative consumption.`,
              refId: r.id,
            });
          }
          if (c.inputLog && c.consumedM3 > c.inputLog.netVolume + 0.01) {
            warnings.push({
              type: 'OVERCONSUMPTION',
              severity: 'MEDIUM',
              message: `Production ${r.productionNo} consumed ${c.consumedM3} from InputLog ${c.inputLog.logNumber} (only ${c.inputLog.netVolume} available).`,
              refId: r.id,
            });
          }
        });

        r.outputItems.forEach((o: any) => {
          if (!o.stockMovementId) {
            warnings.push({
              type: 'MISSING_LEDGER',
              severity: 'HIGH',
              message: `Output item in ${r.productionNo} has no stock movement ID.`,
              refId: r.id,
            });
          }
          if (!o.timberVariantId) {
            warnings.push({
              type: 'NO_VARIANT',
              severity: 'HIGH',
              message: `Output item in ${r.productionNo} has no timberVariant.`,
              refId: r.id,
            });
          }
        });
      }
    });

    // Check for ledger PRODUCTION_OUTPUT without matching output record
    const movWhere: any = { referenceType: 'PRODUCTION_OUTPUT' };
    if (query.startDate) movWhere.date = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      movWhere.date = { ...movWhere.date, lte: e };
    }
    const movements = await this.prisma.timberStockMovement.findMany({
      where: movWhere,
      select: { referenceId: true, id: true },
    });

    const outputItemIdsInRuns = new Set();
    runs.forEach((r) =>
      r.outputItems.forEach((o: any) => outputItemIdsInRuns.add(o.id)),
    );

    // For this specific check, it's better to fetch all SawmillOutputItems globally and compare if performance is not an issue, but let's do it based on movements in period.
    for (const m of movements) {
      if (!outputItemIdsInRuns.has(m.referenceId)) {
        // Double check it really doesn't exist in DB at all
        const exists = await this.prisma.sawmillOutputItem.findUnique({
          where: { id: m.referenceId },
        });
        if (!exists) {
          warnings.push({
            type: 'ORPHAN_LEDGER',
            severity: 'HIGH',
            message: `Ledger movement ${m.id} references PRODUCTION_OUTPUT ${m.referenceId} which does not exist.`,
            refId: m.id,
          });
        }
      }
    }

    return { data: warnings };
  }
}
