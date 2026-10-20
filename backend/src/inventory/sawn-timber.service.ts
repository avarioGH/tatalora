import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { AuditService } from '../core/audit.service';

@Injectable()
export class SawnTimberService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: InventoryLedgerService,
    private audit: AuditService,
  ) {}

  async listOutputs(params: {
    skip?: number;
    take?: number;
    search?: string;
    locationId?: string;
    status?: string;
    partaiId?: string;
  }) {
    const { skip = 0, take = 50, search, locationId, status, partaiId } = params;
    const where: any = {};
    if (partaiId !== undefined) {
      where.partaiId = partaiId;
    }
    if (search) {
      where.OR = [
        { bundleNumber: { contains: search, mode: 'insensitive' } },
        { batch: { contains: search, mode: 'insensitive' } },
        {
          inputLog: { inputNumber: { contains: search, mode: 'insensitive' } },
        },
      ];
    }
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.sawnTimberOutput.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          location: true,
          inputLog: true,
          partai: true,
          items: { include: { timberVariant: true } },
        },
      }),
      this.prisma.sawnTimberOutput.count({ where }),
    ]);
    return { items, total, skip: Number(skip), take: Number(take) };
  }

  async getOutput(id: string) {
    if (!id || id === 'undefined' || id.length !== 24)
      throw new NotFoundException('Output not found');
    const output = await this.prisma.sawnTimberOutput.findUnique({
      where: { id },
      include: {
        location: true,
        inputLog: {
          include: {
            items: { include: { trimmedLog: { include: { rawLog: true } } } },
          },
        },
        items: { include: { timberVariant: true } },
      },
    });
    if (!output) throw new NotFoundException('Output not found');
    return output;
  }

  private normalizeDimensions(t: number, w: number, l: number) {
    if (t <= 0 || w <= 0 || l <= 0)
      throw new BadRequestException('Dimensions must be positive');
    return `${t} \u00d7 ${w} \u00d7 ${l}`;
  }

  async getOrCreateTimberVariant(
    companyId: string,
    species: string,
    grade: string,
    thickness: number,
    width: number,
    length: number,
    speciesId?: string,
    gradeId?: string,
  ) {
    if (!gradeId && grade !== 'PENDING') {
      throw new BadRequestException(
        'gradeId is strictly required to create or get a TimberVariant (except for PENDING grade)',
      );
    }
    let actualSpecies = species;
    let actualGrade = grade;

    if (speciesId) {
      const sp = await this.prisma.timberSpecies.findUnique({
        where: { id: speciesId },
      });
      if (sp) actualSpecies = sp.code;
    }
    if (gradeId) {
      const gr = await this.prisma.timberGrade.findFirst({
        where: { id: gradeId },
      });
      if (!gr)
        throw new BadRequestException('TimberGrade not found');
      actualGrade = gr.code || gr.name || 'STANDARD';
    }

    const sizeStr = this.normalizeDimensions(thickness, width, length);
    const sku = `${actualSpecies.toUpperCase()}-${actualGrade.toUpperCase()}-${sizeStr}`;
    const volumePerPiece = (thickness * width * length) / 1000000000;

    let variant = await this.prisma.timberVariant.findUnique({
      where: { sku },
    });
    if (!variant) {
      let product = await this.prisma.product.findFirst({
        where: { company_id: companyId, code: actualSpecies },
      });

      if (!product) {
        // Auto create master product
        let unit = await this.prisma.unit.findFirst({
          where: { company_id: companyId, name: 'M3' },
        });
        if (!unit) {
          unit = await this.prisma.unit.create({
            data: { company_id: companyId, name: 'M3' },
          });
        }
        product = await this.prisma.product.create({
          data: {
            company_id: companyId,
            unit_id: unit.id,
            code: actualSpecies,
            barcode: `KAYU-${actualSpecies.toUpperCase()}-${Date.now().toString().slice(-6)}`,
            name: `Kayu ${actualSpecies}`,
            purchase_price: 0,
            selling_price: 0,
          },
        });
      }

      variant = await this.prisma.timberVariant.create({
        data: {
          productId: product.id,
          company_id: companyId,
          species: actualSpecies,
          grade: actualGrade,
          speciesId: speciesId || null,
          gradeId: gradeId || null,
          thickness,
          width,
          length,
          sku,
          barcode: `V-${sku}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          volumePerPiece,
        },
      });
    }
    return variant;
  }

  async createOutput(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const {
        inputLogId,
        outputDate,
        shift,
        operatorName,
        machine,
        locationId,
        batch,
        notes,
        items,
        partaiId,
      } = data;

      if (!items || items.length === 0)
        throw new BadRequestException('Output must contain at least one item');
      if (!inputLogId || !/^[a-f\d]{24}$/i.test(inputLogId))
        throw new BadRequestException('Invalid input log ID');
      if (!locationId || !/^[a-f\d]{24}$/i.test(locationId))
        throw new BadRequestException('Warehouse (locationId) is required');

      const inputLog = await tx.inputLog.findUnique({
        where: { id: inputLogId },
        
      });
      if (!inputLog) throw new NotFoundException('Input log not found');
      if (inputLog.status !== 'AVAILABLE' && inputLog.status !== 'IN_PROCESS') {
        throw new BadRequestException(
          'Input log is not available for production',
        );
      }

      // Resolve company_id: from inputLog.location or from the provided warehouse
      let companyId: string | null | undefined = null;
      if (!companyId) {
        const warehouse = await tx.warehouse.findUnique({
          where: { id: locationId },
        });
        companyId = warehouse?.company_id;
      }
      if (!companyId)
        throw new BadRequestException(
          'Cannot determine company from warehouse',
        );

      const dateObj = outputDate ? new Date(outputDate) : new Date();
      const YY = String(dateObj.getFullYear()).slice(2);
      const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
      const machineStr = inputLog.machine || '1';

      const count = await tx.sawnTimberOutput.count({
        where: {
          bundleNumber: { startsWith: `O-MSAW-${machineStr}-${YY}-${MM}` },
        },
      });
      const seq = String(count + 1).padStart(3, '0');
      const bundleNumber = `O-MSAW-${machineStr}-${YY}-${MM}-${seq}`;

      const output = await tx.sawnTimberOutput.create({
        data: {
          partaiId,
          bundleNumber,
          outputDate: dateObj,
          shift,
          operatorName,
          machine: machine || inputLog.machine,
          locationId,
          inputLogId,
          batch,
          notes,
          status: 'DRAFT',
        },
      });

      for (const item of items) {
        if (!item.gradeId && item.grade !== 'PENDING') {
          throw new BadRequestException(
            'Grade ID is required for all output items (except PENDING)',
          );
        }
        // The grade string will be authoritatively determined inside getOrCreateTimberVariant using gradeId
        const variant = await this.getOrCreateTimberVariant(
          companyId,
          inputLog.species,
          item.grade || '',
          Number(item.thickness),
          Number(item.width),
          Number(item.length),
          (inputLog as any).speciesId,
          item.gradeId,
        );
        const volumeM3 = variant.volumePerPiece * item.quantityPcs;

        await tx.sawnTimberOutputItem.create({
          data: {
            outputId: output.id,
            timberVariantId: variant.id,
            grade: variant.grade,
            productType: item.productType || 'BALOK',
            quantityPcs: item.quantityPcs,
            thicknessMm: Number(item.thickness),
            widthMm: Number(item.width),
            lengthMm: Number(item.length),
            volumeM3,
          } as any,
        });
      }

      await tx.inputLog.update({
        where: { id: inputLog.id },
        data: { status: 'IN_PROCESS' },
      });

      return output;
    });
  }

  async postOutput(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const output = await tx.sawnTimberOutput.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!output) throw new NotFoundException('Output not found');
      if (output.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT outputs can be posted');

      await tx.sawnTimberOutput.update({
        where: { id },
        data: { status: 'POSTED' },
      });

      for (const item of output.items) {
        await this.ledgerService.createMovement(
          tx as any,
          output.locationId,
          item.timberVariantId,
          'IN',
          'PRODUCTION_OUTPUT',
          output.id,
          item.quantityPcs,
          item.volumeM3,
          output.batch || 'UNKNOWN',
        );
      }

      return output;
    });
  }

  async cancelOutput(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const output = await tx.sawnTimberOutput.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!output) throw new NotFoundException('Output not found');
      if (output.status === 'CANCELLED')
        throw new BadRequestException('Output already cancelled');

      if (output.status === 'POSTED') {
        for (const item of output.items) {
          await this.ledgerService.createMovement(
            tx as any,
            output.locationId,
            item.timberVariantId,
            'OUT',
            'REVERSAL',
            output.id,
            item.quantityPcs,
            item.volumeM3,
            output.batch || 'UNKNOWN',
          );
        }
      }

      await tx.sawnTimberOutput.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return output;
    });
  }

  async listStock(params: {
    skip?: number;
    take?: number;
    search?: string;
    locationId?: string;
    locationCodePrefix?: string;
  }) {
    const {
      skip = 0,
      take = 50,
      search,
      locationId,
      locationCodePrefix,
    } = params;
    const where: any = {};
    if (search) {
      where.timberVariant = { sku: { contains: search, mode: 'insensitive' } };
    }
    if (locationId) where.locationId = locationId;
    if (locationCodePrefix) {
      where.location = { code: { startsWith: locationCodePrefix } };
    }

    const [items, total] = await Promise.all([
      this.prisma.timberStock.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        include: { location: true, timberVariant: true },
        orderBy: { timberVariant: { sku: 'asc' } },
      }),
      this.prisma.timberStock.count({ where }),
    ]);
    return { items, total, skip: Number(skip), take: Number(take) };
  }
  async updateOutput(id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const output = await tx.sawnTimberOutput.findUnique({ 
        where: { id }, 
        include: { items: true, inputLog: true } 
      });
      if (!output) throw new NotFoundException('Output not found');
      if (output.status !== 'DRAFT') throw new BadRequestException('Can only edit DRAFT outputs. Please cancel first.');

      const location = await tx.warehouse.findUnique({ where: { id: output.locationId } });
      const updateData: any = {};
      if (data.outputDate) updateData.outputDate = new Date(data.outputDate);
      if (data.date) updateData.date = new Date(data.date);
      if (data.shift) updateData.shift = data.shift;
      if (data.notes) updateData.notes = data.notes;

      if (data.items && Array.isArray(data.items)) {
        await tx.sawnTimberOutputItem.deleteMany({ where: { outputId: id } });
        
        let totalPcs = 0;
        let totalM3 = 0;

        for (const item of data.items) {
          const variant = await this.getOrCreateTimberVariant(
            location?.company_id || '',
            output.inputLog?.species || 'Unknown',
            item.grade || 'PENDING',
            Number(item.thickness),
            Number(item.width),
            Number(item.length),
            undefined, undefined
          );
          const volumeM3 = variant.volumePerPiece * item.quantityPcs;
          totalPcs += item.quantityPcs;
          totalM3 += volumeM3;

          await tx.sawnTimberOutputItem.create({
            data: {
              outputId: id,
              timberVariantId: variant.id,
              grade: variant.grade,
              productType: item.productType || 'BALOK',
              quantityPcs: item.quantityPcs,
              thicknessMm: Number(item.thickness),
              widthMm: Number(item.width),
              lengthMm: Number(item.length),
              volumeM3: volumeM3,
            } as any,
          });
        }
        updateData.totalQty = totalPcs;
        updateData.totalVolume = totalM3;
      }

      const result = await tx.sawnTimberOutput.update({
        where: { id },
        data: updateData,
        include: { items: true }
      });
      return result;
    });
  }

  async deleteOutput(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const output = await tx.sawnTimberOutput.findUnique({ where: { id } });
      if (!output) throw new NotFoundException('Output not found');
      if (output.status === 'POSTED') throw new BadRequestException('Cannot delete POSTED outputs. Cancel it first.');
      
      await tx.sawnTimberOutputItem.deleteMany({ where: { outputId: id } });
      await tx.sawnTimberOutput.delete({ where: { id } });
      return { success: true };
    });
  }

  async updateItemGrade(
    outputId: string,
    itemId: string,
    data: { gradeId: string; grade: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const output = await tx.sawnTimberOutput.findUnique({
        where: { id: outputId },
        include: { items: { include: { timberVariant: true } } },
      });
      if (!output) throw new NotFoundException('Output not found');

      const item = output.items.find((i: any) => i.id === itemId);
      if (!item) throw new NotFoundException('Item not found');
      if (item.grade === data.grade) return item;

      // Ensure we get companyId
      const location = await tx.warehouse.findUnique({
        where: { id: output.locationId },
      });
      if (!location?.company_id)
        throw new BadRequestException('Cannot determine company');

      // Create or get the new variant. We call getOrCreateTimberVariant but we must do it transactionally if possible.
      // Wait, getOrCreateTimberVariant in this service uses 	his.prisma, not 	x.
      // It's safe to just call it (it reads/writes variants, not output items).
      const newVariant = await this.getOrCreateTimberVariant(
          location.company_id,
          item.timberVariant.species,
          data.grade,
          item.thicknessMm,
          item.widthMm,
          item.lengthMm,
          item.timberVariant.speciesId || undefined,
          data.gradeId,
        );

        if (output.status === 'POSTED') {
           // Move out of old variant
           await this.ledgerService.createMovement(
             tx as any,
             output.locationId,
             item.timberVariantId,
             'ADJ',
             'ADJUSTMENT_OUT',
             output.id,
             item.quantityPcs,
             item.volumeM3,
             output.batch || 'UNKNOWN'
           );
           // Move into new variant
           await this.ledgerService.createMovement(
             tx as any,
             output.locationId,
             newVariant.id,
             'IN',
             'ADJUSTMENT_IN',
             output.id,
             item.quantityPcs,
             item.volumeM3,
             output.batch || 'UNKNOWN'
           );
        }
  
        return tx.sawnTimberOutputItem.update({
          where: { id: itemId },
          data: { grade: data.grade, timberVariantId: newVariant.id },
        });
      });
  }
}
