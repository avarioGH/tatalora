import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PartaiService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, data: any) {
    return this.prisma.timberPartai.create({
      data: {
        ...data,
        company_id: companyId,
      },
    });
  }

  async migrateToTesting(companyId: string) {
    let testingPartai = await this.prisma.timberPartai.findFirst({
      where: { code: 'TESTING', company_id: companyId },
    });
    if (!testingPartai)
      testingPartai = await this.prisma.timberPartai.create({
        data: {
          code: 'TESTING',
          name: 'Partai Testing (Migrasi)',
          company_id: companyId,
          status: 'COMPLETED',
        },
      });
    const pid = testingPartai.id;
    const p1 = await this.prisma.timberPurchase.updateMany({
      where: { partaiId: null, company_id: companyId },
      data: { partaiId: pid },
    });
    const p2 = await this.prisma.rawLog.updateMany({
      where: { partaiId: null },
      data: { partaiId: pid },
    });
    const p3 = await this.prisma.trimmedLog.updateMany({
      where: { partaiId: null },
      data: { partaiId: pid },
    });
    const p4 = await this.prisma.inputLog.updateMany({
      where: { partaiId: null },
      data: { partaiId: pid },
    });
    const p5 = await this.prisma.sawnTimberOutput.updateMany({
      where: { partaiId: null },
      data: { partaiId: pid },
    });
    return {
      success: true,
      testingPartaiId: pid,
      updated: {
        purchases: p1.count,
        rawLogs: p2.count,
        trimmedLogs: p3.count,
        inputLogs: p4.count,
        outputs: p5.count,
      },
    };
  }

  async findAll(companyId: string) {
    return this.prisma.timberPartai.findMany({
      where: { company_id: companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {

      // FIX CORRUPT DATA:
      // If there are InputLogs that belong to this Partai's TrimmedLogs but lack partaiId, fix them.
      const corruptInputLogItems = await this.prisma.inputLogItem.findMany({
         where: {
            trimmedLog: { partaiId: id },
            inputLog: { partaiId: null }
         },
         include: { inputLog: true, trimmedLog: true }
      });
      
      for (const item of corruptInputLogItems) {
          if (item.inputLog) {
             await this.prisma.inputLog.update({
                where: { id: item.inputLogId },
                data: { partaiId: id }
             });
          }
      }
      
      // FIX MISSING INPUT LOGS:
      // Find TrimmedLogs that think they are in an InputLog, but the InputLog doesn't exist
      const assignedTrimmedLogs = await this.prisma.trimmedLog.findMany({
         where: { partaiId: id, status: 'ASSIGNED_TO_INPUT', inputLogId: { not: null } },
         include: { inputLog: true }
      });
      for (const st of assignedTrimmedLogs) {
         if (!st.inputLog) {
             await this.prisma.trimmedLog.update({
                where: { id: st.id },
                data: { status: 'AVAILABLE', inputLogId: null }
             });
         }
      }

      // FIX CORRUPT TRIMMED LOGS:
      // If there are TrimmedLogs that are ASSIGNED_TO_INPUT but don't have an inputLogId or their inputLog is missing, reset them
      const stuckTrimmedLogs = await this.prisma.trimmedLog.findMany({
         where: { partaiId: id, status: 'ASSIGNED_TO_INPUT', inputLogId: null }
      });
      for (const st of stuckTrimmedLogs) {
         await this.prisma.trimmedLog.update({
            where: { id: st.id },
            data: { status: 'AVAILABLE' }
         });
      }

    const partai = await this.prisma.timberPartai.findFirst({
      where: { id, company_id: companyId },
      include: {
        purchases: {
          include: { items: true, logItems: true },
        },
        rawLogs: true,
        trimmedLogs: { include: { rawLog: true } },
        inputLogs: {
          include: {
            items: {
              include: { trimmedLog: true, rawLog: true },
            },
            sawnOutputs: { include: { items: { include: { timberVariant: true } } } },
          },
        },
        sawnOutputs: { include: { items: { include: { timberVariant: true } } } },
      },
    });

    if (!partai) throw new NotFoundException('Partai not found');
    return partai;
  }

  async update(id: string, companyId: string, data: any) {
    const partai = await this.prisma.timberPartai.findFirst({
      where: { id, company_id: companyId },
    });
    if (!partai) throw new NotFoundException('Partai not found');
    return this.prisma.timberPartai.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    const partai = await this.prisma.timberPartai.findFirst({
      where: { id, company_id: companyId },
    });
    if (!partai) throw new NotFoundException('Partai not found');
    return this.prisma.timberPartai.delete({ where: { id } });
  }
}
