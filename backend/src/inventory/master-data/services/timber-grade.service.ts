import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateTimberGradeDto,
  UpdateTimberGradeDto,
} from '../dto/master-data.dto';

@Injectable()
export class TimberGradeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.timberGrade.findMany({ where: { company_id } });
  }

  async findOne(id: string, company_id: string) {
    const item = await this.prisma.timberGrade.findUnique({
      where: { id, company_id },
    });
    if (!item) throw new NotFoundException('TimberGrade not found');
    return item;
  }

  async create(data: CreateTimberGradeDto) {
    return this.prisma.timberGrade.create({ data: data as any });
  }

  async update(id: string, data: any, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.timberGrade.update({
      where: { id, company_id },
      data,
    });
  }

  async updateStatus(id: string, isActive: boolean, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.timberGrade.update({
      where: { id, company_id },
      data: { isActive },
    });
  }
}
