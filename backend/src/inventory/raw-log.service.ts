import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimberCalculationService } from './timber-calculation.service';
import { AuditService } from '../core/audit.service';

@Injectable()
export class RawLogService {
  constructor(
    private prisma: PrismaService,
    private calcService: TimberCalculationService,
    private audit: AuditService,
  ) {}

  async listRawLogs(params: {
    skip?: number;
    take?: number;
    search?: string;
    species?: string;
    diameterClass?: string;
    locationId?: string;
    status?: string;
  }) {
    const {
      skip = 0,
      take = 50,
      search,
      species,
      diameterClass,
      locationId,
      status,
    } = params;
    const where: any = { partaiId: null };

    if (search) {
      where.OR = [
        { logNumber: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { batch: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (species) where.species = species;
    if (diameterClass) where.diameterClass = diameterClass;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.rawLog.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: { location: true },
      }),
      this.prisma.rawLog.count({ where }),
    ]);

    return { items, total, skip: Number(skip), take: Number(take) };
  }

  async getRawLog(id: string) {
    if (!id || id === 'undefined' || id.length !== 24)
      throw new NotFoundException('Raw log not found');
    const log = await this.prisma.rawLog.findUnique({
      where: { id },
      include: {
        location: true,
          trimmedLogs: true,
          partai: true,
      },
    });
    if (!log) throw new NotFoundException('Raw log not found');
    return log;
  }

  async createRawLog(data: any) {
    // Identity Spoofing Protection
    let pItem: any = null;
    if (data.purchaseLogItemId) {
      pItem = await this.prisma.timberPurchaseLogItem.findUnique({
        where: { id: data.purchaseLogItemId },
        include: { timberPurchase: true },
      });
      if (!pItem) throw new NotFoundException('Purchase Log Item not found');
      if (pItem.status === 'RECEIVED')
        throw new BadRequestException('Purchase Log Item already received');
      data.logNumber = pItem.logNumber;
      data.species = pItem.species;
    }
    // Validate uniqueness
    const existingLog = await this.prisma.rawLog.findFirst({
        where: { logNumber: data.logNumber, partaiId: data.partaiId || undefined },
      });
    if (existingLog)
      throw new BadRequestException(
        `Log Number ${data.logNumber} already exists.`,
      );

    if (data.barcode) {
      const existingBarcode = await this.prisma.rawLog.findUnique({
        where: { barcode: data.barcode },
      });
      if (existingBarcode)
        throw new BadRequestException(
          `Barcode ${data.barcode} already exists.`,
        );
    }

    if (data.originalLength <= 0)
      throw new BadRequestException('Length must be greater than 0.');
    if (
      data.diameter1 <= 0 ||
      data.diameter2 <= 0 ||
      data.diameter3 <= 0 ||
      data.diameter4 <= 0
    ) {
      throw new BadRequestException('All diameters must be greater than 0.');
    }

    let speciesStr = data.species;
    if (data.speciesId) {
      const speciesObj = await this.prisma.timberSpecies.findUnique({
        where: { id: data.speciesId },
      });
      if (speciesObj) {
        speciesStr = speciesObj.code;
      }
    }

    // Calculations
    let avgDia = this.calcService.calculateAverageDiameter(
      Number(data.diameter1),
      Number(data.diameter2),
      Number(data.diameter3),
      Number(data.diameter4),
    );
    if (
      Number(data.diameter1) === 0 &&
      Number(data.diameter2) === 0 &&
      Number(data.diameter3) === 0 &&
      Number(data.diameter4) === 0 &&
      data.averageDiameter
    ) {
      avgDia = Number(data.averageDiameter);
    }
    const rndDia = this.calcService.calculateRoundedDiameter(avgDia);
    const diaClass = this.calcService.classifyDiameter(rndDia);
    const grossVol = this.calcService.calculateRawLogGrossVolume(
      rndDia,
      Number(data.originalLength),
    );

    let gerowongVol = 0;
    if (data.gerowong > 0) {
      gerowongVol = this.calcService.calculateGerowongVolume(
        Number(data.gerowong),
        Number(data.originalLength),
        Number(data.trimmingLength || 0),
      );
    }

    let trimmingVol = 0;
    if (data.trimmingLength > 0) {
      if (data.trimmingLength > data.originalLength)
        throw new BadRequestException(
          'Trimming length cannot exceed original length.',
        );
      trimmingVol = this.calcService.calculateTrimmingVolume(
        rndDia,
        Number(data.trimmingLength),
      );
    }

    const netVol = this.calcService.calculateRawLogNetVolume(
      grossVol,
      gerowongVol,
      trimmingVol,
    );
    if (netVol < 0)
      throw new BadRequestException(
        'Calculated net volume cannot be negative.',
      );

    const created = await this.prisma.rawLog.create({
      data: {
        logNumber: data.logNumber,
        partaiId:
          data.partaiId || (pItem ? pItem.timberPurchase?.partaiId : null),
        sequence: data.sequence ? Number(data.sequence) : null,
        code: data.code,
        species: speciesStr,
        speciesId: data.speciesId || null,
        sourceId: data.sourceId || null,
        quantity: 1,
        originalLength: Number(data.originalLength),
        diameter1: Number(data.diameter1),
        diameter2: Number(data.diameter2),
        diameter3: Number(data.diameter3),
        diameter4: Number(data.diameter4),
        averageDiameter: avgDia,
        roundedDiameter: rndDia,
        diameterClass: diaClass,
        grossVolume: grossVol,
        gerowong: data.gerowong ? Number(data.gerowong) : null,
        hollowVolume: gerowongVol || null,
        trimmingLength: data.trimmingLength
          ? Number(data.trimmingLength)
          : null,
        trimmingVolume: trimmingVol || null,
        netVolume: netVol,
        barcode: data.barcode || `LOG-${Date.now()}`,
        batch: data.batch,
        receivingDate: data.receivingDate
          ? new Date(data.receivingDate)
          : new Date(),
        locationId: data.locationId || null,
        notes: data.notes,
      },
    });
    await this.audit.log({
      company_id: data.companyId || '000000000000000000000000',
      action: 'CREATE',
      entity: 'RAW_LOG',
      entity_id: created.id,
      after_data: { logNumber: created.logNumber },
    });

    if (data.purchaseLogItemId) {
      await this.prisma.timberPurchaseLogItem.update({
        where: { id: data.purchaseLogItemId },
        data: { status: 'RECEIVED' },
      });
    }

    return created;
  }

