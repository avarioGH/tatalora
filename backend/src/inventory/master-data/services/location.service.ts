import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from '../dto/master-data.dto';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(company_id: string) {
    return this.prisma.location.findMany({
      where: { warehouse: { company_id } },
      include: { warehouse: true },
    });
  }

  async findOne(id: string, company_id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, warehouse: { company_id } },
      include: { warehouse: true },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async create(data: CreateLocationDto) {
    const createData = { ...data };
    delete createData.company_id; // not in model
    return this.prisma.location.create({ data: createData as any });
  }

  async update(
    id: string,
    data: Partial<UpdateLocationDto>,
    company_id: string,
  ) {
    await this.findOne(id, company_id);
    const updateData = { ...data };
    delete updateData.company_id;
    return this.prisma.location.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, isActive: boolean, company_id: string) {
    await this.findOne(id, company_id);
    return this.prisma.location.update({
      where: { id },
      data: { isActive },
    });
  }
}
