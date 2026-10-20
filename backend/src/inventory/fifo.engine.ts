import { Prisma } from '@prisma/client';

export interface FifoConsumptionResult {
  layer_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export async function createFifoLayer(
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    unitCost: number;
    stockMovementId: string;
    lotId?: string;
  },
) {
  if (data.quantity <= 0) return null;
  if (data.unitCost < 0)
    throw new Error('INVALID_INVENTORY_COST: Unit cost cannot be negative.');

  const layer = await tx.inventoryCostLayer.create({
    data: {
      company_id: data.companyId,
      product_id: data.productId,
      warehouse_id: data.warehouseId,
      quantity: data.quantity,
      unit_cost: data.unitCost,
      remaining_quantity: data.quantity,
      source_movement_id: data.stockMovementId,
      lot_id: data.lotId,
    },
  });

  return layer;
}

export async function consumeFifoLayers(
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    stockMovementId: string;
  },
): Promise<{ consumed: FifoConsumptionResult[]; totalCogs: number }> {
  if (data.quantity <= 0)
    throw new Error(
      'INVALID_FIFO_QUANTITY: Quantity must be greater than zero.',
    );

  const layers = await tx.inventoryCostLayer.findMany({
    where: {
      company_id: data.companyId,
      product_id: data.productId,
      warehouse_id: data.warehouseId,
      remaining_quantity: { gt: 0 },
    },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
  });

  let remainingToConsume = data.quantity;
  let totalCogs = 0;
  const consumed: FifoConsumptionResult[] = [];

  for (const layer of layers) {
    if (remainingToConsume <= 0) break;

    const remQty = Number(layer.remaining_quantity);
    const unitCost = Number(layer.unit_cost);
    const qtyToTake = Math.min(remQty, remainingToConsume);
    const costForTake = qtyToTake * unitCost;

    const updateRes = await tx.inventoryCostLayer.updateMany({
      where: {
        id: layer.id,
        remaining_quantity: layer.remaining_quantity,
      },
      data: {
        remaining_quantity: { decrement: qtyToTake },
      },
    });

    if (updateRes.count === 0) {
      throw new Error(
        'FIFO_CONCURRENCY_ERROR: Layer was modified by another transaction.',
      );
    }

    await tx.costLayerConsumption.create({
      data: {
        company_id: data.companyId,
        layer_id: layer.id,
        stock_movement_id: data.stockMovementId,
        quantity: qtyToTake,
        unit_cost: layer.unit_cost,
        total_cost: costForTake,
      },
    });

    consumed.push({
      layer_id: layer.id,
      quantity: qtyToTake,
      unit_cost: unitCost,
      total_cost: costForTake,
    });

    totalCogs += costForTake;
    remainingToConsume -= qtyToTake;
  }

  if (remainingToConsume > 0.0001) {
    throw new Error(
      `INSUFFICIENT_INVENTORY_COST_LAYER: Inventory quantity exists but historical cost layers are insufficient for this quantity (short by ${remainingToConsume}). Inventory valuation reconciliation is required before this transaction can be posted.`,
    );
  }

  return { consumed, totalCogs };
}

export async function transferFifoLayers(
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    productId: string;
    sourceWarehouseId: string;
    destWarehouseId: string;
    quantity: number;
    sourceMovementId: string;
    destMovementId: string;
  },
) {
  const { consumed, totalCogs } = await consumeFifoLayers(tx, {
    companyId: data.companyId,
    productId: data.productId,
    warehouseId: data.sourceWarehouseId,
    quantity: data.quantity,
    stockMovementId: data.sourceMovementId,
  });

  for (const c of consumed) {
    await createFifoLayer(tx, {
      companyId: data.companyId,
      productId: data.productId,
      warehouseId: data.destWarehouseId,
      quantity: c.quantity,
      unitCost: c.unit_cost,
      stockMovementId: data.destMovementId,
    });
  }

  return { consumed, totalCogs };
}
