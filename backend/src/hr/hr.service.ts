import { NotificationService } from '../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PayrollPostedEvent,
  PayrollPaymentEvent,
} from '../events/accounting.events';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrService {

  async getPerformanceReport(companyId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        company_id: companyId,
        date: { gte: startDate, lt: endDate }
      },
      include: { employee: true }
    });

    const reportMap = new Map();

    attendances.forEach(att => {
      if (!reportMap.has(att.employee_id)) {
        reportMap.set(att.employee_id, {
          employee_id: att.employee_id,
          employee_name: att.employee?.first_name + ' ' + (att.employee?.last_name || ''),
          employee_code: att.employee?.employee_code,
          total_present: 0,
          total_late_minutes: 0,
          total_overtime_minutes: 0,
          late_count: 0
        });
      }

      const stats = reportMap.get(att.employee_id);
      
      if (att.status === 'PRESENT' || att.status === 'LATE') {
         stats.total_present += 1;
      }
      
      if (att.late_minutes && att.late_minutes > 0) {
        stats.total_late_minutes += att.late_minutes;
        stats.late_count += 1;
      }
      
      if (att.overtime_minutes && att.overtime_minutes > 0) {
        stats.total_overtime_minutes += att.overtime_minutes;
      }
    });

    return Array.from(reportMap.values());
  }


  // --- SHIFT MANAGEMENT ---
  async getShifts(companyId: string) {
    return this.prisma.shift.findMany({
      where: { company_id: companyId }
    });
  }

  async createShift(data: any) {
    return this.prisma.shift.create({
      data: {
        company_id: data.company_id,
        code: data.code,
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time,
        grace_period_minutes: parseInt(data.grace_period_minutes) || 15
      }
    });
  }

  async updateShift(id: string, data: any) {
    return this.prisma.shift.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time,
        grace_period_minutes: parseInt(data.grace_period_minutes) || 15
      }
    });
  }

  async deleteShift(id: string) {
    return this.prisma.shift.delete({ where: { id } });
  }

  async setEmployeeShift(employeeId: string, shiftId: string) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { default_shift_id: shiftId || null }
    });
  }


  // --- ATTENDANCE (CLOCK IN / OUT) ---
  async clockIn(data: any) {
    const { employeeId, time, notes, companyId } = data;
    const checkInTime = new Date(time);
    
    // Check if after 08:00
    const hours = checkInTime.getHours();
    const minutes = checkInTime.getMinutes();
    let status = 'PRESENT';
    if (hours > 8 || (hours === 8 && minutes > 0)) {
      status = 'LATE';
    }

    return this.prisma.attendance.create({
      data: {
        company_id: companyId,
        employee_id: employeeId,
        date: checkInTime,
        status: status,
        check_in: checkInTime,
        notes: notes || '',
      }
    });
  }

  async clockOut(data: any) {
    const { attendanceId, time, notes } = data;
    const checkOutTime = new Date(time);

    const att = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { shift: true }
    });

    let overtimeMins = 0;
    if (att && att.shift && att.shift.end_time) {
      const [h, m] = att.shift.end_time.split(':');
      const shiftEndHour = parseInt(h);
      const shiftEndMin = parseInt(m);
      
      const checkOutHour = checkOutTime.getHours();
      const checkOutMin = checkOutTime.getMinutes();
      
      const checkOutTotalMins = checkOutHour * 60 + checkOutMin;
      const shiftEndTotalMins = shiftEndHour * 60 + shiftEndMin;
      
      // Simplified: if checkOut is later than shift end (assuming same day)
      // For overnight shifts, this requires date difference handling. 
      // A quick fix for same-day shifts:
      if (checkOutTotalMins > shiftEndTotalMins) {
        overtimeMins = checkOutTotalMins - shiftEndTotalMins;
      }
      
      // If check_in is on previous day, or check_out is on next day (overnight)
      if (att.check_in && checkOutTime.getDate() !== att.check_in.getDate()) {
        const diffInMs = checkOutTime.getTime() - att.check_in.getTime();
        const diffInMins = Math.floor(diffInMs / 60000);
        // Calculate expected duration based on shift start and end
        let expectedDuration = shiftEndTotalMins - (parseInt(att.shift.start_time.split(':')[0]) * 60 + parseInt(att.shift.start_time.split(':')[1]));
        if (expectedDuration < 0) expectedDuration += 24 * 60; // overnight shift
        
        if (diffInMins > expectedDuration) {
          overtimeMins = diffInMins - expectedDuration;
        }
      }
    } else {
       // Default 17:00 end time if no shift
       const checkOutHour = checkOutTime.getHours();
       const checkOutMin = checkOutTime.getMinutes();
       const checkOutTotalMins = checkOutHour * 60 + checkOutMin;
       if (checkOutTotalMins > 17 * 60) {
         overtimeMins = checkOutTotalMins - (17 * 60);
       }
    }

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        check_out: checkOutTime,
        notes: notes,
        overtime_minutes: overtimeMins,
      }
    });
  }

  async getCalendar(employeeId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this.prisma.attendance.findMany({
      where: {
        employee_id: employeeId,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
  }

  // --- PAYROLL ---
  async generatePayroll(companyId: string, period: string) {
    // period format: "YYYY-MM"
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const employees = await this.prisma.employee.findMany({
      where: { company_id: companyId, status: 'ACTIVE' },
      include: {
        attendances: {
          where: {
            date: { gte: startDate, lt: endDate }
          }
        }
      }
    });

    const results: any[] = [];
    for (const emp of employees) {
      let lateCount = 0;
      let absentCount = 0;
      let presentCount = 0;

      for (const att of emp.attendances) {
        if (att.status === 'LATE') lateCount++;
        else if (att.status === 'ABSENT') absentCount++;
        else if (att.status === 'PRESENT') presentCount++;
      }

      // Base generation logic
      // In a real system, you'd calculate daily rate based on 22 working days or similar
      // Here we just use basic_salary directly and maybe deduct for absence/lates.
      
      const basicSalary = emp.basic_salary || 0;
      
      // We can assume denda telat = 50.000, absen = 100.000 for example, or 0 if not needed yet.
      const deductionLate = lateCount * 50000;
      const deductionAbsent = absentCount * 100000;
      const totalDeduction = deductionLate + deductionAbsent;
      
      const netPay = basicSalary - totalDeduction;

      // Ensure payroll for this period doesn't exist yet
      let existing = await this.prisma.payroll.findFirst({
        where: { employee_id: emp.id, period: period }
      });

      if (!existing) {
        const payroll = await this.prisma.payroll.create({
          data: {
            company_id: companyId,
            employee_id: emp.id,
            period: period,
            basic_salary: basicSalary,
            total_allowance: 0,
            total_deduction: totalDeduction,
            net_salary: netPay > 0 ? netPay : 0,
            status: 'DRAFT'
          }
        });

        if (deductionLate > 0) {
          await this.prisma.payrollItem.create({
            data: {
              payroll_id: payroll.id,
              type: 'DEDUCTION',
              name: `Potongan Keterlambatan (${lateCount}x)`,
              amount: deductionLate
            }
          });
        }
        if (deductionAbsent > 0) {
          await this.prisma.payrollItem.create({
            data: {
              payroll_id: payroll.id,
              type: 'DEDUCTION',
              name: `Potongan Absen (${absentCount}x)`,
              amount: deductionAbsent
            }
          });
        }

        results.push(payroll);
      }
    }

    return results;
  }

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Departments
  async getDepartments(companyId: string) {
    return this.prisma.department.findMany({
      where: { company_id: companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async createDepartment(data: any) {
    return this.prisma.department.create({
      data: {
        company_id: data.companyId,
        name: data.name,
        description: data.description,
      },
    });
  }

  // Employees
  async getEmployees(companyId: string) {
    return this.prisma.employee.findMany({
      where: { company_id: companyId },
      include: { department: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createEmployee(data: any) {
    return this.prisma.employee.create({
      data: {
        company_id: data.companyId,
        department_id: data.departmentId,
        employee_code: data.employeeCode || 'EMP-' + Date.now(),
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        position: data.position,
        status: data.status || 'ACTIVE',
        basic_salary: data.basicSalary ? Number(data.basicSalary) : 0,
        join_date: new Date(),
      },
    });
  }

  async deleteEmployee(companyId: string, id: string) {
    return this.prisma.employee.delete({ where: { id, company_id: companyId } });
  }

  async updateEmployee(companyId: string, id: string, data: any) {
    return this.prisma.employee.update({
      where: { id, company_id: companyId },
      data: {
        department_id: data.departmentId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        position: data.position,
        status: data.status,
        basic_salary: data.basicSalary ? Number(data.basicSalary) : undefined,
      },
    });
  }

  async registerBiometric(
    companyId: string,
    employeeId: string,
    rightThumb: string,
    leftThumb: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, company_id: companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        fingerprint_right_thumb: rightThumb,
        fingerprint_left_thumb: leftThumb,
      },
    });
  }

  // Leaves
  async getLeaves(companyId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { company_id: companyId },
      include: { employee: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createLeave(data: any) {
    return this.prisma.leaveRequest.create({
      data: {
        company_id: data.companyId,
        employee_id: data.employeeId,
        leave_type: data.leaveType,
        start_date: new Date(data.startDate),
        end_date: new Date(data.endDate),
        reason: data.reason,
        status: 'SUBMITTED',
      },
    });
  }

  async approveLeave(companyId: string, id: string) {
    return this.prisma.leaveRequest.update({
      where: { id, company_id: companyId },
      data: { status: 'APPROVED' },
    });
  }

  async rejectLeave(companyId: string, id: string) {
    return this.prisma.leaveRequest.update({
      where: { id, company_id: companyId },
      data: { status: 'REJECTED' },
    });
  }

  // Attendance
  async getAttendances(companyId: string) {
    return this.prisma.attendance.findMany({
      where: { employee: { company_id: companyId } },
      include: { employee: true },
      orderBy: { date: 'desc' },
    });
  }

  async createAttendance(data: any) {
    const _att = await this.prisma.attendance.create({
      data: {
        company_id: data.companyId,
        employee_id: data.employeeId,
        date: new Date(data.date),
        status: data.status,
        check_in: data.checkIn ? new Date(data.checkIn) : null,
        check_out: data.checkOut ? new Date(data.checkOut) : null,
        notes: data.notes,
      },
    });
  }

  async clockAttendance(
    companyId: string,
    data: { employee_code: string; timestamp?: string },
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { company_id: companyId, employee_code: data.employee_code },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const clockTime = data.timestamp ? new Date(data.timestamp) : new Date();
    const todayStr = clockTime.toISOString().split('T')[0];
    const startDate = new Date(todayStr + 'T00:00:00.000Z');
    const endDate = new Date(todayStr + 'T23:59:59.999Z');

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        employee_id: employee.id,
        date: { gte: startDate, lte: endDate },
      },
    });

    if (existingAttendance) {
      if (existingAttendance.check_out)
        throw new BadRequestException('Already checked out for today');
      if (clockTime <= (existingAttendance.check_in || clockTime)) {
        throw new BadRequestException('Check-out must be after check-in');
      }
      return this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: { check_out: clockTime, status: 'PRESENT' },
      });
    } else {
      return this.prisma.attendance.create({
        data: {
          company_id: companyId,
          employee_id: employee.id,
          date: clockTime,
          status: 'PRESENT',
          check_in: clockTime,
        },
      });
    }
  }

  // Payroll
  async getPayrolls(companyId: string) {
    return this.prisma.payroll.findMany({
      where: { company_id: companyId },
      include: { employee: true, items: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async calculatePayroll(
    companyId: string,
    employeeId: string,
    period: string,
    txClient?: any,
  ) {
    const run = async (tx: any) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId, company_id: companyId },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      if (employee.status === 'TERMINATED')
        throw new BadRequestException(
          'Cannot calculate payroll for terminated employee',
        );

      // Check if Draft payroll already exists
      let payroll = await tx.payroll.findFirst({
        where: {
          company_id: companyId,
          employee_id: employeeId,
          period: period,
        },
      });

      if (payroll && payroll.status !== 'DRAFT') {
        throw new BadRequestException(
          'Payroll already calculated/approved for this period',
        );
      }

      // Cleanup existing draft items
      if (payroll) {
        await tx.payrollItem.deleteMany({ where: { payroll_id: payroll.id } });
      }

      // Base Calculation logic
      const basicSalary = employee.basic_salary || 0;
      let totalDeduction = 0;
      const items: any[] = [];

      // 1. Calculate absences
      // For simplicity, we just count absent days in the DB for that period.
      // E.g. period = "2026-09"
      const absents = await tx.attendance.count({
        where: {
          employee_id: employeeId,
          status: 'ABSENT',
          date: {
            gte: new Date(period + '-01T00:00:00.000Z'),
            lt: new Date(
              new Date(period + '-01T00:00:00.000Z').setMonth(
                new Date(period + '-01T00:00:00.000Z').getMonth() + 1,
              ),
            ),
          },
        },
      });

      if (absents > 0) {
        const dailyDeduction = basicSalary / 22; // Assuming 22 working days
        const deductionAmount = dailyDeduction * absents;
        totalDeduction += deductionAmount;
        items.push({
          type: 'DEDUCTION',
          name: 'Absent Deduction',
          amount: deductionAmount,
        });
      }

      if (!payroll) {
        payroll = await tx.payroll.create({
          data: {
            company_id: companyId,
            employee_id: employeeId,
            period: period,
            basic_salary: basicSalary,
            total_allowance: 0,
            total_deduction: totalDeduction,
            net_salary: basicSalary - totalDeduction,
            status: 'CALCULATED',
          },
        });
      } else {
        payroll = await tx.payroll.update({
          where: { id: payroll.id },
          data: {
            basic_salary: basicSalary,
            total_allowance: 0,
            total_deduction: totalDeduction,
            net_salary: basicSalary - totalDeduction,
            status: 'CALCULATED',
          },
        });
      }

      if (items.length > 0) {
        await tx.payrollItem.createMany({
          data: items.map((i) => ({ ...i, payroll_id: payroll!.id })),
        });
      }

      return tx.payroll.findUnique({
        where: { id: payroll.id },
        include: { items: true },
      });
    };
    return txClient ? run(txClient) : this.prisma.$transaction(run);
  }

  async approvePayroll(companyId: string, id: string) {
    const p = await this.prisma.payroll.findFirst({
      where: { id, company_id: companyId },
    });
    if (!p) throw new NotFoundException('Payroll not found');
    if (p.status !== 'CALCULATED')
      throw new BadRequestException('Can only approve CALCULATED payroll');
    return this.prisma.payroll.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async postPayroll(companyId: string, id: string, txClient?: any) {
    const run = async (tx: any) => {
      const p = await tx.payroll.findFirst({
        where: { id, company_id: companyId },
        include: { employee: true },
      });
      if (!p) throw new NotFoundException('Payroll not found');
      if (p.status !== 'APPROVED')
        throw new BadRequestException('Can only post APPROVED payroll');

      // FinanceTransaction is deferred to payPayroll. Only accounting liability via event here.
      const updatedRes = await tx.payroll.updateMany({
        where: { id, status: 'APPROVED' },
        data: { status: 'POSTED' },
      });
      if (updatedRes.count === 0) {
        throw new BadRequestException(
          'Concurrency conflict or Payroll is no longer APPROVED',
        );
      }
      const updated = await tx.payroll.findUnique({ where: { id } });
      await this.eventEmitter.emitAsync(
        'payroll.posted',
        new PayrollPostedEvent(
          companyId,
          p.id,
          'EVT-' + Date.now(),
          new Date(),
          { netSalary: p.net_salary, period: p.period },
          tx as any,
        ),
      );
      return updated;
    };
    return txClient ? run(txClient) : this.prisma.$transaction(run);
  }

  async payPayroll(companyId: string, id: string, txClient?: any) {
    const run = async (tx: any) => {
      const p = await tx.payroll.findFirst({
        where: { id, company_id: companyId },
      });
      if (!p) throw new NotFoundException('Payroll not found');
      if (p.status !== 'POSTED')
        throw new BadRequestException('Can only pay POSTED payroll');

      // Enforce zero or negative protection
      if (p.net_salary < 0)
        throw new BadRequestException('Net salary cannot be negative');

      const account = await tx.cashAccount.findFirst({
        where: { company_id: companyId },
      });
      if (!account)
        throw new BadRequestException(
          'No default cash account mapped for company',
        );

      // Create actual Cash Out transaction
      const f = await tx.financeTransaction.create({
        data: {
          company_id: companyId,
          cash_account_id: account.id,
          transaction_no: 'PAY-' + Date.now(),
          transaction_type: 'Cash Out',
          transaction_date: new Date(),
          total_amount: p.net_salary,
          reference_type: 'PAYROLL_PAYMENT',
          reference_id: p.id,
          description: 'Payroll Payment for ' + p.period,

          status: 'COMPLETED',
          created_by: (await tx.user.findFirst({
            where: { company_id: companyId },
          }))!.id,
        },
      });

      const updated = await tx.payroll.update({
        where: { id },
        data: { status: 'PAID', paid_date: new Date() },
      });
      await this.eventEmitter.emitAsync(
        'payroll.payment',
        new PayrollPaymentEvent(
          companyId,
          p.id,
          'EVT-' + Date.now(),
          new Date(),
          { amount: p.net_salary },
          tx as any,
        ),
      );
      return updated;
    };
    return txClient ? run(txClient) : this.prisma.$transaction(run);
  }
}
