import { AuditService } from '../core/audit.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimberCalculationService } from './timber-calculation.service';

@Injectable()
export class TrimmedLogService {
  constructor(
    private prisma: PrismaService,
    private calcService: TimberCalculationService,
    private audit: AuditService,
  ) {}

  async listTrimmedLogs(params: {
    skip?: number;
    take?: number;
    search?: string;
    species?: string;
    locationId?: string;
    status?: string;
  }) {
    const { skip = 0, take = 50, search, species, locationId, status } = params;
    const where: any = { partaiId: null };
    if (search) {
      where.OR = [
        { trimNumber: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { rawLog: { logNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (species) where.species = species;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.trimmedLog.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: { location: true, rawLog: { select: { logNumber: true } } },
      }),
      this.prisma.trimmedLog.count({ where }),
    ]);
    return { items, total, skip: Number(skip), take: Number(take) };
  }

  async getTrimmedLog(id: string) {
    if (!id || id === 'undefined' || id.length !== 24)
      throw new NotFoundException('Trimmed log not found');
    const log = await this.prisma.trimmedLog.findUnique({
      where: { id },
      include: { location: true, rawLog: true, inputLog: true },
    });
    if (!log) throw new NotFoundException('Trimmed log not found');
    return log;
  }

  async getChildrenByRawLog(rawLogId: string) {
    const [children, parent] = await Promise.all([
      this.prisma.trimmedLog.findMany({
        where: { rawLogId },
        orderBy: { trimNumber: 'asc' },
      }),
      this.prisma.rawLog.findUnique({ where: { id: rawLogId } }),
    ]);
    if (!parent) throw new NotFoundException('Parent log not found');

    const allocated = children.reduce((sum, c) => sum + Number(c.length), 0);
    const remaining = Number(parent.originalLength) - allocated;
    return { children, parent, allocated, remaining: Math.max(0, remaining) };
  }

  async createTrimmedLog(rawLogId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.rawLog.findUnique({
        where: { id: rawLogId },
        include: { trimmedLogs: true },
      });
      if (!parent) throw new NotFoundException('Parent raw log not found');

      const allocated = parent.trimmedLogs.reduce(
        (sum, c) => sum + Number(c.length),
        0,
      );
      const remaining = Number(parent.originalLength) - allocated;

      const reqLen = Number(data.length);
      if (reqLen <= 0) throw new BadRequestException('Length must be > 0');
      if (reqLen > remaining) {
        throw new BadRequestException(
          `Total panjang trimming melebihi panjang log induk. Remaining: ${remaining}m`,
        );
      }

      // Generate Trim Code
      const existingCount = parent.trimmedLogs.length;
      const trimLetter = String.fromCharCode(65 + existingCount); // A, B, C...
      const trimNumber = `${parent.logNumber}${trimLetter}`;

      const existingCode = await tx.trimmedLog.findFirst({
        where: { trimNumber, partaiId: parent.partaiId || undefined },
      });
      if (existingCode)
        throw new BadRequestException(`Trim code ${trimNumber} already exists`);

      // Calculations
      let avgDia = this.calcService.calculateAverageDiameter(
        Number(data.diameter1) || 0,
        Number(data.diameter2) || 0,
        Number(data.diameter3) || 0,
        Number(data.diameter4) || 0,
      );
      if (avgDia === 0 && data.averageDiameter) {
        avgDia = Number(data.averageDiameter);
      }
      const rndDia = this.calcService.calculateRoundedDiameter(avgDia);
      const grossVol = this.calcService.calculateRawLogGrossVolume(
        rndDia,
        reqLen,
      );

      let gerowongVol = 0;
      if (data.gerowong > 0) {
        gerowongVol = this.calcService.calculateGerowongVolume(
          Number(data.gerowong),
          reqLen,
          Number(data.trimmingLength || 0),
        );
      }

      let trimmingVol = 0;
      if (data.trimmingLength > 0) {
        if (data.trimmingLength > reqLen)
          throw new BadRequestException(
            'Trimming length cannot exceed log length',
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
        throw new BadRequestException('Net volume cannot be negative');

      const child = await tx.trimmedLog.create({
        data: {
          trimNumber,
          rawLogId: parent.id,
          partaiId: parent.partaiId,
          species: data.species || parent.species,
          length: reqLen,
          diameter1: Number(data.diameter1),
          diameter2: Number(data.diameter2),
          diameter3: Number(data.diameter3),
          diameter4: Number(data.diameter4),
          averageDiameter: avgDia,
          roundedDiameter: rndDia,
          grossVolume: grossVol,
          gerowong: data.gerowong ? Number(data.gerowong) : null,
          hollowVolume: gerowongVol || null,
          trimmingLength: data.trimmingLength
            ? Number(data.trimmingLength)
            : null,
          trimmingVolume: trimmingVol || null,
          netVolume: netVol,
          barcode: data.barcode || `TRIM-${Date.now()}`,
          locationId: data.locationId || parent.locationId,
          notes: data.notes,
        },
      });

      // Update Parent Status
      const newAllocated = allocated + reqLen;
      let newStatus = parent.status;
      if (newStatus === 'AVAILABLE') newStatus = 'IN_TRIMMING';
      // If remaining length is effectively 0 (allow tiny float precision margin)
      if (Math.abs(Number(parent.originalLength) - newAllocated) < 0.01) {
        newStatus = 'TRIMMED';
      }

      if (newStatus !== parent.status) {
        await tx.rawLog.update({
          where: { id: parent.id },
          data: { status: newStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'TRIMMED_LOG',
          entity_id: child.id,
          after_data: { trimNumber: child.trimNumber },
        },
      });
      return child;
    });
  }

  async cancelTrimmedLog(id: string) {
    const log = await this.getTrimmedLog(id);
    if (log.status !== 'AVAILABLE')
      throw new BadRequestException('Can only cancel AVAILABLE logs');
    const result = await this.prisma.trimmedLog.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.audit.log({
      company_id: 'SYSTEM',
      action: 'CANCEL',
      entity: 'TRIMMED_LOG',
      entity_id: id,
      before_data: { status: log.status },
      after_data: { status: 'CANCELLED' },
    });
    return result;
  }

  async deleteTrimmedLog(id: string) {
    const log = await this.prisma.trimmedLog.findUnique({ where: { id } });
    if (!log) throw new Error('Trimmed Log not found');

    // Kembalikan status RawLog ke AVAILABLE
    if (log.rawLogId) {
      await this.prisma.rawLog.update({
        where: { id: log.rawLogId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.prisma.trimmedLog.delete({ where: { id } });
  }
}
