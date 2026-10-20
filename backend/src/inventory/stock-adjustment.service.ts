import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../core/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLedgerService } from './inventory-ledger.service';

@Injectable()
export class StockAdjustmentService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: InventoryLedgerService,
    private audit: AuditService,
  ) {}

  async listAdjustments(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
  }) {
    const { skip = 0, take = 50, search, status } = params;
    const where: any = {};
    if (search)
      where.adjustmentNumber = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          location: true,
          items: { include: { timberVariant: true } },
        },
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);
    return { items, total, skip: Number(skip), take: Number(take) };
  }

  async getAdjustment(id: string) {
    const t = await this.prisma.stockAdjustment.findUnique({
      where: { id },
      include: { location: true, items: { include: { timberVariant: true } } },
    });
    if (!t) throw new NotFoundException('Adjustment not found');
    return t;
  }

  async createAdjustment(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const { adjustmentDate, locationId, reason, notes, items, createdBy } =
        data;

      if (!items || items.length === 0)
        throw new BadRequestException('Must contain items');

      const dateObj = adjustmentDate ? new Date(adjustmentDate) : new Date();
      const YY = String(dateObj.getFullYear()).slice(2);
      const MM = String(dateObj.getMonth() + 1).padStart(2, '0');

      const count = await tx.stockAdjustment.count({
        where: { adjustmentNumber: { startsWith: `ADJ-${YY}${MM}` } },
      });
      const seq = String(count + 1).padStart(4, '0');
      const adjustmentNumber = `ADJ-${YY}${MM}-${seq}`;

      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          adjustmentDate: dateObj,
          locationId,
          reason,
          notes,
          createdBy,
          status: 'DRAFT',
        },
      });

      for (const item of items) {
        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: adjustment.id,
            timberVariantId: item.timberVariantId,
            systemPcs: item.systemPcs,
            physicalPcs: item.physicalPcs,
            differencePcs: item.differencePcs,
            differenceM3: item.differenceM3,
            notes: item.notes,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'STOCK_ADJUSTMENT',
          entity_id: adjustment.id,
          after_data: { status: adjustment.status },
        },
      });
      return adjustment;
    });
  }

  async postAdjustment(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!adjustment) throw new NotFoundException('Adjustment not found');
      if (adjustment.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT adjustments can be posted');

      await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'POSTED' },
      });

      for (const item of adjustment.items) {
        if (item.differencePcs > 0) {
          await this.ledgerService.createMovement(
            tx as any,
            adjustment.locationId,
            item.timberVariantId,
            'ADJ',
            'ADJUSTMENT_IN',
            adjustment.id,
            item.differencePcs,
            item.differenceM3,
            item.batch,
          );
        } else if (item.differencePcs < 0) {
          await this.ledgerService.createMovement(
            tx as any,
            adjustment.locationId,
            item.timberVariantId,
            'ADJ',
            'ADJUSTMENT_OUT',
            adjustment.id,
            Math.abs(item.differencePcs),
            Math.abs(item.differenceM3),
            item.batch,
          );
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'POST',
          entity: 'STOCK_ADJUSTMENT',
          entity_id: id,
          before_data: { status: 'DRAFT' },
          after_data: { status: 'POSTED' },
        },
      });
      return adjustment;
    });
  }

  async cancelAdjustment(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!adjustment) throw new NotFoundException('Adjustment not found');
      if (adjustment.status === 'CANCELLED')
        throw new BadRequestException('Already cancelled');

      if (adjustment.status === 'POSTED') {
        for (const item of adjustment.items) {
          if (item.differencePcs > 0) {
            await this.ledgerService.createMovement(
              tx as any,
              adjustment.locationId,
              item.timberVariantId,
              'ADJ', // Technically it's an OUT reversal of an IN adjustment
              'ADJUSTMENT_OUT',
              adjustment.id,
              item.differencePcs,
              item.differenceM3,
              item.batch,
            );
          } else if (item.differencePcs < 0) {
            await this.ledgerService.createMovement(
              tx as any,
              adjustment.locationId,
              item.timberVariantId,
              'ADJ', // IN reversal of an OUT adjustment
              'ADJUSTMENT_IN',
              adjustment.id,
              Math.abs(item.differencePcs),
              Math.abs(item.differenceM3),
              item.batch,
            );
          }
        }
      }

      await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      await tx.auditLog.create({
        data: {
          action: 'CANCEL',
          entity: 'STOCK_ADJUSTMENT',
          entity_id: id,
          before_data: { status: adjustment.status },
          after_data: { status: 'CANCELLED' },
        },
      });
      return adjustment;
    });
  }
}
