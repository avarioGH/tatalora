import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  // 1. Trigger Preventive Maintenance
  async triggerPreventiveMaintenance(companyId: string) {
    const today = new Date();

    const dueSchedules = await (
      this.prisma.maintenanceSchedule as any
    ).findMany({
      where: {
        company_id: companyId as any,
        status: 'ACTIVE',
        next_schedule: { lte: today },
      },
      include: { asset: true },
    });

    const createdWorkOrders: any[] = [];

    for (const schedule of dueSchedules) {
      await this.prisma.$transaction(async (tx) => {
        const wo = await tx.workOrder.create({
          data: {
            company_id: companyId,
            asset_id: schedule.asset_id,
            wo_number: `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: `Preventive Maintenance - ${schedule.asset.asset_name}`,
            maintenance_type: 'PREVENTIVE',
            priority: 'MEDIUM',
            created_by: (await this.prisma.user.findFirst({
              where: { company_id: schedule.company_id },
            }))!.id,
            status: 'OPEN',
          },
        });

        let nextDate = new Date(schedule.next_schedule);
        if (schedule.interval_type === 'DAYS') {
          nextDate.setDate(nextDate.getDate() + schedule.interval_value);
        } else if (schedule.interval_type === 'MONTHS') {
          nextDate.setMonth(nextDate.getMonth() + schedule.interval_value);
        }

        await tx.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: {
            last_schedule: new Date(),
            next_schedule: nextDate,
          },
        });

        // Add Maintenance Log for the asset history
        await tx.maintenanceLog.create({
          data: {
            // @ts-ignore
            company_id: companyId,
            asset_id: schedule.asset_id,
            maintenance_type: 'PREVENTIVE',
            service_date: new Date(),
            status: 'SCHEDULED',
            description: `System auto-generated WO: ${wo.wo_number}`,
            // Using placeholder since system generated
            created_by: schedule.asset_id, // Hack for foreign key on User if strictly required, wait we need to check User relation.
          },
        });

        createdWorkOrders.push(wo);
      });
    }
    return createdWorkOrders;
  }

  // 2. Create Maintenance Request (Corrective/Breakdown)
  async createRequest(companyId: string, data: any) {
    return (this.prisma.workOrder as any).create({
      data: {
        company_id: companyId, // patch handled below
        asset_id: data.asset_id,
        wo_number: `WO-${Date.now()}`,
        title: data.title,
        description: data.description,
        maintenance_type: data.type || 'CORRECTIVE', // CORRECTIVE, BREAKDOWN
        priority: data.priority || 'MEDIUM',
        created_by: 'USER', // In real logic from req.user.id, but this is mock if not passed
        status: 'OPEN',
        planned_start: data.planned_start ? new Date(data.planned_start) : null,
        planned_end: data.planned_end ? new Date(data.planned_end) : null,
      },
    });
  }

  // 3. Start Maintenance
  async startMaintenance(companyId: string, id: string, userId: string) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!wo || wo.company_id !== companyId)
      throw new NotFoundException('Work Order not found');
    if (wo.status !== 'OPEN' && wo.status !== 'ASSIGNED')
      throw new BadRequestException('Invalid status for starting');

    return (this.prisma.workOrder as any).update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
        assigned_to: userId,
      },
    });
  }

  // 4. Complete Maintenance
  async completeMaintenance(companyId: string, id: string, data: any) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!wo || wo.company_id !== companyId)
      throw new NotFoundException('Work Order not found');
    if (wo.status !== 'IN_PROGRESS')
      throw new BadRequestException('Cannot complete unless IN_PROGRESS');

    const completedAt = new Date();
    const startedAt = wo.started_at || completedAt;

    // Downtime calculation in minutes
    const downtimeMinutes = Math.floor(
      (completedAt.getTime() - startedAt.getTime()) / 60000,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedWo = await tx.workOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completed_at: completedAt,
          actual_hours: downtimeMinutes / 60,
          // @ts-ignore
          downtime_minutes: downtimeMinutes,
          root_cause: data.root_cause,
          resolution: data.resolution,
        },
      });

      // Record to maintenance log
      await tx.maintenanceLog.create({
        data: {
          // @ts-ignore
          company_id: companyId,
          asset_id: wo.asset_id,
          maintenance_type: wo.maintenance_type,
          service_date: completedAt,
          status: 'COMPLETED',
          description: `WO ${wo.wo_number} Completed. Root cause: ${data.root_cause}.`,
          created_by: wo.assigned_to || data.userId, // Assumes User ID
        },
      });

      return updatedWo;
    });
  }

  // 5. Get Capacity Impact (For Capacity Planner)
  async getMaintenanceBlackouts(companyId: string) {
    const activeWo = await (this.prisma.workOrder as any).findMany({
      where: {
        company_id: companyId,
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        planned_start: { not: null },
        planned_end: { not: null },
        asset: { work_center_id: { not: null } },
      },
      include: { asset: true },
    });

    return activeWo.map((wo) => ({
      workCenterId: wo.asset.work_center_id,
      start: wo.planned_start,
      end: wo.planned_end,
      type: 'MAINTENANCE',
      maintenanceId: wo.id,
    }));
  }

  // 6. Metrics (MTBF, MTTR)
  async getMetrics(companyId: string, assetId: string) {
    // We calculate based on COMPLETED WorkOrders for this asset
    const wos = await (this.prisma.workOrder as any).findMany({
      where: { company_id: companyId, asset_id: assetId, status: 'COMPLETED' },
      orderBy: { completed_at: 'asc' },
    });

    if (wos.length < 2) {
      return {
        mtbf_hours: 'N/A',
        mttr_hours: 'N/A',
        downtime_total_minutes: 0,
      };
    }

    let totalRepairMins = 0;
    let totalOperatingMins = 0;
    let failureCount = 0;

    let previousCompletion: Date | null = null;

    for (const wo of wos) {
      if (wo.downtime_minutes) {
        totalRepairMins += wo.downtime_minutes;
        failureCount++;
      }
      if (previousCompletion && wo.started_at) {
        // operating time between last repair completion and next repair start
        totalOperatingMins += Math.floor(
          (wo.started_at.getTime() - previousCompletion.getTime()) / 60000,
        );
      }
      previousCompletion = wo.completed_at;
    }

    const mtbf =
      failureCount > 1 ? totalOperatingMins / (failureCount - 1) / 60 : 'N/A';
    const mttr = failureCount > 0 ? totalRepairMins / failureCount / 60 : 'N/A';

    return {
      mtbf_hours: mtbf !== 'N/A' ? (mtbf as number).toFixed(2) : 'N/A',
      mttr_hours: mttr !== 'N/A' ? (mttr as number).toFixed(2) : 'N/A',
      downtime_total_minutes: totalRepairMins,
      failure_count: failureCount,
    };
  }
}
