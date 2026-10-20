import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateTimberSpeciesDto,
  UpdateTimberSpeciesDto,
} from '../dto/master-data.dto';

@Injectable()
export class TimberSpeciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.timberSpecies.findMany({ where: { company_id } });
  }

  async findOne(id: string, company_id: string) {
    const item = await this.prisma.timberSpecies.findUnique({
      where: { id, company_id },
    });
    if (!item) throw new NotFoundException('TimberSpecies not found');
    return item;
  }

  async create(data: CreateTimberSpeciesDto) {
    return this.prisma.timberSpecies.create({ data: data as any });
  }

  async update(id: string, data: any, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.timberSpecies.update({
      where: { id, company_id },
      data,
    });
  }

  async updateStatus(id: string, isActive: boolean, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.timberSpecies.update({
      where: { id, company_id },
      data: { isActive },
    });
  }
}
