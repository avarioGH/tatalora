import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCapacity(company_id: string) {
    this.logger.log(`Calculating capacity for company ${company_id}`);

    const workCenters = await (this.prisma.workCenter as any).findMany({
      where: { company_id, is_active: true },
    });

    const wcCapacity = new Map();
    for (const wc of workCenters) {
      const dailyHours = wc.capacity_hours_per_day || 8;
      const eff = wc.efficiency_percentage || 100;

      // Task 7: Use actual configured daily capacity
      const availableCapacityPerDay = dailyHours * (eff / 100);

      wcCapacity.set(wc.id, {
        id: wc.id,
        code: wc.code,
        name: wc.name,
        available_hours_per_day: availableCapacityPerDay,
        required_hours: 0,
      });
    }

    const openOperations = await (
      this.prisma.manufacturingWorkOrder as any
    ).findMany({
      where: {
        company_id,
        status: { in: ['PENDING', 'READY', 'IN_PROGRESS'] },
      },
    });

    for (const op of openOperations) {
      if (op.work_center_id && wcCapacity.has(op.work_center_id)) {
        const wcData = wcCapacity.get(op.work_center_id);
        const duration = op.planned_duration_minutes || 0;
        wcData.required_hours += duration / 60;
      }
    }

    const results: any[] = [];
    let totalAvailable = 0;
    let totalRequired = 0;
    const overloadedCenters: any[] = [];
    const idleCenters: any[] = [];

    for (const [id, data] of wcCapacity.entries()) {
      totalAvailable += data.available_hours_per_day;
      totalRequired += data.required_hours;

      const utilization =
        data.available_hours_per_day > 0
          ? (data.required_hours / (data.available_hours_per_day * 7)) * 100
          : 0;

      const wcResult = {
        ...data,
        utilization_percentage: utilization,
        status:
          utilization > 100
            ? 'OVERLOADED'
            : utilization === 0
              ? 'IDLE'
              : 'OPTIMAL',
      };

      if (wcResult.status === 'OVERLOADED') overloadedCenters.push(wcResult);
      if (wcResult.status === 'IDLE') idleCenters.push(wcResult);
      results.push(wcResult);
    }

    return {
      company_id,
      overall_utilization:
        totalAvailable > 0 ? (totalRequired / (totalAvailable * 7)) * 100 : 0,
      work_centers: results,
      overloaded_centers: overloadedCenters,
      idle_centers: idleCenters,
    };
  }

  // Helper functions for Shift Calendar
  private alignToShift(
    date: Date,
    startH: number,
    startM: number,
    endH: number,
    endM: number,
  ): Date {
    let d = new Date(date.getTime());
    let shiftStart = new Date(d.getTime());
    shiftStart.setHours(startH, startM, 0, 0);

    let shiftEnd = new Date(d.getTime());
    shiftEnd.setHours(endH, endM, 0, 0);

    if (d < shiftStart) {
      return shiftStart;
    }
    if (d >= shiftEnd) {
      d.setDate(d.getDate() + 1);
      d.setHours(startH, startM, 0, 0);
      return d;
    }
    return d;
  }

  private calculateEnd(
    start: Date,
    durationMins: number,
    startH: number,
    startM: number,
    endH: number,
    endM: number,
  ): Date {
    let current = new Date(start.getTime());
    let remaining = durationMins;

    while (remaining > 0) {
      let shiftStart = new Date(current.getTime());
      shiftStart.setHours(startH, startM, 0, 0);

      let shiftEnd = new Date(current.getTime());
      shiftEnd.setHours(endH, endM, 0, 0);

      if (current < shiftStart) {
        current = new Date(shiftStart.getTime());
      }

      if (current >= shiftEnd) {
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
        continue;
      }

      let availableTodayMins = (shiftEnd.getTime() - current.getTime()) / 60000;

      if (remaining <= availableTodayMins) {
        current = new Date(current.getTime() + remaining * 60000);
        remaining = 0;
      } else {
        remaining -= availableTodayMins;
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
      }
    }
    return current;
  }

  private findNextAvailableSlot(
    wcBookings: any[],
    desiredStart: Date,
    duration: number,
    wc: any,
  ) {
    let proposedStart = new Date(desiredStart.getTime());

    const [startH, startM] = (wc.shift_start_time || '08:00')
      .split(':')
      .map(Number);
    const [endH, endM] = (wc.shift_end_time || '17:00').split(':').map(Number);

    // Safeguard infinite loop if infinite overlaps (unlikely but safe)
    let iter = 0;
    while (iter < 1000) {
      iter++;
      proposedStart = this.alignToShift(
        proposedStart,
        startH,
        startM,
        endH,
        endM,
      );
      let proposedEnd = this.calculateEnd(
        proposedStart,
        duration,
        startH,
        startM,
        endH,
        endM,
      );

      // overlap check: A.start < B.end AND A.end > B.start
      let overlap = wcBookings.find(
        (b) => proposedStart < b.planned_end && proposedEnd > b.planned_start,
      );

      if (overlap) {
        proposedStart = new Date(overlap.planned_end.getTime());
      } else {
        return { start: proposedStart, end: proposedEnd };
      }
    }
    throw new Error('Could not find available slot');
  }

  async generateSchedule(company_id: string) {
    this.logger.log(`Generating Schedule for company ${company_id}`);

    const mos = await (this.prisma.manufacturingOrder as any).findMany({
      where: {
        company_id,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        bom: {
          include: {} as any,
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const workCentersList = await (this.prisma.workCenter as any).findMany({
      where: { company_id, is_active: true },
    });

    const wcMap = new Map();
    const wcBookings = new Map();
    for (const wc of workCentersList) {
      wcMap.set(wc.id, wc);
      wcBookings.set(wc.id, []);
    }

    // Load existing bookings from DB to prevent overlapping
    const existingActiveBookings = await (
      this.prisma.manufacturingWorkOrder as any
    ).findMany({
      where: {
        company_id,
        status: { in: ['PENDING', 'READY', 'IN_PROGRESS'] },
        planned_start: { not: null },
        planned_end: { not: null },
      },
    });

    for (const b of existingActiveBookings) {
      if (wcBookings.has(b.work_center_id)) {
        wcBookings.get(b.work_center_id).push({
          started_at: new Date(b.planned_start!),
          completed_at: new Date(b.planned_end!),
        });
      }
    }

    const maintenanceBlackouts = await (this.prisma.workOrder as any).findMany({
      ...({} as any),
      where: {
        company_id,
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        started_at: { not: null },
        completed_at: { not: null },
      },
      include: { asset: true },
    });

    for (const b of maintenanceBlackouts) {
      if (
        b.asset &&
        b.asset.work_center_id &&
        wcBookings.has(b.asset.work_center_id)
      ) {
        wcBookings.get(b.asset.work_center_id).push({
          started_at: new Date(b.started_at!),
          completed_at: new Date(b.completed_at!),
        });
      }
    }

    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);

    const scheduledWorkload: any[] = [];
    const bottlenecks: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const mo of mos) {
        if (!mo.bom || !mo.bom.routing) continue;

        // Task 1: Quantity Bug Audit - Correct Formula: planned_quantity - produced_quantity
        const remainingToProduce = Math.max(
          0,
          mo.planned_quantity - mo.produced_quantity,
        );
        if (remainingToProduce <= 0) continue;

        const existingOps = await (tx.manufacturingWorkOrder as any).findMany({
          where: { company_id, manufacturing_order_id: mo.id },
          orderBy: { sequence: 'asc' },
        });

        const routingOps = [] as any;
        let previousOpEndTime: Date | null = null;

        for (const rop of routingOps) {
          const wcId = rop.work_center_id;
          const wc = wcMap.get(wcId);
          if (!wc) continue;

          // Task 2: Duration Verification - Correct Formula: setup_minutes + remaining_quantity * standard_minutes
          const requiredMinutes =
            rop.setup_minutes + remainingToProduce * rop.standard_minutes;

          let existingOp = existingOps.find(
            (o: any) => o.sequence === rop.sequence,
          );

          if (!existingOp) {
            existingOp = await (tx.manufacturingWorkOrder as any).create({
              data: {
                company_id,
                manufacturing_order_id: mo.id,
                work_center_id: wcId,
                reference: `${mo.order_number}-OP${rop.sequence}`,
                operation_name: rop.operation_name,
                sequence: rop.sequence,
                status: 'PENDING',
                planned_duration_minutes: requiredMinutes,
              },
            });
          }

          let desiredStart = new Date(now.getTime());
          if (previousOpEndTime && previousOpEndTime > desiredStart) {
            desiredStart = new Date(previousOpEndTime.getTime());
          }

          // Find slot that prevents overlap & respects shifts
          const { start: plannedStart, end: plannedEnd } =
            this.findNextAvailableSlot(
              wcBookings.get(wcId),
              desiredStart,
              requiredMinutes,
              wc,
            );

          await (tx.manufacturingWorkOrder as any).update({
            where: { id: existingOp.id },
            data: {
              started_at: plannedStart,
              completed_at: plannedEnd,
              planned_duration_minutes: requiredMinutes,
            },
          });

          // Add to memory bookings for subsequent loops
          wcBookings.get(wcId).push({
            started_at: plannedStart,
            completed_at: plannedEnd,
          });

          previousOpEndTime = new Date(plannedEnd.getTime());

          scheduledWorkload.push({
            manufacturing_order: mo.order_number,
            operation: rop.operation_name,
            work_center_id: wcId,
            started_at: plannedStart,
            completed_at: plannedEnd,
            duration: requiredMinutes,
          });
        }
      }
    });

    return {
      message: 'Schedule generated successfully',
      scheduled_workload: scheduledWorkload,
      bottlenecks,
    };
  }
}
