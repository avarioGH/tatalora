import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as exceljs from 'exceljs';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMovements(filters: any) {
    const {
      warehouseId,
      variantId,
      dateFrom,
      dateTo,
      type,
      referenceType,
      page = 1,
      limit = 10,
    } = filters;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (warehouseId || variantId) {
      where.timberStock = {};
      if (warehouseId) where.timberStock.locationId = warehouseId;
      if (variantId) where.timberStock.timberVariantId = variantId;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (type) {
      where.type = type;
    }
    if (referenceType) {
      where.referenceType = referenceType;
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.timberStockMovement.findMany({
        where,
        include: {
          timberStock: {
            include: {
              location: true,
              timberVariant: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
      }),
      this.prisma.timberStockMovement.count({ where }),
    ]);

    return { data, totalCount };
  }

  async getStockCard(
    warehouseId: string,
    variantId: string,
    dateFrom: string,
    dateTo: string,
  ) {
    const priorMovements = await this.prisma.timberStockMovement.findMany({
      where: {
        timberStock: {
          locationId: warehouseId,
          timberVariantId: variantId,
        },
        date: { lt: new Date(dateFrom) },
      },
    });

    let openingBalancePcs = 0;
    let openingBalanceM3 = 0;

    for (const m of priorMovements) {
      if (m.type === 'IN') {
        openingBalancePcs += m.quantityPcs;
        openingBalanceM3 += m.volumeM3;
      } else if (m.type === 'OUT') {
        openingBalancePcs -= m.quantityPcs;
        openingBalanceM3 -= m.volumeM3;
      } else if (m.type === 'ADJ') {
        openingBalancePcs += m.quantityPcs;
        openingBalanceM3 += m.volumeM3;
      }
    }

    const movements = await this.prisma.timberStockMovement.findMany({
      where: {
        timberStock: {
          locationId: warehouseId,
          timberVariantId: variantId,
        },
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      orderBy: { date: 'asc' },
      include: {
        timberStock: {
          include: {
            location: true,
            timberVariant: true,
          },
        },
      },
    });

    let runningBalancePcs = openingBalancePcs;
    let runningBalanceM3 = openingBalanceM3;

    const formattedMovements = movements.map((m) => {
      if (m.type === 'IN') {
        runningBalancePcs += m.quantityPcs;
        runningBalanceM3 += m.volumeM3;
      } else if (m.type === 'OUT') {
        runningBalancePcs -= m.quantityPcs;
        runningBalanceM3 -= m.volumeM3;
      } else if (m.type === 'ADJ') {
        runningBalancePcs += m.quantityPcs;
        runningBalanceM3 += m.volumeM3;
      }

      return {
        ...m,
        runningBalancePcs,
        runningBalanceM3,
      };
    });

    return {
      openingBalancePcs,
      openingBalanceM3,
      closingBalancePcs: runningBalancePcs,
      closingBalanceM3: runningBalanceM3,
      movements: formattedMovements,
    };
  }

  async getProductionYield(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.processDate = {};
      if (dateFrom) where.processDate.gte = new Date(dateFrom);
      if (dateTo) where.processDate.lte = new Date(dateTo);
    }

    const processes = await this.prisma.productionProcess.findMany({
      where,
    });

    const summary: Record<
      string,
      { inputM3: number; outputM3: number; wasteM3: number }
    > = {};

    for (const p of processes) {
      if (!summary[p.processType]) {
        summary[p.processType] = { inputM3: 0, outputM3: 0, wasteM3: 0 };
      }
      summary[p.processType].inputM3 += p.inputVolumeM3;
      summary[p.processType].outputM3 += p.outputVolumeM3;
      summary[p.processType].wasteM3 += p.wasteVolumeM3;
    }

    const result = Object.keys(summary).map((type) => {
      const s = summary[type];
      const yieldPerc = s.inputM3 > 0 ? (s.outputM3 / s.inputM3) * 100 : 0;
      return {
        processType: type,
        inputM3: s.inputM3,
        outputM3: s.outputM3,
        wasteM3: s.wasteM3,
        yield: yieldPerc,
      };
    });

    return result;
  }

  async getOperationsSummary(dateFrom?: string, dateTo?: string) {
    const purchaseWhere: any = { status: 'CONFIRMED' };
    const shipmentWhere: any = { status: 'CONFIRMED' };
    const opnameWhere: any = { status: 'CONFIRMED' };

    if (dateFrom || dateTo) {
      if (dateFrom) {
        purchaseWhere.purchaseDate = { gte: new Date(dateFrom) };
        shipmentWhere.shipmentDate = { gte: new Date(dateFrom) };
        opnameWhere.opnameDate = { gte: new Date(dateFrom) };
      }
      if (dateTo) {
        purchaseWhere.purchaseDate = purchaseWhere.purchaseDate || {};
        purchaseWhere.purchaseDate.lte = new Date(dateTo);

        shipmentWhere.shipmentDate = shipmentWhere.shipmentDate || {};
        shipmentWhere.shipmentDate.lte = new Date(dateTo);

        opnameWhere.opnameDate = opnameWhere.opnameDate || {};
        opnameWhere.opnameDate.lte = new Date(dateTo);
      }
    }

    const [purchases, shipments, opnames] = await Promise.all([
      this.prisma.timberPurchase.findMany({ where: purchaseWhere }),
      this.prisma.timberShipment.findMany({ where: shipmentWhere }),
      this.prisma.timberStockOpname.findMany({
        where: opnameWhere,
        include: { items: true },
      }),
    ]);

    let totalPurchasePcs = 0;
    let totalPurchaseM3 = 0;
    for (const p of purchases) {
      totalPurchasePcs += p.totalPcs;
      totalPurchaseM3 += p.totalVolumeM3;
    }

    let totalShipmentPcs = 0;
    let totalShipmentM3 = 0;
    for (const s of shipments) {
      totalShipmentPcs += s.totalPcs;
      totalShipmentM3 += s.totalVolumeM3;
    }

    let totalOpnameVariancePcs = 0;
    let totalOpnameVarianceM3 = 0;
    for (const o of opnames) {
      for (const item of o.items) {
        totalOpnameVariancePcs += item.varianceQuantityPcs;
        totalOpnameVarianceM3 += item.varianceVolumeM3;
      }
    }

    return {
      purchases: { pcs: totalPurchasePcs, m3: totalPurchaseM3 },
      shipments: { pcs: totalShipmentPcs, m3: totalShipmentM3 },
      opnames: {
        variancePcs: totalOpnameVariancePcs,
        varianceM3: totalOpnameVarianceM3,
      },
    };
  }

  async exportMovements(filters: any): Promise<exceljs.Workbook> {
    const { data } = await this.getMovements({
      ...filters,
      page: 1,
      limit: 1000000,
    });
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Movements');
    ws.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Reference', key: 'reference', width: 25 },
      { header: 'Pcs', key: 'pcs', width: 10 },
      { header: 'M3', key: 'm3', width: 10 },
    ];
    data.forEach((m) => {
      ws.addRow({
        date: m.date,
        type: m.type,
        reference: m.referenceType + ' ' + m.referenceId,
        pcs: m.quantityPcs,
        m3: m.volumeM3,
      });
    });
    return wb;
  }

  async exportStockCard(
    warehouseId: string,
    variantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<exceljs.Workbook> {
    const data = await this.getStockCard(
      warehouseId,
      variantId,
      dateFrom,
      dateTo,
    );
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Stock Card');

    ws.addRow([
      'Opening Balance Pcs',
      data.openingBalancePcs,
      'Opening Balance M3',
      data.openingBalanceM3,
    ]);
    ws.addRow([]);

    ws.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Reference', key: 'reference', width: 25 },
      { header: 'In/Out/Adj Pcs', key: 'pcs', width: 15 },
      { header: 'In/Out/Adj M3', key: 'm3', width: 15 },
      { header: 'Balance Pcs', key: 'balPcs', width: 15 },
      { header: 'Balance M3', key: 'balM3', width: 15 },
    ];

    data.movements.forEach((m) => {
      ws.addRow({
        date: m.date,
        type: m.type,
        reference: m.referenceType,
        pcs: m.quantityPcs,
        m3: m.volumeM3,
        balPcs: (m as any).runningBalancePcs,
        balM3: (m as any).runningBalanceM3,
      });
    });
    return wb;
  }

  async exportProduction(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<exceljs.Workbook> {
    const data = await this.getProductionYield(dateFrom, dateTo);
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Production');
    ws.columns = [
      { header: 'Process Type', key: 'processType', width: 20 },
      { header: 'Input M3', key: 'inputM3', width: 15 },
      { header: 'Output M3', key: 'outputM3', width: 15 },
      { header: 'Waste M3', key: 'wasteM3', width: 15 },
      { header: 'Yield %', key: 'yield', width: 15 },
    ];
    data.forEach((d) => ws.addRow(d));
    return wb;
  }

  async exportPurchase(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<exceljs.Workbook> {
    const where: any = { status: 'CONFIRMED' };
    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = new Date(dateFrom);
      if (dateTo) where.purchaseDate.lte = new Date(dateTo);
    }
    const purchases = await this.prisma.timberPurchase.findMany({ where });
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Purchase');
    ws.columns = [
      { header: 'Purchase No', key: 'purchaseNumber', width: 20 },
      { header: 'Date', key: 'purchaseDate', width: 20 },
      { header: 'Pcs', key: 'totalPcs', width: 10 },
      { header: 'M3', key: 'totalVolumeM3', width: 10 },
    ];
    purchases.forEach((p) => ws.addRow(p));
    return wb;
  }

  async exportShipment(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<exceljs.Workbook> {
    const where: any = { status: 'CONFIRMED' };
    if (dateFrom || dateTo) {
      where.shipmentDate = {};
      if (dateFrom) where.shipmentDate.gte = new Date(dateFrom);
      if (dateTo) where.shipmentDate.lte = new Date(dateTo);
    }
    const shipments = await this.prisma.timberShipment.findMany({ where });
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Shipment');
    ws.columns = [
      { header: 'Shipment No', key: 'shipmentNumber', width: 20 },
      { header: 'Date', key: 'shipmentDate', width: 20 },
      { header: 'Pcs', key: 'totalPcs', width: 10 },
      { header: 'M3', key: 'totalVolumeM3', width: 10 },
    ];
    shipments.forEach((s) => ws.addRow(s));
    return wb;
  }

  async exportOpname(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<exceljs.Workbook> {
    const where: any = { status: 'CONFIRMED' };
    if (dateFrom || dateTo) {
      where.opnameDate = {};
      if (dateFrom) where.opnameDate.gte = new Date(dateFrom);
      if (dateTo) where.opnameDate.lte = new Date(dateTo);
    }
    const opnames = await this.prisma.timberStockOpname.findMany({ where });
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Opname');
    ws.columns = [
      { header: 'Opname No', key: 'opnameNumber', width: 20 },
      { header: 'Date', key: 'opnameDate', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    opnames.forEach((o) => ws.addRow(o));
    return wb;
  }
}
