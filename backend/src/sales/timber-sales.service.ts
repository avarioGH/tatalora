import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLedgerService } from '../inventory/inventory-ledger.service';

@Injectable()
export class TimberSalesService {
  constructor(
    private prisma: PrismaService,
    private ledger: InventoryLedgerService,
  ) {}

  async createOrder(dto: any) {
    const orderCount = await this.prisma.timberSalesOrder.count();
    const orderNumber = `TSO-${String(orderCount + 1).padStart(5, '0')}`;
    return this.prisma.timberSalesOrder.create({
      data: {
        orderNumber,
        customerId: dto.customerId,
        orderDate: new Date(dto.orderDate),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        partai: dto.partai || null,
        notes: dto.notes || null,
        status: 'DRAFT',
        items: {
          create: (dto.items || []).map((item: any) => ({
            timberVariantId: item.timberVariantId || null,
            fulfillmentLocationId: item.fulfillmentLocationId || null,
            thicknessMm: item.thicknessMm,
            widthMm: item.widthMm,
            lengthMm: item.lengthMm,
            grade: item.grade || null,
            species: item.species || null,
            orderQty: item.orderQty,
            orderM3: parseFloat(
              (
                (item.thicknessMm *
                  item.widthMm *
                  item.lengthMm *
                  item.orderQty) /
                1e9
              ).toFixed(4),
            ),
          })),
        },
      },
      include: { items: true, customer: true },
    });
  }

