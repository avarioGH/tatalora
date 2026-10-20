import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportShipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.exportShipment.findMany({
      where: { company_id: companyId },
      include: { items: true },
      orderBy: [
        { exportDate: 'desc' },
        { createdAt: 'desc' }
      ],
    });
  }

  async findOne(id: string, companyId: string) {
    return this.prisma.exportShipment.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });
  }

  async create(companyId: string, dto: any) {
    return this.prisma.exportShipment.create({
      data: {
        company_id: companyId,
        containerNo: dto.containerNo,
        sealNo: dto.sealNo,
        vehicleNo: dto.vehicleNo,
        exportDate: new Date(dto.exportDate),
        items: {
          create: dto.items.map((i) => ({
            groupName: i.groupName,
            productName: i.productName,
            qtyKg: parseFloat(i.qtyKg) || 0,
            qtyMc: parseInt(i.qtyMc) || 0,
            qtySak: parseInt(i.qtySak) || 0,
          })),
        },
      },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.prisma.exportShipmentItem.deleteMany({
      where: { exportId: id },
    });

    return this.prisma.exportShipment.update({
      where: { id },
      data: {
        containerNo: dto.containerNo,
        sealNo: dto.sealNo,
        vehicleNo: dto.vehicleNo,
        exportDate: new Date(dto.exportDate),
        items: {
          create: dto.items.map((i) => ({
            groupName: i.groupName,
            productName: i.productName,
            qtyKg: parseFloat(i.qtyKg) || 0,
            qtyMc: parseInt(i.qtyMc) || 0,
            qtySak: parseInt(i.qtySak) || 0,
          })),
        },
      },
    });
  }

  async delete(id: string, companyId: string) {
    return this.prisma.exportShipment.delete({
      where: { id },
    });
  }
}
