import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateTimberSourceDto,
  UpdateTimberSourceDto,
} from '../dto/master-data.dto';

@Injectable()
export class TimberSourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.timberSource.findMany({ where: { company_id } });
  }

  async findOne(id: string, company_id: string) {
    const item = await this.prisma.timberSource.findUnique({
      where: { id, company_id },
    });
    if (!item) throw new NotFoundException('TimberSource not found');
    return item;
  }

  async create(data: CreateTimberSourceDto) {
    return this.prisma.timberSource.create({ data: data as any });
  }

  async update(id: string, data: any, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.timberSource.update({
      where: { id, company_id },
      data,
    });
  }

  async updateStatus(id: string, isActive: boolean, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.timberSource.update({
      where: { id, company_id },
      data: { isActive },
    });
  }
}