  async cancelRawLog(id: string) {
    const log = await this.getRawLog(id);
    if (log.status !== 'AVAILABLE')
      throw new BadRequestException(
        `Cannot cancel log in status ${log.status}`,
      );

    const result = await this.prisma.rawLog.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.audit.log({
      company_id: '000000000000000000000000',
      action: 'CANCEL',
      entity: 'RAW_LOG',
      entity_id: id,
      before_data: { status: log.status },
      after_data: { status: 'CANCELLED' },
    });
    return result;
  }

  async createBulkRawLogs(dataArray: any[]) {
    return this.prisma.$transaction(async (tx) => {
      const createdLogs: any[] = [];
      for (const data of dataArray) {
        let pItem: any = null;
        if (data.purchaseLogItemId) {
          pItem = await this.prisma.timberPurchaseLogItem.findUnique({
            where: { id: data.purchaseLogItemId },
            include: { timberPurchase: true },
          });
          if (!pItem)
            throw new NotFoundException('Purchase Log Item not found');
          if (pItem.status === 'RECEIVED')
            throw new BadRequestException('Purchase Log Item already received');
          data.logNumber = pItem.logNumber;
          data.species = pItem.species;
        }
        if (!data.logNumber)
          throw new BadRequestException('Log Number is required');

        const existingLog = await tx.rawLog.findFirst({
          where: { logNumber: data.logNumber, partaiId: data.partaiId || undefined },
        });
        if (existingLog)
          throw new BadRequestException(
            `Log Number ${data.logNumber} already exists.`,
          );

        if (data.barcode) {
          const existingBarcode = await tx.rawLog.findUnique({
            where: { barcode: data.barcode },
          });
          if (existingBarcode)
            throw new BadRequestException(
              `Barcode ${data.barcode} already exists.`,
            );
        }

        if (Number(data.originalLength) <= 0)
          throw new BadRequestException('Length must be greater than 0.');

        const d1 = Number(data.diameter1) || 0;
        const d2 = Number(data.diameter2) || 0;
        const d3 = Number(data.diameter3) || 0;
        const d4 = Number(data.diameter4) || 0;
        const g = Number(data.gerowong) || 0;

        let avgDia = this.calcService.calculateAverageDiameter(d1, d2, d3, d4);
        if (
          d1 === 0 &&
          d2 === 0 &&
          d3 === 0 &&
          d4 === 0 &&
          data.averageDiameter
        ) {
          avgDia = Number(data.averageDiameter);
        }
        const rndDia = this.calcService.calculateRoundedDiameter(avgDia);
        const diaClass = this.calcService.classifyDiameter(rndDia);

        const grossVol = this.calcService.calculateRawLogGrossVolume(
          rndDia,
          Number(data.originalLength),
        );
        let hollowVol = 0;
        if (g > 0) {
          hollowVol = this.calcService.calculateGerowongVolume(
            g,
            Number(data.originalLength),
            0,
          );
        }
        const netVol = this.calcService.calculateRawLogNetVolume(
          grossVol,
          hollowVol,
          0,
        );

        const log = await tx.rawLog.create({
          data: {
            logNumber: data.logNumber,
            partaiId:
              data.partaiId || (pItem ? pItem.timberPurchase?.partaiId : null),
            species: data.species,
            speciesId: data.speciesId || undefined,
            sourceId: data.sourceId || undefined,
            originalLength: Number(data.originalLength),
            diameter1: d1,
            diameter2: d2,
            diameter3: d3,
            diameter4: d4,
            averageDiameter: avgDia,
            roundedDiameter: rndDia,
            diameterClass: diaClass,
            grossVolume: grossVol,
            gerowong: g || null,
            hollowVolume: hollowVol || null,
            netVolume: netVol,
            batch: data.batch,
            locationId: data.locationId || undefined,
            receivingDate: data.receivingDate
              ? new Date(data.receivingDate)
              : new Date(),
            barcode: data.barcode || data.logNumber,
            status: 'AVAILABLE',
          },
        });
        if (data.purchaseLogItemId) {
          await tx.timberPurchaseLogItem.update({
            where: { id: data.purchaseLogItemId },
            data: { status: 'RECEIVED' },
          });
        }
        createdLogs.push(log);
      }
      return createdLogs;
    });
  }

