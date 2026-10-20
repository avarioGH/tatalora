import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../core/audit.service';

@Injectable()
export class InputLogService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listInputLogs(params: {
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
        { inputNumber: { contains: search, mode: 'insensitive' } },
        { batch: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (species) where.species = species;
    if (locationId) where.locationId = locationId;
    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.inputLog.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          location: true,
          sawnOutputs: { include: { items: true } },
          items: { include: { trimmedLog: true } },
        },
      }),
      this.prisma.inputLog.count({ where }),
    ]);

    const mappedItems = items.map((log) => {
      let processedVolume = 0;
      let outputVolume = 0;
      if (log.sawnOutputs) {
        log.sawnOutputs.forEach((out: any) => {
          processedVolume += out.consumedVolume || 0;
          if (out.items) {
            out.items.forEach((i: any) => (outputVolume += i.volumeM3 || 0));
          }
        });
      }

      // Dynamically compute status for safety
      let currentStatus = log.status;
      const totalV = log.totalVolume || 0;
      // If it was marked DONE, keep it. Otherwise logic dictates:
      if (currentStatus !== 'DONE' && currentStatus !== 'CANCELLED') {
        if (processedVolume > 0 && processedVolume < totalV)
          currentStatus = 'PROCESSING';
        else if (processedVolume >= totalV && totalV > 0)
          currentStatus = 'DONE';
        else currentStatus = 'AVAILABLE';
      }

      return {
        ...log,
        status: currentStatus,
        processedVolume,
        remainingVolume: totalV - processedVolume,
        outputVolume,
      };
    });

    return {
      items: mappedItems,
      total,
      skip: Number(skip),
      take: Number(take),
    };
  }

  async getInputLog(id: string) {
    if (!id || id === 'undefined' || !/^[a-f\d]{24}$/i.test(id))
      throw new NotFoundException('Input log not found');
    const log = await this.prisma.inputLog.findUnique({
      where: { id },
      include: {
        location: true,
        sawnOutputs: { include: { items: true } },
        items: {
          include: {
            trimmedLog: {
              include: { rawLog: true },
            },
          },
        },
      },
    });
    if (!log) throw new NotFoundException('Input log not found');
    return log;
  }

  async getAvailableTrimmedLogs() {
    return this.prisma.trimmedLog.findMany({
      where: { status: 'AVAILABLE' },
      include: { rawLog: { select: { logNumber: true } }, location: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInputLog(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const {
        trimmedLogIds,
        date,
        shift,
        operatorName,
        machine,
        locationId,
        batch,
        notes,
      } = data;

      if (!trimmedLogIds || trimmedLogIds.length === 0) {
        throw new BadRequestException('Must select at least one trimmed log');
      }

      // Lock and verify trimmed logs
      const trimmedLogs = await tx.trimmedLog.findMany({
        where: { id: { in: trimmedLogIds } },
        include: { rawLog: true },
      });

      if (trimmedLogs.length !== trimmedLogIds.length) {
        throw new BadRequestException('Some trimmed logs were not found');
      }

      for (const t of trimmedLogs) {
        if (t.status !== 'AVAILABLE') {
          throw new BadRequestException(
            `Trimmed log ${t.trimNumber} is no longer available`,
          );
        }
      }

      // Calculations
      const totalQty = trimmedLogs.length;
      const totalLength = trimmedLogs.reduce(
        (sum, t) => sum + (t.length || 0),
        0,
      );
      const totalGross = trimmedLogs.reduce(
        (sum, t) => sum + (t.grossVolume || 0),
        0,
      );
      const totalGerowong = trimmedLogs.reduce(
        (sum, t) => sum + (t.hollowVolume || 0),
        0,
      );
      const totalTrimming = trimmedLogs.reduce(
        (sum, t) => sum + (t.trimmingVolume || 0),
        0,
      );
      const totalVolume = trimmedLogs.reduce(
        (sum, t) => sum + (t.netVolume || 0),
        0,
      );
      const species = trimmedLogs[0].species; // Take species from first log

      // Generate Input Number
      const dateObj = date ? new Date(date) : new Date();
      const YY = String(dateObj.getFullYear()).slice(2);
      const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
      const machineStr = machine || '1';

      const count = await tx.inputLog.count({
        where: {
          inputNumber: { startsWith: `I-MSAW-${machineStr}-${YY}-${MM}` },
        },
      });
      const seq = String(count + 1).padStart(3, '0');
      const inputNumber = `I-MSAW-${machineStr}-${YY}-${MM}-${seq}`;

      const existingCode = await tx.inputLog.findUnique({
        where: { inputNumber },
      });
      if (existingCode)
        throw new BadRequestException(
          `Input number ${inputNumber} already exists`,
        );

      const inputLog = await tx.inputLog.create({
        data: {
          inputNumber,
          date: dateObj,
          shift,
          operatorName,
          machine,
          locationId: locationId || trimmedLogs[0].locationId,
            partaiId: trimmedLogs[0].partaiId,
          batch,
          species,
          totalQty,
          totalLength,
          totalGross,
          totalGerowong,
          totalTrimming,
          totalVolume,
          notes,
          status: 'AVAILABLE',
        },
      });

      // Assign items
      for (const t of trimmedLogs) {
        await tx.inputLogItem.create({
          data: {
            inputLogId: inputLog.id,
            trimmedLogId: t.id,
            volume: t.netVolume,
            quantity: 1,
          },
        });

        await tx.trimmedLog.update({
          where: { id: t.id },
          data: {
            status: 'ASSIGNED_TO_INPUT',
            inputLogId: inputLog.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'INPUT_LOG',
          entity_id: inputLog.id,
          after_data: { inputNumber: inputLog.inputNumber },
        },
      });
      return inputLog;
    });
  }

  async cancelInputLog(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.inputLog.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!log) throw new NotFoundException('Input log not found');
      if (log.status !== 'AVAILABLE')
        throw new BadRequestException('Can only cancel AVAILABLE logs');

      await tx.inputLog.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      for (const item of log.items) {
        await tx.trimmedLog.update({
          where: { id: item.trimmedLogId as string },
          data: { status: 'AVAILABLE', inputLogId: null },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CANCEL',
          entity: 'INPUT_LOG',
          entity_id: id,
          before_data: { status: 'AVAILABLE' },
          after_data: { status: 'CANCELLED' },
        },
      });
      return log;
    });
  }

  async updateStatus(id: string, status: string) {
    if (!['AVAILABLE', 'IN_PROCESS', 'DONE'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.prisma.inputLog.update({
      where: { id },
      data: { status },
    });
  }

  async deleteInputLog(id: string) {
    const inputLog = await this.prisma.inputLog.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!inputLog) throw new Error('Input Log not found');

    // Kembalikan status TrimmedLog ke AVAILABLE
    for (const item of inputLog.items) {
      if (item.trimmedLogId) {
        await this.prisma.trimmedLog.update({
          where: { id: item.trimmedLogId as string },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    // Delete items first
    await this.prisma.inputLogItem.deleteMany({ where: { inputLogId: id } });
    // Delete log
    return this.prisma.inputLog.delete({ where: { id } });
  }
}
