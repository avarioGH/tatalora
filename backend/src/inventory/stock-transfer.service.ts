import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { AuditService } from '../core/audit.service';

@Injectable()
export class StockTransferService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: InventoryLedgerService,
    private audit: AuditService,
  ) {}

  async listTransfers(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
    fromLocationId?: string;
    toLocationId?: string;
    startDate?: string;
    endDate?: string;
    fromLocationCodePrefix?: string;
    toLocationCodePrefix?: string;
  }) {
    const {
      skip = 0,
      take = 50,
      search,
      status,
      fromLocationId,
      toLocationId,
      startDate,
      endDate,
      fromLocationCodePrefix,
      toLocationCodePrefix,
    } = params;
    const where: any = {};
    if (search)
      where.transferNumber = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;
    if (fromLocationId) where.fromLocationId = fromLocationId;
    if (toLocationId) where.toLocationId = toLocationId;

    if (startDate || endDate) {
      where.transferDate = {};
      if (startDate) where.transferDate.gte = new Date(startDate);
      if (endDate) where.transferDate.lte = new Date(endDate);
    }

    if (fromLocationCodePrefix || toLocationCodePrefix) {
      if (fromLocationCodePrefix && toLocationCodePrefix) {
        where.OR = [
          { fromLocation: { code: { startsWith: fromLocationCodePrefix } } },
          { toLocation: { code: { startsWith: toLocationCodePrefix } } },
        ];
      } else if (fromLocationCodePrefix) {
        where.fromLocation = { code: { startsWith: fromLocationCodePrefix } };
      } else if (toLocationCodePrefix) {
        where.toLocation = { code: { startsWith: toLocationCodePrefix } };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        skip: Number(skip),
        take: Number(take),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          fromLocation: true,
          toLocation: true,
          items: { include: { timberVariant: true } },
        },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);
    return { items, total, skip: Number(skip), take: Number(take) };
  }

  async getTransfer(id: string) {
    const t = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromLocation: true,
        toLocation: true,
        items: { include: { timberVariant: true } },
      },
    });
    if (!t) throw new NotFoundException('Transfer not found');
    return t;
  }

  async createTransfer(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const {
        transferDate,
        fromLocationId,
        toLocationId,
        notes,
        items,
        createdBy,
      } = data;

      if (!items || items.length === 0)
        throw new BadRequestException('Transfer must contain items');
      if (fromLocationId === toLocationId)
        throw new BadRequestException(
          'Source and destination cannot be the same',
        );

      const dateObj = transferDate ? new Date(transferDate) : new Date();
      const YY = String(dateObj.getFullYear()).slice(2);
      const MM = String(dateObj.getMonth() + 1).padStart(2, '0');

      const count = await tx.stockTransfer.count({
        where: { transferNumber: { startsWith: `TRF-${YY}${MM}` } },
      });
      const seq = String(count + 1).padStart(4, '0');
      const transferNumber = `TRF-${YY}${MM}-${seq}`;

      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          transferDate: dateObj,
          fromLocationId,
          toLocationId,
          notes,
          createdBy,
          status: 'DRAFT',
        },
      });

      for (const item of items) {
        await tx.stockTransferItem.create({
          data: {
            transferId: transfer.id,
            timberVariantId: item.timberVariantId,
            quantityPcs: item.quantityPcs,
            volumeM3: item.volumeM3,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'STOCK_TRANSFER',
          entity_id: transfer.id,
          after_data: { status: transfer.status },
        },
      });
      return transfer;
    });
  }

  async postTransfer(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundException('Transfer not found');
      if (transfer.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT transfers can be posted');

      await tx.stockTransfer.update({
        where: { id },
        data: { status: 'POSTED' },
      });

      for (const item of transfer.items) {
        // 1. OUT from source
        await this.ledgerService.createMovement(
          tx as any,
          transfer.fromLocationId,
          item.timberVariantId,
          'OUT',
          'TRANSFER_OUT',
          transfer.id,
          item.quantityPcs,
          item.volumeM3,
          item.batch,
        );
        // 2. IN to destination
        await this.ledgerService.createMovement(
          tx as any,
          transfer.toLocationId,
          item.timberVariantId,
          'IN',
          'TRANSFER_IN',
          transfer.id,
          item.quantityPcs,
          item.volumeM3,
          item.batch,
        );
      }

      await tx.auditLog.create({
        data: {
          action: 'POST',
          entity: 'STOCK_TRANSFER',
          entity_id: id,
          before_data: { status: 'DRAFT' },
          after_data: { status: 'POSTED' },
        },
      });
      return transfer;
    });
  }

  async cancelTransfer(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundException('Transfer not found');
      if (transfer.status === 'CANCELLED')
        throw new BadRequestException('Already cancelled');

      if (transfer.status === 'POSTED') {
        for (const item of transfer.items) {
          // Reverse IN from destination (OUT)
          await this.ledgerService.createMovement(
            tx as any,
            transfer.toLocationId,
            item.timberVariantId,
            'OUT',
            'REVERSAL',
            transfer.id,
            item.quantityPcs,
            item.volumeM3,
          );
          // Reverse OUT from source (IN)
          await this.ledgerService.createMovement(
            tx as any,
            transfer.fromLocationId,
            item.timberVariantId,
            'IN',
            'REVERSAL',
            transfer.id,
            item.quantityPcs,
            item.volumeM3,
          );
        }
      }

      await tx.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      await tx.auditLog.create({
        data: {
          action: 'CANCEL',
          entity: 'STOCK_TRANSFER',
          entity_id: id,
          before_data: { status: transfer.status },
          after_data: { status: 'CANCELLED' },
        },
      });
      return transfer;
    });
  }
}
