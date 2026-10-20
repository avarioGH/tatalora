import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PeriodService {
  constructor(private prisma: PrismaService) {}

  async createPeriod(companyId: string, data: any) {
    const existing = await this.prisma.accountingPeriod.findFirst({
      where: {
        company_id: companyId,
        OR: [
          {
            start_date: { lte: data.endDate },
            end_date: { gte: data.startDate },
          },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'PERIOD_OVERLAP: A period overlapping these dates already exists.',
      );
    }

    return (this.prisma.accountingPeriod as any).create({
      data: {
        company_id: companyId,
        name: data.name,
        month: data.month,
        year: data.year,
        start_date: data.startDate,
        end_date: data.endDate,
        status: 'OPEN',
      },
    });
  }

  async getPeriods(companyId: string) {
    return (this.prisma.accountingPeriod as any).findMany({
      where: { company_id: companyId },
      orderBy: { start_date: 'desc' },
      include: { closer: { select: { name: true } } },
    });
  }

  async closePeriod(companyId: string, periodId: string, userId: string) {
    const period = await this.prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period || period.company_id !== companyId) {
      throw new NotFoundException('Period not found');
    }

    if (period.status !== 'OPEN') {
      throw new BadRequestException('Only OPEN periods can be closed');
    }

    return (this.prisma.accountingPeriod as any).updateMany({
      where: { id: periodId, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
        closed_by: userId,
      },
    });
  }

  async lockPeriod(companyId: string, periodId: string, userId: string) {
    const period = await this.prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period || period.company_id !== companyId) {
      throw new NotFoundException('Period not found');
    }

    if (period.status !== 'CLOSED') {
      throw new BadRequestException('Only CLOSED periods can be locked');
    }

    return (this.prisma.accountingPeriod as any).updateMany({
      where: { id: periodId, status: 'CLOSED' },
      data: {
        status: 'LOCKED',
      },
    });
  }
}
