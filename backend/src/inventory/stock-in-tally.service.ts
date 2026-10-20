import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../reports/sequence.service';

@Injectable()
export class StockInTallyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
  ) {}

  async create(company_id: string, user_id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      if (data.idempotency_key) {
        const existing = await tx.stockInTally.findFirst({
          where: { company_id, idempotency_key: data.idempotency_key },
        });
        if (existing)
          throw new ConflictException(
            'Transaction with this idempotency key already exists.',
          );
      }

      const tallyNumber = await this.sequenceService.generateNumber(
        tx,
        company_id,
        'TALLY',
        'TLY',
      );

      const tally = await tx.stockInTally.create({
        data: {
          company_id,
          idempotency_key:
            data.idempotency_key ||
            `TLY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          tally_number: tallyNumber,
          tally_date: new Date(data.tally_date),
          warehouse_id: data.warehouse_id,
          notes: data.notes,
          status: 'POSTED',
          items: {
            create: data.items.map((item: any) => ({
              product_id: item.product_id,
              qty: Number(item.qty),
            })),
          },
        },
        include: { items: true },
      });

      // Update Stock
      for (const item of tally.items) {
        // StockMovement
        const mov = await tx.stockMovement.create({
          data: {
            company_id,
            warehouse_id: tally.warehouse_id,
            product_id: item.product_id,
            transaction_type: 'IN',
            movement_type: 'IN',
            transaction_id: tally.id,
            qty_in: item.qty,
            created_by: user_id,
          },
        });

        // Update item with movement_id
        await tx.stockInTallyItem.update({
          where: { id: item.id },
          data: { movement_id: mov.id },
        });

        // Update WarehouseStock
        const whStock = await tx.warehouseStock.findFirst({
          where: {
            company_id,
            warehouse_id: tally.warehouse_id,
            product_id: item.product_id,
          },
        });

        if (whStock) {
          await tx.warehouseStock.update({
            where: { id: whStock.id },
            data: {
              current_stock: whStock.current_stock + item.qty,
              available_stock: whStock.available_stock + item.qty,
            },
          });
        } else {
          await tx.warehouseStock.create({
            data: {
              company_id,
              warehouse_id: tally.warehouse_id,
              product_id: item.product_id,
              current_stock: item.qty,
              available_stock: item.qty,
            },
          });
        }
      }

      return tally;
    });
  }

  async findAll(company_id: string) {
    return this.prisma.stockInTally.findMany({
      where: { company_id, status: { not: 'CANCELLED' } },
      include: {
        warehouse: true,
        items: { include: { product: true } },
      },
      orderBy: { tally_date: 'desc' },
    });
  }

  async remove(company_id: string, user_id: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const tally = await tx.stockInTally.findUnique({
        where: { id, company_id },
        include: { items: true },
      });
      if (!tally) throw new NotFoundException('Tally not found');
      if (tally.status === 'CANCELLED')
        throw new ConflictException('Tally already cancelled');

      // Reverse stock
      for (const item of tally.items) {
        if (item.movement_id) {
          // Instead of delete, create REVERSAL
          await tx.stockMovement.create({
            data: {
              company_id,
              warehouse_id: tally.warehouse_id,
              product_id: item.product_id,
              transaction_type: 'REVERSAL',
              movement_type: 'OUT',
              transaction_id: tally.id, // Original transaction reference
              qty_out: item.qty,
              created_by: user_id,
            },
          });
        }

        const whStock = await tx.warehouseStock.findFirst({
          where: {
            company_id,
            warehouse_id: tally.warehouse_id,
            product_id: item.product_id,
          },
        });
        if (whStock) {
          await tx.warehouseStock.update({
            where: { id: whStock.id },
            data: {
              current_stock: whStock.current_stock - item.qty,
              available_stock: whStock.available_stock - item.qty,
            },
          });
        }
      }

      await tx.stockInTally.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return { success: true };
    });
  }
}
