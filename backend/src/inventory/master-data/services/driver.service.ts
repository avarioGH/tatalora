import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from '../dto/master-data.dto';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.driver.findMany({ where: { company_id } });
  }

  async findOne(id: string, company_id: string) {
    const item = await this.prisma.driver.findUnique({
      where: { id, company_id },
    });
    if (!item) throw new NotFoundException('Driver not found');
    return item;
  }

  async create(data: CreateDriverDto) {
    return this.prisma.driver.create({ data: data as any });
  }

  async update(id: string, data: any, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.driver.update({
      where: { id, company_id },
      data,
    });
  }

  async updateStatus(id: string, isActive: boolean, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.driver.update({
      where: { id, company_id },
      data: { isActive },
    });
  }
}
