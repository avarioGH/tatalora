import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BomService {
  private readonly logger = new Logger(BomService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBom(data: any) {
    this.logger.log(`Creating BOM for product ${data.product_id}`);
    return this.prisma.bom.create({
      data: {
        company_id: data.company_id,
        product_id: data.product_id,
        code: data.code,
        name: data.name,
        quantity: data.quantity,
        unit_id: data.unit_id,
        status: data.status || 'DRAFT',
        items: {
          create:
            data.items?.map((item: any) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_id: item.unit_id,
            })) || [],
        },
      },
    });
  }

  async getBoms(company_id: string) {
    return this.prisma.bom.findMany({
      where: { company_id },
      include: {
        items: true,
      },
    });
  }
}
