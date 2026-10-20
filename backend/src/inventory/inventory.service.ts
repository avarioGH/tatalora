import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryValuationEvent } from '../events/accounting.events';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  createFifoLayer,
  consumeFifoLayers,
  transferFifoLayers,
} from './fifo.engine';
import { Prisma } from '@prisma/client';
import { SequenceService } from '../reports/sequence.service';

export interface TransactionItemDto {
  productId: string;
  qty: number;
  unitCost: number;
  batchNumber?: string;
  expiredDate?: Date;
  notes?: string;
}

export interface CreateInboundDto {
  companyId: string;
  warehouseId: string;
  transactionNo: string;
  transactionDate: Date;
  notes?: string;
  userId: string;
  items: TransactionItemDto[];
}

export interface CreateOutboundDto {
  companyId: string;
  warehouseId: string;
  transactionNo: string;
  transactionDate: Date;
  notes?: string;
  userId: string;
  items: TransactionItemDto[];
}

export interface CreateTransferDto {
  companyId: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  transactionNo: string;
  transactionDate: Date;
  notes?: string;
  userId: string;
  items: TransactionItemDto[];
}

export interface CreateAdjustmentDto {
  companyId: string;
  warehouseId: string;
  transactionNo: string;
  transactionDate: Date;
  notes?: string;
  userId: string;
  items: (TransactionItemDto & { adjustmentType: 'IN' | 'OUT' })[];
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private sequenceService: SequenceService,
  ) {}

  async getCategories(companyId: string) {
    return this.prisma.category.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createCategory(data: any) {
    return this.prisma.category.create({
      data: {
        company_id: data.companyId,
        name: data.name,
      },
    });
  }

  async updateCategory(companyId: string, id: string, data: any) {
    const existing = await this.prisma.category.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
      },
    });
  }

  async deleteCategory(companyId: string, id: string) {
    const existing = await this.prisma.category.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Category not found');
    const products = await this.prisma.product.count({
      where: { category_id: id },
    });
    if (products > 0) {
      throw new Error(
        'Kategori tidak dapat dihapus karena sedang digunakan oleh produk.',
      );
    }
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async getProducts(companyId: string) {
    return this.prisma.product.findMany({
      where: { company_id: companyId, status: true },
        include: {
        category: true,
        unit: true,
        brand: true,
        warehouse_stocks: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getWarehouses(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateWarehouse(companyId: string, id: string, data: any) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Warehouse not found');
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        address: data.location || data.address,
      },
    });
  }

  async deleteWarehouse(companyId: string, id: string) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Warehouse not found');

    const rawLogs = await this.prisma.rawLog.count({
      where: { locationId: id },
    });
    if (rawLogs > 0)
      throw new BadRequestException(
        'Gudang tidak dapat dihapus karena masih berisi data Raw Log.',
      );

    const trimLogs = await this.prisma.trimmedLog.count({
      where: { locationId: id },
    });
    if (trimLogs > 0)
      throw new BadRequestException(
        'Gudang tidak dapat dihapus karena masih berisi data Trimmed Log.',
      );

    const inputLogs = await this.prisma.inputLog.count({
      where: { locationId: id },
    });
    if (inputLogs > 0)
      throw new BadRequestException(
        'Gudang tidak dapat dihapus karena masih berisi data Input Log.',
      );

    const sawnOut = await this.prisma.sawnTimberOutput.count({
      where: { locationId: id },
    });
    if (sawnOut > 0)
      throw new BadRequestException(
        'Gudang tidak dapat dihapus karena masih berisi Sawn Timber Output.',
      );

    const txs = await this.prisma.inventoryTransaction.count({
      where: { OR: [{ warehouse_id: id }, { target_warehouse_id: id }] },
    });
    if (txs > 0)
      throw new BadRequestException(
        'Gudang tidak dapat dihapus karena sudah memiliki riwayat Transaksi Inventori.',
      );

    const movs = await this.prisma.stockMovement.count({
      where: { warehouse_id: id },
    });
    if (movs > 0)
      throw new BadRequestException(
        'Gudang tidak dapat dihapus karena sudah memiliki riwayat Pergerakan Stok.',
      );

    const timberStock = await this.prisma.timberStock.count({
      where: { locationId: id },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.userWarehouseAccess.deleteMany({ where: { warehouse_id: id } });
      await tx.warehouseStock.deleteMany({ where: { warehouse_id: id } });
      if (timberStock > 0) {
        await tx.timberStock.deleteMany({ where: { locationId: id } });
      }
      return tx.warehouse.delete({ where: { id } }).catch((e) => {
        throw new BadRequestException(
          'Gagal menghapus gudang karena masih ada data yang terikat.',
        );
      });
    });
  }

  async getTransactions(companyId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { company_id: companyId },
        include: {
        warehouse: true,
        target_warehouse: true,
        items: { include: { product: true } },
      },
      orderBy: { transaction_date: 'desc' },
    });
  }

  async getWarehouseStocks(companyId: string, warehouseId?: string) {
    const where: any = { company_id: companyId };
    if (warehouseId) where.warehouse_id = warehouseId;
    return this.prisma.warehouseStock.findMany({
      where,
      include: { warehouse: true, product: true },
    });
  }

  
  async updateProduct(companyId: string, id: string, data: any) {
    const product = await this.prisma.product.findFirst({
      where: { id, company_id: companyId }
    });
    if (!product) throw new Error('Product not found');

    const updateData: any = {
      name: data.name,
      description: data.description,
      barcode: data.barcode,
      purchase_price: data.purchasePrice ? Number(data.purchasePrice) : 0,
      selling_price: data.sellingPrice ? Number(data.sellingPrice) : 0,
      minimum_stock: data.minStock ? Number(data.minStock) : 0,
      weight: data.weight ? Number(data.weight) : undefined,
    };

    if (data.isActive !== undefined) {
      updateData.status = data.isActive === 'true' || data.isActive === true;
    } else {
      updateData.status = true; // Default to true if not provided, or better: just don't touch it. 
      // Actually if they are editing a soft-deleted product maybe they want to restore it?
      // Let's just remove it so we don't accidentally delete. Wait, if it's undefined, we just delete updateData.status so it doesn't override.
    }
    
    // Actually, I'll just delete status if it's undefined.
    if (data.isActive === undefined) {
      delete updateData.status;
    }

    if (data.categoryId) updateData.category_id = data.categoryId;
    if (data.brandId) updateData.brand_id = data.brandId;
    if (data.unitId) updateData.unit_id = data.unitId;

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData
    });

    if (data.images && data.images.length > 0) {
      await this.prisma.productImage.createMany({
        data: data.images.map((url: string) => ({
          product_id: product.id,
          image_url: url
        }))
      });
    }
    return updated;
  }

  async deleteProduct(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, company_id: companyId }
    });
    if (!product) throw new Error('Product not found');

    try {
      // First delete images
      await this.prisma.productImage.deleteMany({
        where: { product_id: id }
      });

      // Then delete the product
      return await this.prisma.product.delete({
        where: { id }
      });
    } catch (error: any) {
      if (error.code === 'P2003' || error.code === 'P2014' || error.message?.includes('Foreign key')) {
        // Fallback to soft-delete (status: false)
        return await this.prisma.product.update({
          where: { id },
          data: { status: false }
        });
      }
      throw error;
    }
  }

  async createProduct(data: any) {
    // We need a unit to create a product. Let's find or create a default 'PCS' unit.
    let unit = await this.prisma.unit.findFirst({
      where: { company_id: data.companyId, name: 'PCS' },
    });
    if (!unit) {
      unit = await this.prisma.unit.create({
        data: { company_id: data.companyId, name: 'PCS' },
      });
    }

    const productCode =
      data.code &&
      data.code !== 'undefined' &&
      data.code !== 'null' &&
      data.code !== ''
        ? data.code
        : await this.sequenceService.generateNumber(
            this.prisma as any,
            data.companyId,
            'PRODUCT',
            'PRD',
          );

    const product = await this.prisma.product.create({
      data: {
        company_id: data.companyId,
        code: productCode,
        barcode:
          data.barcode &&
          data.barcode !== 'undefined' &&
          data.barcode !== 'null' &&
          data.barcode !== ''
            ? data.barcode
            : 'NOBARCODE-' + productCode + '-' + Date.now(),
        name: data.name,
        description: data.description,
        purchase_price: !isNaN(Number(data.purchasePrice))
          ? Number(data.purchasePrice)
          : 0,
        selling_price: !isNaN(Number(data.sellingPrice))
          ? Number(data.sellingPrice)
          : 0,
        weight:
          data.weight &&
          data.weight !== 'undefined' &&
          data.weight !== 'null' &&
          data.weight !== ''
            ? Number(data.weight)
            : undefined,
        unit_id: unit.id,
        category_id:
          data.categoryId &&
          data.categoryId !== 'undefined' &&
          data.categoryId !== 'null' &&
          data.categoryId !== ''
            ? data.categoryId
            : undefined,
      },
    });

    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageRecords = data.images.map((imgUrl: string, idx: number) => ({
        product_id: product.id,
        image_url: imgUrl,
        is_primary: idx === 0,
      }));
      await this.prisma.productImage.createMany({
        data: imageRecords,
      });
    }

    return product;
  }

  async createWarehouse(data: any) {
    return this.prisma.warehouse.create({
      data: {
        company_id: data.companyId,
        code: data.code || `WH-${Date.now()}`,
        name: data.name,
        address: data.address,
        pic: data.pic,
      },
    });
  }

  async createInbound(data: CreateInboundDto) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: data.companyId,
          warehouse_id: data.warehouseId,
          transaction_no: data.transactionNo,
          transaction_type: 'IN',
          status: 'Approved',
          transaction_date: data.transactionDate,
          notes: data.notes,
          created_by: data.userId,
        },
      });

      for (const item of data.items) {
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');
        const subtotal = item.qty * (item.unitCost || 0);

        await tx.inventoryTransactionItem.create({
          data: {
            transaction: { connect: { id: transaction.id } },
            product: { connect: { id: item.productId } },
            qty: item.qty,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            batch_number: item.batchNumber,
            expired_date: item.expiredDate,
            notes: item.notes,
          },
        });

        await this.receiveStock(tx as any, {
          companyId: data.companyId,
          warehouseId: data.warehouseId,
          productId: item.productId,
          quantity: item.qty,
          unitCost: item.unitCost || 0,
          referenceType: 'IN',
          referenceId: transaction.id,
          description: data.notes,
          userId: data.userId,
        });
      }
      return transaction;
    });
  }

  async createOutbound(data: CreateOutboundDto) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: data.companyId,
          warehouse_id: data.warehouseId,
          transaction_no: data.transactionNo,
          transaction_type: 'OUT',
          status: 'Approved',
          transaction_date: data.transactionDate,
          notes: data.notes,
          created_by: data.userId,
        },
      });

      for (const item of data.items) {
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');

        const { consumedCost } = await this.issueStock(tx as any, {
          companyId: data.companyId,
          warehouseId: data.warehouseId,
          productId: item.productId,
          quantity: item.qty,
          referenceType: 'OUT',
          referenceId: transaction.id,
          description: data.notes,
          userId: data.userId,
        });

        await tx.inventoryTransactionItem.create({
          data: {
            transaction: { connect: { id: transaction.id } },
            product: { connect: { id: item.productId } },
            qty: item.qty,
            unit_cost: consumedCost / item.qty,
            subtotal: consumedCost,
            batch_number: item.batchNumber,
            expired_date: item.expiredDate,
            notes: item.notes,
          },
        });
      }
      return transaction;
    });
  }

  async createTransfer(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: data.companyId,
          warehouse_id: data.sourceWarehouseId,
          target_warehouse_id:
            data.targetWarehouseId || data.destinationWarehouseId,
          transaction_no:
            data.transactionNo ||
            (await this.sequenceService.generateNumber(
              tx,
              data.companyId,
              'TRANSFER',
              'TRF',
            )),
          transaction_type: 'TRANSFER',
          status: 'Draft',
          transaction_date: data.transactionDate || new Date(),
          notes: data.notes,
          created_by: data.userId,
        },
      });

      for (const item of data.items) {
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');
        await tx.inventoryTransactionItem.create({
          data: {
            transaction_id: transaction.id,
            product_id: item.productId,
            qty: item.qty,
            unit_cost: item.unitCost || 0,
            subtotal: item.qty * (item.unitCost || 0),
            notes: item.notes,
          },
        });
      }
      return transaction;
    });
  }

  async validateTransfer(companyId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.findUnique({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!transaction) throw new NotFoundException('Transfer not found');
      if (transaction.status !== 'Draft')
        throw new BadRequestException('Only Draft transfers can be validated');

      for (const item of transaction.items) {
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');

        await this.transferStock(tx as any, {
          companyId: companyId,
          productId: item.product_id,
          sourceWarehouseId: transaction.warehouse_id,
          targetWarehouseId: transaction.target_warehouse_id!,
          quantity: item.qty,
          referenceType: 'TRANSFER',
          referenceId: transaction.id,
          description: transaction.notes || undefined,
          userId: userId,
        });
      }

      await tx.inventoryTransaction.update({
        where: { id },
        data: { status: 'Approved' },
      });

      return transaction;
    });
  }

  async createAdjustment(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: data.companyId,
          warehouse_id: data.warehouseId,
          transaction_no:
            data.transactionNo ||
            (await this.sequenceService.generateNumber(
              tx,
              data.companyId,
              'ADJUSTMENT',
              'ADJ',
            )),
          transaction_type: 'ADJUSTMENT',
          status: 'Draft',
          transaction_date: data.transactionDate || new Date(),
          notes: data.notes,
          created_by: data.userId,
        },
      });

      for (const item of data.items) {
        if (item.qty <= 0)
          throw new BadRequestException('Quantity must be greater than 0');
        await tx.inventoryTransactionItem.create({
          data: {
            transaction_id: transaction.id,
            product_id: item.productId,
            qty: 0,
            subtotal: 0,
            system_qty: item.systemQty,
            counted_qty: item.countedQty,
            difference: item.countedQty - item.systemQty,
            notes: item.notes,
          },
        });
      }
      return transaction;
    });
  }

  async validateAdjustment(companyId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.findUnique({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!transaction) throw new NotFoundException('Adjustment not found');
      const updateCheck = await tx.inventoryTransaction.updateMany({
        where: { id, status: 'Draft' },
        data: { status: 'Processing' },
      });
      if (updateCheck.count === 0)
        throw new BadRequestException(
          'Only Draft adjustments can be validated or it is already processing',
        );

      for (const item of transaction.items) {
        const diff = item.difference || 0;
        if (diff === 0) continue;

        await this.adjustStock(tx as any, {
          companyId,
          warehouseId: transaction.warehouse_id,
          productId: item.product_id,
          difference: diff,
          unitCost: Number(item.unit_cost) || 0,
          referenceType: 'ADJUSTMENT',
          referenceId: transaction.id,
          description: item.notes || 'Stock Adjustment',
          userId,
        });
      }

      return tx.inventoryTransaction.update({
        where: { id },
        data: {
          status: 'Completed',
          approved_by: userId,
          approved_at: new Date(),
        },
      });
    });
  }

  async createStockOpname(
    companyId: string,
    warehouseId: string,
    userId: string,
    productIds?: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: companyId,
          warehouse_id: warehouseId,
          transaction_no: await this.sequenceService.generateNumber(
            tx,
            companyId,
            'OPNAME',
            'OPN',
          ),
          transaction_type: 'OPNAME',
          status: 'Draft',
          transaction_date: new Date(),
          created_by: userId,
        },
      });

      const filter: any = { company_id: companyId, warehouse_id: warehouseId };
      if (productIds && productIds.length > 0) {
        filter.product_id = { in: productIds };
      }

      const stocks = await tx.warehouseStock.findMany({ where: filter });

      const itemData = stocks.map((stock) => ({
        transaction_id: transaction.id,
        product_id: stock.product_id,
        qty: 0,
        subtotal: 0,
        system_qty: stock.current_stock,
        counted_qty: stock.current_stock,
        difference: 0,
      }));

      if (itemData.length > 0) {
        await tx.inventoryTransactionItem.createMany({ data: itemData });
      }

      return transaction;
    });
  }

  async approveStockOpname(
    companyId: string,
    id: string,
    userId: string,
    counts: { productId: string; countedQty: number; unitCost?: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.findUnique({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!transaction) throw new NotFoundException('Opname not found');
      const updateCheck = await tx.inventoryTransaction.updateMany({
        where: { id, status: 'Draft' },
        data: { status: 'Processing' },
      });
      if (updateCheck.count === 0)
        throw new BadRequestException(
          'Only Draft opname can be approved or it is already processing',
        );

      for (const count of counts) {
        const item = transaction.items.find(
          (i) => i.product_id === count.productId,
        );
        if (!item) continue;
        const diff = count.countedQty - (item.system_qty || 0);

        await tx.inventoryTransactionItem.update({
          where: { id: item.id },
          data: {
            counted_qty: count.countedQty,
            difference: diff,
            unit_cost: count.unitCost || 0,
          },
        });

        if (diff !== 0) {
          await this.adjustStock(tx as any, {
            companyId,
            warehouseId: transaction.warehouse_id,
            productId: item.product_id,
            difference: diff,
            unitCost: count.unitCost || 0,
            referenceType: 'OPNAME',
            referenceId: transaction.id,
            description: 'Stock Opname',
            userId,
          });
        }
      }

      return tx.inventoryTransaction.update({
        where: { id },
        data: {
          status: 'Completed',
          approved_by: userId,
          approved_at: new Date(),
        },
      });
    });
  }
  // =========================================================================
  // STEP 20E: AUTHORITATIVE INVENTORY PRIMITIVES
  // =========================================================================

  async receiveStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      warehouseId: string;
      productId: string;
      quantity: number;
      unitCost: number;
      referenceType: string;
      referenceId: string;
      description?: string;
      userId: string;
    },
  ) {
    if (params.quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    let stock = await tx.warehouseStock.findUnique({
      where: {
        company_id_warehouse_id_product_id: {
          company_id: params.companyId,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
        },
      },
    });

    if (!stock) {
      stock = await tx.warehouseStock.create({
        data: {
          company_id: params.companyId,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
          current_stock: 0,
          available_stock: 0,
          reserved_stock: 0,
        },
      });
    }

    const res = await tx.warehouseStock.updateMany({
      where: { id: stock.id, company_id: params.companyId },
      data: {
        current_stock: { increment: params.quantity },
        available_stock: { increment: params.quantity },
      },
    });

    if (res.count === 0)
      throw new BadRequestException('Failed to update stock');

    const mov = await tx.stockMovement.create({
      data: {
        company_id: params.companyId,
        warehouse_id: params.warehouseId,
        product_id: params.productId,
        transaction_type: params.referenceType,
        transaction_id: params.referenceId,
        movement_type:
          params.referenceType === 'IN' ? 'IN' : params.referenceType + '_IN',
        qty_in: params.quantity,
        qty_out: 0,
        balance_after: stock.current_stock + params.quantity,
        created_by: params.userId,
        remarks: params.description,
      },
    });

    await createFifoLayer(tx as any, {
      companyId: params.companyId,
      warehouseId: params.warehouseId,
      productId: params.productId,
      quantity: params.quantity,
      unitCost: params.unitCost,
      stockMovementId: mov.id,
    });

    return {
      stock: await tx.warehouseStock.findUnique({ where: { id: stock.id } }),
      movement: mov,
    };
  }

  async issueStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      warehouseId: string;
      productId: string;
      quantity: number;
      referenceType: string;
      referenceId: string;
      description?: string;
      userId: string;
      allowNegative?: boolean;
    },
  ) {
    if (params.quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    let stock = await tx.warehouseStock.findUnique({
      where: {
        company_id_warehouse_id_product_id: {
          company_id: params.companyId,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
        },
      },
    });

    if (!stock) {
      if (params.allowNegative) {
        stock = await tx.warehouseStock.create({
          data: {
            company_id: params.companyId,
            warehouse_id: params.warehouseId,
            product_id: params.productId,
            current_stock: 0,
            available_stock: 0,
            reserved_stock: 0,
          },
        });
      } else {
        throw new BadRequestException(
          'Stock not found for product ' + params.productId,
        );
      }
    }

    const updateRes = await tx.warehouseStock.updateMany({
      where: {
        id: stock.id,
        company_id: params.companyId,
        ...(params.allowNegative
          ? {}
          : { available_stock: { gte: params.quantity } }),
      },
      data: {
        current_stock: { decrement: params.quantity },
        available_stock: { decrement: params.quantity },
      },
    });

    if (updateRes.count === 0)
      throw new BadRequestException(
        'Insufficient available stock for product ' + params.productId,
      );

    const mov = await tx.stockMovement.create({
      data: {
        company_id: params.companyId,
        warehouse_id: params.warehouseId,
        product_id: params.productId,
        transaction_type: params.referenceType,
        transaction_id: params.referenceId,
        movement_type:
          params.referenceType === 'OUT'
            ? 'OUT'
            : params.referenceType + '_OUT',
        qty_in: 0,
        qty_out: params.quantity,
        balance_after: stock.current_stock - params.quantity,
        created_by: params.userId,
        remarks: params.description,
      },
    });

    let consumedCost = 0;
    try {
      const fifoRes = await consumeFifoLayers(tx as any, {
        companyId: params.companyId,
        warehouseId: params.warehouseId,
        productId: params.productId,
        quantity: params.quantity,
        stockMovementId: mov.id,
      });
      consumedCost = fifoRes.totalCogs;
    } catch (e: any) {
      if (!params.allowNegative) throw e;
    }

    return {
      stock: await tx.warehouseStock.findUnique({ where: { id: stock.id } }),
      movement: mov,
      consumedCost,
    };
  }

  async reserveStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productId: string;
      quantity: number;
      warehouseId?: string;
    },
  ) {
    if (params.quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    let stocks;
    if (params.warehouseId) {
      stocks = await tx.warehouseStock.findMany({
        where: {
          company_id: params.companyId,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
          available_stock: { gte: params.quantity },
        },
      });
    } else {
      stocks = await tx.warehouseStock.findMany({
        where: {
          company_id: params.companyId,
          product_id: params.productId,
          available_stock: { gte: params.quantity },
        },
        orderBy: { available_stock: 'desc' },
      });
    }

    if (stocks.length === 0)
      throw new BadRequestException(
        'Insufficient available stock to reserve for product ' +
          params.productId,
      );

    const targetStock = stocks[0];

    const updateRes = await tx.warehouseStock.updateMany({
      where: {
        id: targetStock.id,
        company_id: params.companyId,
        available_stock: { gte: params.quantity },
      },
      data: {
        reserved_stock: { increment: params.quantity },
        available_stock: { decrement: params.quantity },
      },
    });

    if (updateRes.count === 0)
      throw new BadRequestException(
        'Concurrency conflict reserving stock for product ' + params.productId,
      );

    return targetStock;
  }

  async releaseReservation(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      warehouseId: string;
      productId: string;
      quantity: number;
    },
  ) {
    if (params.quantity <= 0) return;

    const stock = await tx.warehouseStock.findUnique({
      where: {
        company_id_warehouse_id_product_id: {
          company_id: params.companyId,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
        },
      },
    });
    if (!stock) throw new BadRequestException('Stock not found');

    const updateRes = await tx.warehouseStock.updateMany({
      where: {
        id: stock.id,
        company_id: params.companyId,
        reserved_stock: { gte: params.quantity },
      },
      data: {
        reserved_stock: { decrement: params.quantity },
        available_stock: { increment: params.quantity },
      },
    });

    if (updateRes.count === 0)
      throw new BadRequestException(
        'Concurrency conflict releasing reservation for product ' +
          params.productId,
      );

    return await tx.warehouseStock.findUnique({ where: { id: stock.id } });
  }

  async transferStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      sourceWarehouseId: string;
      targetWarehouseId: string;
      productId: string;
      quantity: number;
      referenceType: string;
      referenceId: string;
      description?: string;
      userId: string;
    },
  ) {
    if (params.quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    // 1. Source Decrement
    const sourceStock = await tx.warehouseStock.findUnique({
      where: {
        company_id_warehouse_id_product_id: {
          company_id: params.companyId,
          warehouse_id: params.sourceWarehouseId,
          product_id: params.productId,
        },
      },
    });
    if (!sourceStock)
      throw new BadRequestException('Stock not found at source');

    const updateRes = await tx.warehouseStock.updateMany({
      where: { id: sourceStock.id, available_stock: { gte: params.quantity } },
      data: {
        current_stock: { decrement: params.quantity },
        available_stock: { decrement: params.quantity },
      },
    });
    if (updateRes.count === 0)
      throw new BadRequestException(
        'Concurrency conflict or insufficient stock at source',
      );

    // 2. Target Increment
    let targetStock = await tx.warehouseStock.findUnique({
      where: {
        company_id_warehouse_id_product_id: {
          company_id: params.companyId,
          warehouse_id: params.targetWarehouseId,
          product_id: params.productId,
        },
      },
    });
    if (!targetStock) {
      targetStock = await tx.warehouseStock.create({
        data: {
          company_id: params.companyId,
          warehouse_id: params.targetWarehouseId,
          product_id: params.productId,
          current_stock: 0,
          available_stock: 0,
          reserved_stock: 0,
        },
      });
    }
    await tx.warehouseStock.update({
      where: { id: targetStock.id },
      data: {
        current_stock: { increment: params.quantity },
        available_stock: { increment: params.quantity },
      },
    });

    // 3. Movements
    const movOut = await tx.stockMovement.create({
      data: {
        company_id: params.companyId,
        warehouse_id: params.sourceWarehouseId,
        product_id: params.productId,
        transaction_type: params.referenceType,
        transaction_id: params.referenceId,
        movement_type:
          params.referenceType === 'OUT'
            ? 'OUT'
            : params.referenceType + '_OUT',
        qty_in: 0,
        qty_out: params.quantity,
        balance_after: sourceStock.current_stock - params.quantity,
        created_by: params.userId,
        remarks: params.description,
      },
    });
    const movIn = await tx.stockMovement.create({
      data: {
        company_id: params.companyId,
        warehouse_id: params.targetWarehouseId,
        product_id: params.productId,
        transaction_type: params.referenceType,
        transaction_id: params.referenceId,
        movement_type:
          params.referenceType === 'IN' ? 'IN' : params.referenceType + '_IN',
        qty_in: params.quantity,
        qty_out: 0,
        balance_after: targetStock.current_stock + params.quantity,
        created_by: params.userId,
        remarks: params.description,
      },
    });

    await transferFifoLayers(tx as any, {
      companyId: params.companyId,
      productId: params.productId,
      sourceWarehouseId: params.sourceWarehouseId,
      destWarehouseId: params.targetWarehouseId,
      quantity: params.quantity,
      sourceMovementId: movOut.id,
      destMovementId: movIn.id,
    });

    return { movOut, movIn };
  }

  async adjustStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      warehouseId: string;
      productId: string;
      difference: number;
      unitCost?: number;
      referenceType: string;
      referenceId: string;
      description?: string;
      userId: string;
    },
  ) {
    if (params.difference === 0) return;

    if (params.difference > 0) {
      let finalUnitCost = params.unitCost || 0;
      if (finalUnitCost <= 0) {
        const latestFifo = await (tx as any).inventoryCostLayer.findFirst({
          where: { company_id: params.companyId, product_id: params.productId },
          orderBy: { created_at: 'desc' },
        });
        if (latestFifo) {
          finalUnitCost = Number(latestFifo.unit_cost);
        } else {
          const prod = await (tx as any).product.findUnique({
            where: { id: params.productId },
          });
          finalUnitCost = Number(prod?.purchase_price) || 0;
          if (finalUnitCost <= 0) {
            throw new BadRequestException(
              'Valid unit cost is required for positive adjustment. No purchase history found.',
            );
          }
        }
      }

      await this.receiveStock(tx, {
        ...params,
        quantity: params.difference,
        unitCost: finalUnitCost,
      });

      const totalValue = params.difference * finalUnitCost;
      if (totalValue > 0) {
        this.eventEmitter.emit(
          'inventory.valuation',
          new InventoryValuationEvent(
            params.companyId,
            params.referenceId,
            `adj-gain-${params.referenceId}-${Date.now()}`,
            new Date(),
            {
              type: 'ADJUSTMENT_GAIN',
              totalValue: totalValue,
              description: params.description || 'Stock Adjustment Gain',
            },
            tx,
          ),
        );
      }
    } else {
      const { consumedCost } = await this.issueStock(tx, {
        ...params,
        quantity: Math.abs(params.difference),
      });

      if (consumedCost > 0) {
        this.eventEmitter.emit(
          'inventory.valuation',
          new InventoryValuationEvent(
            params.companyId,
            params.referenceId,
            `adj-loss-${params.referenceId}-${Date.now()}`,
            new Date(),
            {
              type: 'ADJUSTMENT_LOSS',
              totalValue: consumedCost,
              description: params.description || 'Stock Adjustment Loss',
            },
            tx,
          ),
        );
      }
    }
  }

    async getFifoDiagnostic(companyId: string) {
    const stock = await this.prisma.warehouseStock.findMany({
      where: { company_id: companyId, current_stock: { gt: 0 } },
      include: {
        product: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    const fifoLayers = await this.prisma.inventoryCostLayer.findMany({
      where: { company_id: companyId, remaining_quantity: { gt: 0 } },
      select: { warehouse_id: true, product_id: true, remaining_quantity: true, unit_cost: true },
    });

    const layerMap = new Map();
    fifoLayers.forEach(l => {
      const key = `${l.warehouse_id}_${l.product_id}`;
      if (!layerMap.has(key)) layerMap.set(key, { qty: 0, val: 0 });
      const current = layerMap.get(key);
      current.qty += l.remaining_quantity;
      current.val += (l.remaining_quantity * l.unit_cost);
    });

    const result = stock.map(s => {
      const layer = layerMap.get(`${s.warehouse_id}_${s.product_id}`);
      const physicalQty = Number(s.current_stock);
      const fifoQty = layer ? layer.qty : 0;
      
      let status = 'OK';
      if (fifoQty < physicalQty && fifoQty > 0) status = 'INSUFFICIENT_COVERAGE';
      else if (fifoQty === 0 && physicalQty > 0) status = 'NO_COVERAGE';
      else if (fifoQty > physicalQty) status = 'EXCEEDS_PHYSICAL_STOCK';

      return {
        productId: s.product_id,
        code: s.product.code,
        productName: s.product.name,
        warehouseId: s.warehouse_id,
        warehouseName: s.warehouse.name,
        physicalQuantity: physicalQty,
        fifoQuantity: fifoQty,
        fifoValue: layer ? layer.val : 0,
        difference: physicalQty - fifoQty,
        status,
      };
    });

    return result;
  }

}
