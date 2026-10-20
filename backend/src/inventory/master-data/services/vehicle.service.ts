import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/master-data.dto';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.vehicle.findMany({ where: { company_id } });
  }

  async findOne(id: string, company_id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, company_id },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return vehicle;
  }

  async create(data: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: data as any });
  }

  async update(
    id: string,
    data: Partial<UpdateVehicleDto>,
    company_id: string,
  ) {
    await this.findOne(id, company_id);
    return this.prisma.vehicle.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, isActive: boolean, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { isActive },
    });
  }
}