  async updateRawLog(id: string, data: any) {
    if (!id || id.length !== 24) throw new BadRequestException('Invalid ID');

    const existingLog = await this.prisma.rawLog.findUnique({ where: { id } });
    if (!existingLog) throw new NotFoundException('Raw Log not found');

    // Identity Spoofing Protection for Update
    if (existingLog.purchaseLogItemId) {
      const pItem = await this.prisma.timberPurchaseLogItem.findUnique({
        where: { id: existingLog.purchaseLogItemId },
      });
      if (pItem) {
        data.logNumber = pItem.logNumber;
        data.species = pItem.species;
      }
    } else if (data.purchaseLogItemId) {
      // Trying to attach to a purchase log item on update?
      const pItem = await this.prisma.timberPurchaseLogItem.findUnique({
        where: { id: data.purchaseLogItemId },
        include: { timberPurchase: true },
      });
      if (pItem) {
        data.logNumber = pItem.logNumber;
        data.species = pItem.species;
      }
    }
    if (!existingLog) throw new NotFoundException('Raw Log not found');

    let speciesStr = data.species || existingLog.species;
    if (data.speciesId) {
      const speciesObj = await this.prisma.timberSpecies.findUnique({
        where: { id: data.speciesId },
      });
      if (speciesObj) {
        speciesStr = speciesObj.code;
      }
    }

    const d1 = Number(data.diameter1) || existingLog.diameter1;
    const d2 = Number(data.diameter2) || existingLog.diameter2;
    const d3 = Number(data.diameter3) || existingLog.diameter3;
    const d4 = Number(data.diameter4) || existingLog.diameter4;
    const g =
      data.gerowong !== undefined
        ? Number(data.gerowong)
        : existingLog.gerowong || 0;
    const length = Number(data.originalLength) || existingLog.originalLength;

    let avgDia = this.calcService.calculateAverageDiameter(d1, d2, d3, d4);
    if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0 && data.averageDiameter) {
      avgDia = Number(data.averageDiameter);
    }
    const rndDia = this.calcService.calculateRoundedDiameter(avgDia);
    const diaClass = this.calcService.classifyDiameter(rndDia);

    const grossVol = this.calcService.calculateRawLogGrossVolume(
      rndDia,
      length,
    );
    let hollowVol = 0;
    if (g > 0) {
      hollowVol = this.calcService.calculateGerowongVolume(g, length, 0);
    }
    const netVol = this.calcService.calculateRawLogNetVolume(
      grossVol,
      hollowVol,
      0,
    );

    return this.prisma.rawLog.update({
      where: { id },
      data: {
        logNumber: data.logNumber || existingLog.logNumber,
        species: speciesStr,
        speciesId:
          data.speciesId !== undefined
            ? data.speciesId
            : (existingLog as any).speciesId,
        sourceId:
          data.sourceId !== undefined
            ? data.sourceId
            : (existingLog as any).sourceId,
        originalLength: length,
        diameter1: d1,
        diameter2: d2,
        diameter3: d3,
        diameter4: d4,
        averageDiameter: avgDia,
        roundedDiameter: rndDia,
        diameterClass: diaClass,
        grossVolume: grossVol,
        gerowong: g || null,
        hollowVolume: hollowVol || null,
        netVolume: netVol,
        batch: data.batch || existingLog.batch,
        locationId:
          data.locationId !== undefined
            ? data.locationId
            : existingLog.locationId,
      },
    });
  }

  async deleteRawLog(id: string) {
    if (!id || id.length !== 24) throw new BadRequestException('Invalid ID');
    const existingLog = await this.prisma.rawLog.findUnique({ where: { id } });
    if (!existingLog) throw new NotFoundException('Raw Log not found');

    // Check if it's already used
    if (existingLog.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'Cannot delete log that is not AVAILABLE (may have been trimmed or used).',
      );
    }

    return this.prisma.rawLog.delete({ where: { id } });
  }
}
