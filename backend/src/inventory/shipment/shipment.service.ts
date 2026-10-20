import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryLedgerService } from '../inventory-ledger.service';

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryLedgerService: InventoryLedgerService,
  ) {}

  async create(companyId: string, data: any) {
    let {
      shipmentNumber,
      shipmentDate,
      warehouseId,
      vehicleId,
      driverId,
      fusoName,
      policeNumber,
      driverName,
      customerId,
      destinationName,
      destinationAddress,
      notes,
      items,
      salesOrderId,
    } = data;

    if (!shipmentNumber) {
      shipmentNumber = `FUSO-${Date.now().toString().slice(-6)}`;
    }

    if (!warehouseId) {
      const defWh = await this.prisma.warehouse.findFirst({ where: { company_id: companyId } });
      if (defWh) warehouseId = defWh.id;
    }

    const existing = await this.prisma.timberShipment.findUnique({
      where: { shipmentNumber },
    });
    if (existing) {
      throw new BadRequestException(
        'Shipment with number ' + shipmentNumber + ' already exists',
      );
    }

    if (salesOrderId) {
      const order = await this.prisma.timberSalesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Sales Order not found');
      if (
        order.status !== 'CONFIRMED' &&
        order.status !== 'PARTIALLY_FULFILLED'
      ) {
        throw new BadRequestException(
          'Sales Order must be CONFIRMED or PARTIALLY_FULFILLED to create shipment',
        );
      }

      for (const item of items) {
        if (!item.salesOrderItemId) {
          throw new BadRequestException(
            'Shipment item must reference a valid salesOrderItemId when linked to SO',
          );
        }
        const orderItem = order.items.find(
          (i: any) => i.id === item.salesOrderItemId,
        );
        if (!orderItem) {
          throw new BadRequestException(
            'Shipment item refers to salesOrderItem that does not belong to selected salesOrder',
          );
        }
        if (orderItem.timberVariantId !== item.timberVariantId) {
          throw new BadRequestException(
            'TimberVariant must match the SalesOrderItem variant',
          );
        }
        if (item.quantityPcs <= 0) {
          throw new BadRequestException('Shipment quantity must be > 0');
        }

        const remainingQty = orderItem.orderQty - orderItem.realizedQty;
        if (item.quantityPcs > remainingQty) {
          throw new BadRequestException(
            'Quantity exceeds remaining SO quantity. Max allowed: ' +
              remainingQty,
          );
        }
      }
    }

    let totalPcs = 0;
    let totalVolumeM3 = 0;

    const processedItems: any[] = [];
    for (const item of (items || [])) {
      let vol = Number(item.volumeM3) || 0;
      if (!vol && item.thicknessMm && item.widthMm && item.lengthMm && item.quantityPcs) {
        vol = (Number(item.quantityPcs) * Number(item.thicknessMm) * Number(item.widthMm) * Number(item.lengthMm)) / 1000000000;
      }
      totalPcs += Number(item.quantityPcs) || 0;
      totalVolumeM3 += vol;

      let variantId = item.timberVariantId;
      if (!variantId && item.thicknessMm && item.widthMm && item.lengthMm && item.species) {
        const found = await this.prisma.timberVariant.findFirst({
          where: {
            company_id: companyId,
            species: { equals: item.species, mode: 'insensitive' },
            thickness: Math.round(Number(item.thicknessMm)),
            width: Math.round(Number(item.widthMm)),
            length: Math.round(Number(item.lengthMm)),
          },
        });
        if (found) variantId = found.id;
      }

      processedItems.push({
        timberVariantId: variantId || undefined,
        batch: item.batch || 'UNKNOWN',
        species: item.species || null,
        productCategory: item.productCategory || 'BALOK',
        thicknessMm: item.thicknessMm ? Number(item.thicknessMm) : null,
        widthMm: item.widthMm ? Number(item.widthMm) : null,
        lengthMm: item.lengthMm ? Number(item.lengthMm) : null,
        quantityPcs: Number(item.quantityPcs) || 0,
        volumeM3: Number(vol.toFixed(4)),
        salesOrderItemId: item.salesOrderItemId || undefined,
      });
    }

    const shipment = await this.prisma.timberShipment.create({
      data: {
        company_id: companyId,
        shipmentNumber,
        shipmentDate: shipmentDate ? new Date(shipmentDate) : undefined,
        warehouseId,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        fusoName,
        policeNumber,
        driverName,
        customerId: customerId || undefined,
        destinationName,
        destinationAddress,
        notes,
        status: 'DRAFT',
        totalPcs,
        totalVolumeM3: Number(totalVolumeM3.toFixed(4)),
        salesOrderId: salesOrderId || undefined,
        items: {
          create: processedItems,
        },
      } as any,
      include: {
        items: { include: { timberVariant: true } },
      },
    });

    if (data.autoConfirm) {
      return this.confirm(shipment.id, companyId);
    }

    return shipment;
  }

  private async updateSalesOrderStatus(tx: any, salesOrderId: string) {
    const updatedItems = await tx.timberSalesOrderItem.findMany({
      where: { salesOrderId },
    });
    const allFulfilled = updatedItems.every(
      (i: any) => i.realizedQty >= i.orderQty,
    );
    const anyFulfilled = updatedItems.some((i: any) => i.realizedQty > 0);
    const newStatus = allFulfilled
      ? 'FULFILLED'
      : anyFulfilled
        ? 'PARTIALLY_FULFILLED'
        : 'CONFIRMED';
    await tx.timberSalesOrder.update({
      where: { id: salesOrderId },
      data: { status: newStatus },
    });
  }

  async confirm(id: string, companyId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const shipment = await tx.timberShipment.findFirst({
        where: { id, company_id: companyId },
        include: { items: true },
      });

      if (!shipment) throw new NotFoundException('Timber shipment not found');
      if (shipment.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT shipment can be confirmed');

      const confirmed = await tx.timberShipment.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      for (const item of shipment.items) {
        if (item.salesOrderItemId) {
          const orderItem = await tx.timberSalesOrderItem.findUnique({
            where: { id: item.salesOrderItemId },
          });
          if (!orderItem) continue;

          const remainingQty = orderItem.orderQty - orderItem.realizedQty;
          if (item.quantityPcs > remainingQty) {
            throw new BadRequestException(
              'Quantity exceeds remaining SO quantity during confirmation. Remaining: ' +
                remainingQty,
            );
          }

          // Consume reservation first so createMovement guard doesn't fail
          if (orderItem.fulfillmentLocationId) {
            const soData = await tx.timberSalesOrder.findUnique({
              where: { id: orderItem.salesOrderId },
              include: { customer: true },
            });
            if (soData) {
              const resQuery = {
                company_id: soData.customer.company_id,
                locationId: orderItem.fulfillmentLocationId,
                timberVariantId: item.timberVariantId,
              };
              const reservation = await tx.timberStockReservation.findUnique({
                where: { company_id_locationId_timberVariantId: resQuery },
              });
              if (reservation && reservation.reservedPcs >= item.quantityPcs) {
                const result = await tx.timberStockReservation.updateMany({
                  where: {
                    id: reservation.id,
                    reservedPcs: reservation.reservedPcs,
                  },
                  data: {
                    reservedPcs: { decrement: item.quantityPcs },
                    reservedM3: { decrement: item.volumeM3 },
                  },
                });

                if (result.count === 0) {
                  throw new BadRequestException(
                    'Insufficient reservation or conflict. Please retry shipment.',
                  );
                }
              }
            }
          }

          await tx.timberSalesOrderItem.update({
            where: { id: item.salesOrderItemId },
            data: {
              realizedQty: { increment: item.quantityPcs },
              realizedM3: { increment: item.volumeM3 },
            },
          });
        }

        if (item.timberVariantId) {
          await this.inventoryLedgerService.createMovement(
            tx,
            shipment.warehouseId,
            item.timberVariantId,
            'OUT',
            'TIMBER_SHIPMENT',
            shipment.id,
            item.quantityPcs,
            item.volumeM3,
            item.batch,
          );
        }
      }

      if (shipment.salesOrderId) {
        await this.updateSalesOrderStatus(tx, shipment.salesOrderId);
      }

      return confirmed;
    });
  }

  async cancel(id: string, companyId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const shipment = await tx.timberShipment.findFirst({
        where: { id, company_id: companyId },
        include: { items: true },
      });

      if (!shipment) throw new NotFoundException('Timber shipment not found');
      if (shipment.status !== 'CONFIRMED')
        throw new BadRequestException(
          'Only CONFIRMED shipment can be cancelled',
        );

      const cancelled = await tx.timberShipment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      for (const item of shipment.items) {
        if (item.timberVariantId) {
          await this.inventoryLedgerService.createMovement(
            tx,
            shipment.warehouseId,
            item.timberVariantId,
            'IN',
            'TIMBER_SHIPMENT_REVERSAL',
            shipment.id,
            item.quantityPcs,
            item.volumeM3,
            item.batch,
          );
        }

        if (item.salesOrderItemId) {
          const orderItem = await tx.timberSalesOrderItem.findUnique({
            where: { id: item.salesOrderItemId },
          });
          if (!orderItem) continue;
          if (orderItem.realizedQty < item.quantityPcs) {
            throw new BadRequestException('Cannot reverse realizedQty below 0');
          }
          await tx.timberSalesOrderItem.update({
            where: { id: item.salesOrderItemId },
            data: {
              realizedQty: { decrement: item.quantityPcs },
              realizedM3: { decrement: item.volumeM3 },
            },
          });

          // Restore reservation: cancelled shipment returns commitment to the SO
          if (orderItem.fulfillmentLocationId) {
            const soData = await tx.timberSalesOrder.findUnique({
              where: { id: orderItem.salesOrderId },
              include: { customer: true },
            });
            if (soData) {
              const resQuery = {
                company_id: soData.customer.company_id,
                locationId: orderItem.fulfillmentLocationId,
                timberVariantId: item.timberVariantId,
              };
              const reservation = await tx.timberStockReservation.findUnique({
                where: { company_id_locationId_timberVariantId: resQuery },
              });
              if (reservation) {
                await tx.timberStockReservation.update({
                  where: { id: reservation.id },
                  data: {
                    reservedPcs: { increment: item.quantityPcs },
                    reservedM3: { increment: item.volumeM3 },
                  },
                });
              }
            }
          }
        }
      }

      if (shipment.salesOrderId) {
        await this.updateSalesOrderStatus(tx, shipment.salesOrderId);
      }

      return cancelled;
    });
  }

  async findAll(companyId: string) {
    return this.prisma.timberShipment.findMany({
      where: { company_id: companyId },
      include: {
        warehouse: true,
        vehicle: true,
        driver: true,
        customer: true,
        items: { include: { timberVariant: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const shipment = await this.prisma.timberShipment.findFirst({
      where: { id, company_id: companyId },
      include: {
        warehouse: true,
        vehicle: true,
        driver: true,
        customer: true,
        items: { include: { timberVariant: true } },
      },
    });
    if (!shipment) throw new NotFoundException('Timber shipment not found');
    return shipment;
  }
  async delete(id: string, companyId: string) {
    const shipment = await this.prisma.timberShipment.findFirst({
      where: { id, company_id: companyId },
    });
    if (!shipment) throw new NotFoundException('Timber shipment not found');
    if (shipment.status === 'CONFIRMED') {
      throw new BadRequestException('Cannot delete CONFIRMED shipment. Please cancel it first.');
    }
    await this.prisma.timberShipment.delete({ where: { id } });
    return { success: true, message: 'Shipment deleted successfully' };
  }
}