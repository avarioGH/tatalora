import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventory/master-data/timber-variant')
export class TimberVariantController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.prisma.timberVariant.findMany({
      where: { company_id: req.user.companyId },
      include: { product: true },
    });
  }

  @Post()
  async create(@Request() req: any, @Body() data: any) {
    let productId = data.productId;

    if (!productId) {
      let genericProduct = await this.prisma.product.findFirst({
        where: { name: 'SAWN TIMBER', company_id: req.user.companyId },
      });
      if (!genericProduct) {
        // We need a default unit
        let defaultUnit = await this.prisma.unit.findFirst({
          where: { company_id: req.user.companyId },
        });
        if (!defaultUnit) {
          defaultUnit = await this.prisma.unit.create({
            data: { company_id: req.user.companyId, name: 'Pieces' },
          });
        }

        genericProduct = await this.prisma.product.create({
          data: {
            name: 'SAWN TIMBER',
            company_id: req.user.companyId,

            unit_id: defaultUnit.id,
            code: 'SAWN-TIMBER',
            barcode: `GENERIC-SAWN-${Date.now()}`,
            purchase_price: 0,
            selling_price: 0,
          },
        });
      }
      productId = genericProduct.id;
    }

    const volume =
      ((data.thickness || 0) * (data.width || 0) * (data.length || 0)) /
      1000000000;

    // Auto-generate SKU if not provided
    const sku =
      data.sku ||
      `${data.species || 'MIX'}-${data.grade || 'PENDING'}-${data.thickness || 0}x${data.width || 0}x${data.length || 0}`;

    return this.prisma.timberVariant.create({
      data: {
        company_id: req.user.companyId,
        productId: productId,
        species: data.species || 'UNKNOWN',
        grade: data.grade || 'PENDING',
        thickness: Number(data.thickness || 0),
        width: Number(data.width || 0),
        length: Number(data.length || 0),
        volumePerPiece: volume,
        sku: sku,
      },
    });
  }
}
