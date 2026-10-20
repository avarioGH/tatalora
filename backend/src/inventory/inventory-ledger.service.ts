import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type MovementType = 'IN' | 'OUT' | 'ADJ';
export type ReferenceType =
  | 'OPENING_BALANCE'
  | 'PRODUCTION_PROCESS_INPUT'
  | 'PRODUCTION_PROCESS_OUTPUT'
  | 'PRODUCTION_PROCESS_REVERSAL'
  | 'PRODUCTION_OUTPUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'REVERSAL'
  | 'SALES_DELIVERY'
  | 'TIMBER_PURCHASE'
  | 'TIMBER_PURCHASE_REVERSAL'
  | 'TIMBER_SHIPMENT'
  | 'TIMBER_SHIPMENT_REVERSAL'
  | 'STOCK_OPNAME_ADJUSTMENT';

@Injectable()
export class InventoryLedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Centralized method for all stock mutations.
   * MUST be executed inside an existing Prisma transaction.
   */
  async createMovement(
    tx: Prisma.TransactionClient,
    locationId: string,
    timberVariantId: string,
    type: MovementType,
    referenceType: ReferenceType,
    referenceId: string,
    quantityPcs: number,
    volumeM3: number,
    batch: string = 'UNKNOWN',
  ) {
    if (quantityPcs <= 0 || volumeM3 <= 0) {
      throw new BadRequestException('Quantity and volume must be positive');
    }

    // Determine if this is a stock-decreasing movement
    const isDecreasing =
      type === 'OUT' ||
      (type === 'ADJ' &&
        (referenceType === 'ADJUSTMENT_OUT' || referenceType === 'REVERSAL'));

    // RESERVATION GUARD (Centralized)
    if (isDecreasing) {
      const stocks = await tx.timberStock.findMany({
        where: { locationId, timberVariantId },
      });
      const currentPhysical = stocks.reduce(
        (sum: number, s: any) => sum + s.currentPcs,
        0,
      );

      const reservations = await (tx as any).timberStockReservation.findMany({
        where: { locationId, timberVariantId },
      });
      const totalReserved = reservations.reduce(
        (sum: number, r: any) => sum + (r.reservedPcs || 0),
        0,
      );

      const available = currentPhysical - totalReserved;
      if (quantityPcs > available) {
        throw new BadRequestException(
          `Physical stock cannot be reduced below reserved quantity. Physical: ${currentPhysical}, Reserved: ${totalReserved}, Requested reduction: ${quantityPcs}`,
        );
      }
    }

    // 1. Get or create stock with row-level locking equivalent
    let stock = await tx.timberStock.findUnique({
      where: {
        locationId_timberVariantId_batch: {
          locationId,
          timberVariantId,
          batch,
        },
      },
    });

    if (!stock) {
      if (isDecreasing) {
        throw new BadRequestException(
          'Insufficient stock (No stock record exists)',
        );
      }
      stock = await tx.timberStock.create({
        data: {
          locationId,
          timberVariantId,
          batch,
          currentPcs: 0,
          currentVolumeM3: 0,
        },
      });
    }

    // 2. Create immutable movement
    const movement = await tx.timberStockMovement.create({
      data: {
        timberStockId: stock.id,
        batch,
        type,
        referenceType,
        referenceId,
        quantityPcs,
        volumeM3,
      },
    });

    // 3. Increment/Decrement Cache Atomically
    const updateData: any = {};
    if (type === 'IN' || (type === 'ADJ' && !isDecreasing)) {
      if (type === 'IN') updateData.stockInPcs = { increment: quantityPcs };
      if (type === 'ADJ') updateData.adjustmentPcs = { increment: quantityPcs };
      updateData.currentPcs = { increment: quantityPcs };
      updateData.currentVolumeM3 = { increment: volumeM3 };
    } else if (isDecreasing) {
      if (type === 'OUT') updateData.stockOutPcs = { increment: quantityPcs };
      if (type === 'ADJ') updateData.adjustmentPcs = { decrement: quantityPcs }; // Net negative adjustment
      updateData.currentPcs = { decrement: quantityPcs };
      updateData.currentVolumeM3 = { decrement: volumeM3 };
    }

    let whereCondition: any = { id: stock.id };
    if (isDecreasing) {
      whereCondition.currentPcs = { gte: quantityPcs };
    }

    const updateResult = await tx.timberStock.updateMany({
      where: whereCondition,
      data: updateData,
    });

    if (updateResult.count === 0) {
      if (isDecreasing) {
        throw new BadRequestException(
          `Insufficient stock or concurrent modification for variant ${timberVariantId}. Required: ${quantityPcs}`,
        );
      } else {
        throw new BadRequestException(
          'Failed to update stock due to concurrent modification',
        );
      }
    }

    return movement;
  }
}
