import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryLedgerService } from '../inventory-ledger.service';

@Injectable()
export class OpnameService {
  constructor(
    private prisma: PrismaService,
    private ledger: InventoryLedgerService,
  ) {}

  async createDraft(warehouseId: string, userId?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const stocks = await this.prisma.timberStock.findMany({
      where: { locationId: warehouseId },
      include: { timberVariant: true },
    });

    return this.prisma.timberStockOpname.create({
      data: {
        company_id: warehouse.company_id,
        opnameNumber: `OPN-${Date.now()}`,
        warehouseId,
        status: 'DRAFT',
        createdBy: userId,
        items: {
          create: stocks.map((stock) => ({
            timberVariantId: stock.timberVariantId,
            batch: stock.batch,
            systemQuantityPcs: stock.currentPcs,
            systemVolumeM3: stock.currentVolumeM3,
            physicalQuantityPcs: 0,
            physicalVolumeM3: 0,
            varianceQuantityPcs: -stock.currentPcs,
            varianceVolumeM3: -stock.currentVolumeM3,
          })),
        },
      },
      include: { items: true },
    });
  }

  async updateCounts(
    id: string,
    items: {
      itemId: string;
      physicalQuantityPcs: number;
      physicalVolumeM3: number;
    }[],
  ) {
    const opname = await this.prisma.timberStockOpname.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!opname || opname.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT opnames can be updated');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const input of items) {
        const item = opname.items.find((i) => i.id === input.itemId);
        if (!item) continue;

        const varianceQuantityPcs =
          input.physicalQuantityPcs - item.systemQuantityPcs;
        const varianceVolumeM3 = input.physicalVolumeM3 - item.systemVolumeM3;

        await tx.timberStockOpnameItem.update({
          where: { id: input.itemId },
          data: {
            physicalQuantityPcs: input.physicalQuantityPcs,
            physicalVolumeM3: input.physicalVolumeM3,
            varianceQuantityPcs,
            varianceVolumeM3,
          },
        });
      }
      return tx.timberStockOpname.findUnique({
        where: { id },
        include: { items: true },
      });
    });
  }

  async confirmOpname(id: string, userId?: string) {
    const opname = await this.prisma.timberStockOpname.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!opname) throw new NotFoundException('Opname not found');
    if (opname.status !== 'DRAFT')
      throw new BadRequestException('Can only confirm DRAFT opnames');

    return this.prisma.$transaction(async (tx) => {
      for (const item of opname.items) {
        if (item.varianceQuantityPcs === 0 && item.varianceVolumeM3 === 0)
          continue;

        const type =
          item.varianceQuantityPcs > 0 || item.varianceVolumeM3 > 0
            ? 'IN'
            : 'OUT';

        // Ledger service throws if <= 0
        const q = Math.abs(item.varianceQuantityPcs);
        const v = Math.abs(item.varianceVolumeM3);

        if (q > 0 && v > 0) {
          await this.ledger.createMovement(
            tx,
            opname.warehouseId,
            item.timberVariantId,
            type,
            'STOCK_OPNAME_ADJUSTMENT',
            opname.id,
            q,
            v,
            item.batch,
          );
        }
      }
      return tx.timberStockOpname.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedBy: userId,
          confirmedAt: new Date(),
        },
        include: { items: true },
      });
    });
  }

  async cancelOpname(id: string) {
    const opname = await this.prisma.timberStockOpname.findUnique({
      where: { id },
    });
    if (!opname) throw new NotFoundException('Opname not found');

    if (opname.status === 'CONFIRMED') {
      throw new BadRequestException(
        'Confirmed opnames cannot be cancelled. Please create a new opname to correct the variance.',
      );
    }

    return this.prisma.timberStockOpname.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async reconcile() {
    const stocks = await this.prisma.timberStock.findMany();
    const discrepancies: any[] = [];

    for (const stock of stocks) {
      const movements = await this.prisma.timberStockMovement.findMany({
        where: { timberStockId: stock.id },
      });

      let ledgerPcs = 0;

      for (const mov of movements) {
        if (mov.type === 'IN') {
          ledgerPcs += mov.quantityPcs;
        } else if (mov.type === 'OUT') {
          ledgerPcs -= mov.quantityPcs;
        }
      }

      const diff = stock.currentPcs - ledgerPcs;

      if (diff !== 0) {
        discrepancies.push({
          stockId: stock.id,
          variant: stock.timberVariantId,
          systemPcs: stock.currentPcs,
          ledgerPcs,
          diff,
        });
      }
    }

    return discrepancies;
  }
}
