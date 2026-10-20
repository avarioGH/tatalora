import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

  async getCategories(companyId: string) {
    return this.prisma.category.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' }
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

  async updateCategory(id: string, data: any) {
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
      },
    });
  }

  async deleteCategory(id: string) {
    const products = await this.prisma.product.count({ where: { category_id: id } });
    if (products > 0) {
      throw new Error('Kategori tidak dapat dihapus karena sedang digunakan oleh produk.');
    }
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async getProducts(companyId: string) {
    return this.prisma.product.findMany({
      where: { company_id: companyId },
      include: { category: true, unit: true, brand: true, warehouse_stocks: true },
      orderBy: { created_at: 'desc' }
    });
  }

  async getWarehouses(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateWarehouse(id: string, data: any) {
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        address: data.location || data.address
      }
    });
  }

  async deleteWarehouse(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Delete access records first due to foreign key constraints
      await tx.userWarehouseAccess.deleteMany({
        where: { warehouse_id: id }
      });
      // Delete warehouse stocks
      await tx.warehouseStock.deleteMany({
        where: { warehouse_id: id }
      });
      return tx.warehouse.delete({
        where: { id }
      });
    });
  }

  async getTransactions(companyId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { company_id: companyId },
      include: {
        warehouse: true,
        target_warehouse: true,
        items: { include: { product: true } }
      },
      orderBy: { transaction_date: 'desc' }
    });
  }

  async getWarehouseStocks(companyId: string) {
    return this.prisma.warehouseStock.findMany({
      where: { company_id: companyId },
      include: { warehouse: true, product: true }
    });
  }

  async createProduct(data: any) {
    // We need a unit to create a product. Let's find or create a default 'PCS' unit.
    let unit = await this.prisma.unit.findFirst({ where: { company_id: data.companyId, name: 'PCS' }});
    if (!unit) {
      unit = await this.prisma.unit.create({ data: { company_id: data.companyId, name: 'PCS' }});
    }

    const product = await this.prisma.product.create({
      data: {
        company_id: data.companyId,
        code: data.code || `PRD-${Date.now()}`,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description,
        purchase_price: data.purchasePrice !== undefined ? Number(data.purchasePrice) : 0,
        selling_price: data.sellingPrice !== undefined ? Number(data.sellingPrice) : 0,
        unit_id: unit.id,
        category_id: data.categoryId || null
      }
    });

    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageRecords = data.images.map((imgUrl: string, idx: number) => ({
        product_id: product.id,
        image_url: imgUrl,
        is_primary: idx === 0
      }));
      await this.prisma.productImage.createMany({
        data: imageRecords
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
        pic: data.pic
      }
    });
  }

  async createInbound(data: CreateInboundDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Transaction Header
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

      // 2. Loop through items
      for (const item of data.items) {
        const subtotal = item.qty * item.unitCost;

        // a. Create Transaction Item
        await tx.inventoryTransactionItem.create({
          data: {
            transaction_id: transaction.id,
            product_id: item.productId,
            qty: item.qty,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            batch_number: item.batchNumber,
            expired_date: item.expiredDate,
            notes: item.notes,
          },
        });

        // b. Create Stock Movement
        await tx.stockMovement.create({
          data: {
            company_id: data.companyId,
            warehouse_id: data.warehouseId,
            product_id: item.productId,
            transaction_type: 'IN',
            transaction_id: transaction.id,
            movement_type: 'IN',
            qty_in: item.qty,
            qty_out: 0,
            unit_cost: item.unitCost,
            total_cost: subtotal,
            batch_number: item.batchNumber,
            expired_date: item.expiredDate,
            created_by: data.userId,
          },
        });

        // c. Update Warehouse Stock (Cache)
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.warehouseId,
              product_id: item.productId,
            }
          }
        });

        if (currentStock) {
          await tx.warehouseStock.update({
            where: { id: currentStock.id },
            data: {
              current_stock: currentStock.current_stock + item.qty,
              available_stock: currentStock.available_stock + item.qty,
            }
          });
        } else {
          await tx.warehouseStock.create({
            data: {
              company_id: data.companyId,
              warehouse_id: data.warehouseId,
              product_id: item.productId,
              current_stock: item.qty,
              available_stock: item.qty,
              reserved_stock: 0,
            }
          });
        }
      }

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'CREATE',
          entity: 'InventoryTransaction_Inbound',
          entity_id: transaction.id,
        }
      });

      return transaction;
    });
  }

  async createOutbound(data: CreateOutboundDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validasi Stok Terlebih Dahulu
      for (const item of data.items) {
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.warehouseId,
              product_id: item.productId,
            }
          }
        });

        if (!currentStock || currentStock.available_stock < item.qty) {
          throw new BadRequestException(`Stock tidak mencukupi untuk product ${item.productId}`);
        }
      }

      // 2. Create Transaction Header
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

      // 3. Loop through items
      for (const item of data.items) {
        const subtotal = item.qty * item.unitCost;

        // a. Create Transaction Item
        await tx.inventoryTransactionItem.create({
          data: {
            transaction_id: transaction.id,
            product_id: item.productId,
            qty: item.qty,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            batch_number: item.batchNumber,
            expired_date: item.expiredDate,
            notes: item.notes,
          },
        });

        // b. Create Stock Movement
        await tx.stockMovement.create({
          data: {
            company_id: data.companyId,
            warehouse_id: data.warehouseId,
            product_id: item.productId,
            transaction_type: 'OUT',
            transaction_id: transaction.id,
            movement_type: 'OUT',
            qty_in: 0,
            qty_out: item.qty,
            unit_cost: item.unitCost,
            total_cost: subtotal,
            batch_number: item.batchNumber,
            expired_date: item.expiredDate,
            created_by: data.userId,
          },
        });

        // c. Update Warehouse Stock (Cache)
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.warehouseId,
              product_id: item.productId,
            }
          }
        });

        await tx.warehouseStock.update({
          where: { id: currentStock!.id },
          data: {
            current_stock: currentStock!.current_stock - item.qty,
            available_stock: currentStock!.available_stock - item.qty,
          }
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'CREATE',
          entity: 'InventoryTransaction_Outbound',
          entity_id: transaction.id,
        }
      });

      return transaction;
    });
  }

  async createTransfer(data: CreateTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validasi Stok di Gudang Asal
      for (const item of data.items) {
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.sourceWarehouseId,
              product_id: item.productId,
            }
          }
        });

        if (!currentStock || currentStock.available_stock < item.qty) {
          throw new BadRequestException(`Stock tidak mencukupi di gudang asal untuk product ${item.productId}`);
        }
      }

      // 2. Create Transaction Header
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: data.companyId,
          warehouse_id: data.sourceWarehouseId,
          target_warehouse_id: data.targetWarehouseId,
          transaction_no: data.transactionNo,
          transaction_type: 'TRANSFER',
          status: 'Approved',
          transaction_date: data.transactionDate,
          notes: data.notes,
          created_by: data.userId,
        },
      });

      for (const item of data.items) {
        const subtotal = item.qty * item.unitCost;

        await tx.inventoryTransactionItem.create({
          data: {
            transaction_id: transaction.id,
            product_id: item.productId,
            qty: item.qty,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            notes: item.notes,
          },
        });

        // OUT from source
        await tx.stockMovement.create({
          data: {
            company_id: data.companyId,
            warehouse_id: data.sourceWarehouseId,
            product_id: item.productId,
            transaction_type: 'TRANSFER',
            transaction_id: transaction.id,
            movement_type: 'OUT',
            qty_in: 0,
            qty_out: item.qty,
            unit_cost: item.unitCost,
            total_cost: subtotal,
            created_by: data.userId,
          },
        });

        const sourceStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.sourceWarehouseId,
              product_id: item.productId,
            }
          }
        });
        await tx.warehouseStock.update({
          where: { id: sourceStock!.id },
          data: {
            current_stock: sourceStock!.current_stock - item.qty,
            available_stock: sourceStock!.available_stock - item.qty,
          }
        });

        // IN to target
        await tx.stockMovement.create({
          data: {
            company_id: data.companyId,
            warehouse_id: data.targetWarehouseId,
            product_id: item.productId,
            transaction_type: 'TRANSFER',
            transaction_id: transaction.id,
            movement_type: 'IN',
            qty_in: item.qty,
            qty_out: 0,
            unit_cost: item.unitCost,
            total_cost: subtotal,
            created_by: data.userId,
          },
        });

        const targetStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.targetWarehouseId,
              product_id: item.productId,
            }
          }
        });

        if (targetStock) {
          await tx.warehouseStock.update({
            where: { id: targetStock.id },
            data: {
              current_stock: targetStock.current_stock + item.qty,
              available_stock: targetStock.available_stock + item.qty,
            }
          });
        } else {
          await tx.warehouseStock.create({
            data: {
              company_id: data.companyId,
              warehouse_id: data.targetWarehouseId,
              product_id: item.productId,
              current_stock: item.qty,
              available_stock: item.qty,
              reserved_stock: 0,
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'CREATE',
          entity: 'InventoryTransaction_Transfer',
          entity_id: transaction.id,
        }
      });

      return transaction;
    });
  }

  async createAdjustment(data: CreateAdjustmentDto) {
    return this.prisma.$transaction(async (tx) => {
      // Create Transaction Header
      const transaction = await tx.inventoryTransaction.create({
        data: {
          company_id: data.companyId,
          warehouse_id: data.warehouseId,
          transaction_no: data.transactionNo,
          transaction_type: 'ADJUSTMENT',
          status: 'Approved',
          transaction_date: data.transactionDate,
          notes: data.notes,
          created_by: data.userId,
        },
      });

      for (const item of data.items) {
        const subtotal = item.qty * item.unitCost;

        await tx.inventoryTransactionItem.create({
          data: {
            transaction_id: transaction.id,
            product_id: item.productId,
            qty: item.qty,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            notes: item.notes,
          },
        });

        const isAdd = item.adjustmentType === 'IN';

        await tx.stockMovement.create({
          data: {
            company_id: data.companyId,
            warehouse_id: data.warehouseId,
            product_id: item.productId,
            transaction_type: 'ADJUSTMENT',
            transaction_id: transaction.id,
            movement_type: item.adjustmentType,
            qty_in: isAdd ? item.qty : 0,
            qty_out: isAdd ? 0 : item.qty,
            unit_cost: item.unitCost,
            total_cost: subtotal,
            created_by: data.userId,
          },
        });

        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id: data.companyId,
              warehouse_id: data.warehouseId,
              product_id: item.productId,
            }
          }
        });

        if (currentStock) {
          const newCurrentStock = isAdd ? currentStock.current_stock + item.qty : currentStock.current_stock - item.qty;
          const newAvailableStock = isAdd ? currentStock.available_stock + item.qty : currentStock.available_stock - item.qty;
          
          if (!isAdd && newAvailableStock < 0) {
            throw new BadRequestException(`Stock tidak mencukupi untuk adjustment OUT product ${item.productId}`);
          }

          await tx.warehouseStock.update({
            where: { id: currentStock.id },
            data: {
              current_stock: newCurrentStock,
              available_stock: newAvailableStock,
            }
          });
        } else {
          if (!isAdd) {
            throw new BadRequestException(`Stock tidak ditemukan untuk adjustment OUT product ${item.productId}`);
          }
          await tx.warehouseStock.create({
            data: {
              company_id: data.companyId,
              warehouse_id: data.warehouseId,
              product_id: item.productId,
              current_stock: item.qty,
              available_stock: item.qty,
              reserved_stock: 0,
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'CREATE',
          entity: 'InventoryTransaction_Adjustment',
          entity_id: transaction.id,
        }
      });

      return transaction;
    });
  }
}