  async findAllOrders(
    page = 1,
    limit = 20,
    status?: string,
    customerId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const [data, total] = await Promise.all([
      this.prisma.timberSalesOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          _count: {
            select: { items: true, deliveries: true, shipments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.timberSalesOrder.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.timberSalesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { timberVariant: true, fulfillmentLocation: true } },
        deliveries: {
          include: {
            items: { include: { timberVariant: true, location: true } },
          },
        },
        shipments: { include: { items: { include: { timberVariant: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Order ' + id + ' not found');
    return order;
  }

  async confirmOrder(id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.timberSalesOrder.findUnique({
        where: { id },
        include: { items: true, customer: true },
      });
      if (!order) throw new NotFoundException('Sales order not found');
      if (order.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT orders can be confirmed');

      for (const item of order.items) {
        if (!item.fulfillmentLocationId) {
          throw new BadRequestException(
            'Order item is missing fulfillmentLocationId',
          );
        }

        const remainingQty = item.orderQty - item.realizedQty;
        const remainingM3 = item.orderM3 - item.realizedM3;

        if (remainingQty <= 0) continue;

        const stocks = await tx.timberStock.findMany({
          where: {
            locationId: item.fulfillmentLocationId,
            timberVariantId: item.timberVariantId,
          },
        });

        const physicalPcs = stocks.reduce(
          (sum: number, s: any) => sum + s.currentPcs,
          0,
        );

        const resQuery = {
          company_id: order.customer.company_id,
          locationId: item.fulfillmentLocationId,
          timberVariantId: item.timberVariantId,
        };

        let reservation = await tx.timberStockReservation.findUnique({
          where: { company_id_locationId_timberVariantId: resQuery },
        });

        if (!reservation) {
          try {
            reservation = await tx.timberStockReservation.create({
              data: { ...resQuery, reservedPcs: 0, reservedM3: 0 },
            });
          } catch (e: any) {
            // Prisma P2002 Unique Constraint Violation means another tx created it
            if (e.code === 'P2002') {
              reservation = await tx.timberStockReservation.findUnique({
                where: { company_id_locationId_timberVariantId: resQuery },
              });
              if (!reservation)
                throw new BadRequestException(
                  'Failed to initialize reservation row',
                );
            } else {
              throw e;
            }
          }
        }

        const available = physicalPcs - reservation.reservedPcs;

        if (available < remainingQty) {
          throw new BadRequestException(
            'Insufficient available stock for variant ' +
              item.timberVariantId +
              '. Physical: ' +
              physicalPcs +
              ', Reserved: ' +
              reservation.reservedPcs +
              ', Available: ' +
              available +
              ', Requested: ' +
              remainingQty,
          );
        }

        const result = await tx.timberStockReservation.updateMany({
          where: {
            id: reservation.id,
            reservedPcs: reservation.reservedPcs, // OCC check
          },
          data: {
            reservedPcs: { increment: remainingQty },
            reservedM3: { increment: remainingM3 },
          },
        });

        if (result.count === 0) {
          throw new BadRequestException(
            'Sales order reservation conflict for variant ' +
              item.timberVariantId +
              '. Please retry.',
          );
        }
      }

      return tx.timberSalesOrder.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });
    });
  }

  async cancelOrder(id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.timberSalesOrder.findUnique({
        where: { id },
        include: { items: true, customer: true },
      });
      if (!order) throw new NotFoundException();
      if (!['DRAFT', 'CONFIRMED'].includes(order.status))
        throw new BadRequestException(
          'Only DRAFT or CONFIRMED orders can be cancelled',
        );

      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          if (!item.fulfillmentLocationId) continue;

          const remainingQty = item.orderQty - item.realizedQty;
          const remainingM3 = item.orderM3 - item.realizedM3;

          if (remainingQty <= 0) continue;

          const resQuery = {
            company_id: order.customer.company_id,
            locationId: item.fulfillmentLocationId,
            timberVariantId: item.timberVariantId,
          };

          const reservation = await tx.timberStockReservation.findUnique({
            where: { company_id_locationId_timberVariantId: resQuery },
          });

          if (reservation) {
            // Prevent negative reservation
            const decPcs = Math.min(reservation.reservedPcs, remainingQty);
            const decM3 = Math.min(reservation.reservedM3, remainingM3);

            if (decPcs > 0) {
              const result = await tx.timberStockReservation.updateMany({
                where: {
                  id: reservation.id,
                  reservedPcs: reservation.reservedPcs,
                },
                data: {
                  reservedPcs: { decrement: decPcs },
                  reservedM3: { decrement: decM3 },
                },
              });

              if (result.count === 0) {
                throw new BadRequestException(
                  'Sales order cancel conflict. Please retry.',
                );
              }
            }
          }
        }
      }

      return tx.timberSalesOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async createDelivery(salesOrderId: string, dto: any) {
    throw new BadRequestException(
      'Timber Delivery Note fulfillment is deprecated. Create a Timber Shipment instead.',
    );
  }

  async postDelivery(deliveryId: string) {
    throw new BadRequestException(
      'Timber Delivery Note fulfillment is deprecated. Create a Timber Shipment instead.',
    );
  }

  async cancelDelivery(deliveryId: string) {
    const delivery = await this.prisma.timberDeliveryNote.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException();
    if (delivery.status !== 'DRAFT')
      throw new BadRequestException('Only DRAFT deliveries can be cancelled');
    return this.prisma.timberDeliveryNote.update({
      where: { id: deliveryId },
      data: { status: 'CANCELLED' },
    });
  }

  async getOrderRealization(salesOrderId: string) {
    const order = await this.findOneOrder(salesOrderId);
    return {
      orderNumber: order.orderNumber,
      customer: order.customer.name,
      status: order.status,
      items: order.items.map((item: any) => ({
        thicknessMm: item.thicknessMm,
        widthMm: item.widthMm,
        lengthMm: item.lengthMm,
        grade: item.grade,
        species: item.species,
        orderQty: item.orderQty,
        orderM3: item.orderM3,
        realizedQty: item.realizedQty,
        realizedM3: item.realizedM3,
        remainingQty: item.orderQty - item.realizedQty,
        remainingM3: parseFloat((item.orderM3 - item.realizedM3).toFixed(4)),
      })),
    };
  }

  async getAllOrdersRealization() {
    const orders = await this.prisma.timberSalesOrder.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'DRAFT'] },
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const reportRows: any[] = [];
    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        const orderQty = item.orderQty || 0;
        const realizedQty = item.realizedQty || 0;
        const orderM3 = Number(item.orderM3 || 0);
        const realizedM3 = Number(item.realizedM3 || 0);
        const remainingQty = orderQty - realizedQty;
        const remainingM3 = orderM3 - realizedM3;
        const pct = orderQty > 0 ? (realizedQty / orderQty) * 100 : 0;

        reportRows.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name || '-',
          orderDate: order.orderDate,
          status: order.status,
          species: item.species || 'MERANTI',
          grade: item.grade || 'EXPORT',
          thicknessMm: item.thicknessMm,
          widthMm: item.widthMm,
          lengthMm: item.lengthMm,
          orderQty,
          orderM3: parseFloat(orderM3.toFixed(4)),
          realizedQty,
          realizedM3: parseFloat(realizedM3.toFixed(4)),
          remainingQty,
          remainingM3: parseFloat(remainingM3.toFixed(4)),
          fulfillmentPct: parseFloat(pct.toFixed(1)),
        });
      });
    });

    return reportRows;
  }
}
