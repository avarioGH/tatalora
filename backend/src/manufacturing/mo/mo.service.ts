import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  createFifoLayer,
  consumeFifoLayers,
} from '../../inventory/fifo.engine';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryValuationEvent } from '../../events/accounting.events';

@Injectable()
export class MoService {
  private readonly logger = new Logger(MoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createManufacturingOrder(data: any) {
    this.logger.log(`Creating MO ${data.order_number}`);
    return this.prisma.manufacturingOrder.create({
      data: {
        company_id: data.company_id,
        order_number: data.order_number,
        product_id: data.product_id,
        bom_id: data.bom_id,
        warehouse_id: data.warehouse_id,
        planned_quantity: data.planned_quantity,
        unit_id: data.unit_id,
        status: data.status || 'DRAFT',
        reservation_status: 'NOT_RESERVED',
        items: {
          create:
            data.items?.map((item: any) => ({
              product_id: item.product_id,
              required_quantity: item.required_quantity,
              unit_id: item.unit_id,
            })) || [],
        },
      },
    });
  }

  async getManufacturingOrders(company_id: string) {
    return this.prisma.manufacturingOrder.findMany({
      where: { company_id },
      include: { items: true, bom: true },
    });
  }

  async getManufacturingOrder(company_id: string, mo_id: string) {
    const mo = await this.prisma.manufacturingOrder.findFirst({
      where: { id: mo_id, company_id },
      include: {
        items: { include: { product: true } },
        product: true,
        warehouse: true,
      },
    });
    if (!mo) throw new NotFoundException('Manufacturing Order not found');

    // Add cost traceability on the fly for the response
    const movements = await this.prisma.stockMovement.findMany({
      where: { transaction_id: mo.id, company_id },
      orderBy: { id: 'asc' },
    });

    let materialCost = 0;
    let productionCost = 0;
    for (const mov of movements) {
      if (mov.movement_type === 'MANUFACTURING_CONSUMPTION')
        materialCost += mov.total_cost;
      if (mov.movement_type === 'MANUFACTURING_PRODUCTION')
        productionCost += mov.total_cost;
    }

    // Calculate labor and overhead from work orders
    const workOrders = await this.prisma.manufacturingWorkOrder.findMany({
      where: { manufacturing_order_id: mo.id },
      include: { work_center: true },
    });

    let laborCost = 0;
    let overheadCost = 0;
    for (const wo of workOrders) {
      if (wo.planned_start && wo.planned_end && wo.work_center?.cost_per_hour) {
        const hours =
          (new Date(wo.planned_end).getTime() -
            new Date(wo.planned_start).getTime()) /
          (1000 * 60 * 60);
        laborCost += hours * wo.work_center.cost_per_hour;
      }
    }

    // Add cost traceability on the fly for the response
    return {
      ...mo,
      costing: {
        materialCost,
        productionCost,
        laborCost,
        overheadCost, // Currently defaults to 0 as we don't have separate overhead in DB
        unitProductionCost:
          mo.produced_quantity > 0
            ? (productionCost + laborCost + overheadCost) / mo.produced_quantity
            : 0,
      },
    };
  }

  async getMaterialAvailability(company_id: string, mo_id: string) {
    const mo = await this.prisma.manufacturingOrder.findFirst({
      where: { id: mo_id, company_id },
      include: { items: true },
    });

    if (!mo) throw new NotFoundException('Manufacturing Order not found');

    const components: any[] = [];
    let totalRequired = 0;
    let totalReserved = 0;
    let totalShortage = 0;

    for (const item of mo.items) {
      const stock = await this.prisma.warehouseStock.findUnique({
        where: {
          company_id_warehouse_id_product_id: {
            company_id,
            warehouse_id: mo.warehouse_id,
            product_id: item.product_id,
          },
        },
      });

      const onHand = stock ? stock.current_stock : 0;
      const allActiveRes = await this.prisma.materialReservation.aggregate({
        where: {
          company_id,
          warehouse_id: mo.warehouse_id,
          product_id: item.product_id,
          status: 'ACTIVE',
        },
        _sum: { reserved_quantity: true },
      });
      const globalReserved = allActiveRes._sum.reserved_quantity || 0;

      const ownRes = await this.prisma.materialReservation.aggregate({
        where: {
          company_id,
          manufacturing_order_id: mo.id,
          manufacturing_order_item_id: item.id,
          status: 'ACTIVE',
        },
        _sum: { reserved_quantity: true },
      });
      const previouslyReservedQty = ownRes._sum.reserved_quantity || 0;
      const globalAvailable = Math.max(onHand - globalReserved, 0);
      const availableForThisMo = globalAvailable + previouslyReservedQty;
      const remainingRequirement = Math.max(
        item.required_quantity - item.consumed_quantity - previouslyReservedQty,
        0,
      );
      const shortageQty = Math.max(remainingRequirement - globalAvailable, 0);

      let reservationStatus = 'NOT_RESERVED';
      if (
        previouslyReservedQty >=
          item.required_quantity - item.consumed_quantity &&
        item.required_quantity - item.consumed_quantity > 0
      ) {
        reservationStatus = 'FULL';
      } else if (previouslyReservedQty > 0) {
        reservationStatus = 'PARTIAL';
      }

      components.push({
        product_id: item.product_id,
        manufacturing_order_item_id: item.id,
        requiredQty: item.required_quantity,
        consumedQty: item.consumed_quantity,
        previouslyReservedQty,
        onHandQty: onHand,
        globalReserved,
        availableForThisMo,
        shortageQty,
        reservationStatus,
      });

      totalRequired += item.required_quantity - item.consumed_quantity;
      totalReserved += previouslyReservedQty;
      totalShortage += shortageQty;
    }

    let overallStatus = 'NOT_RESERVED';
    if (totalRequired > 0 && totalReserved >= totalRequired)
      overallStatus = 'FULL';
    else if (totalReserved > 0) overallStatus = 'PARTIAL';

    return {
      manufacturingOrderId: mo.id,
      status: overallStatus,
      components,
      totalRequired,
      totalReserved,
      totalShortage,
    };
  }

  async reserveMaterials(company_id: string, mo_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
        include: { items: true },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');

      for (const item of mo.items) {
        const stock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id: mo.warehouse_id,
              product_id: item.product_id,
            },
          },
        });
        const onHand = stock ? stock.current_stock : 0;

        const allActiveRes = await tx.materialReservation.aggregate({
          where: {
            company_id,
            warehouse_id: mo.warehouse_id,
            product_id: item.product_id,
            status: 'ACTIVE',
          },
          _sum: { reserved_quantity: true },
        });
        const globalReserved = allActiveRes._sum.reserved_quantity || 0;

        const ownRes = await tx.materialReservation.aggregate({
          where: {
            company_id,
            manufacturing_order_id: mo.id,
            manufacturing_order_item_id: item.id,
            status: 'ACTIVE',
          },
          _sum: { reserved_quantity: true },
        });
        const previouslyReservedQty = ownRes._sum.reserved_quantity || 0;
        const remainingRequirement = Math.max(
          item.required_quantity -
            item.consumed_quantity -
            previouslyReservedQty,
          0,
        );
        if (remainingRequirement <= 0) continue;

        const globalAvailable = Math.max(onHand - globalReserved, 0);
        const toReserve = Math.min(remainingRequirement, globalAvailable);

        if (toReserve > 0 && stock) {
          const resUpd = await tx.warehouseStock.updateMany({
            where: { id: stock.id, available_stock: { gte: toReserve } },
            data: {
              reserved_stock: { increment: toReserve },
              available_stock: { decrement: toReserve },
            },
          });
          if (resUpd.count === 0) {
            throw new BadRequestException(
              'Concurrency conflict or insufficient stock to reserve product ' +
                stock.product_id,
            );
          }

          await tx.materialReservation.create({
            data: {
              company_id,
              manufacturing_order_id: mo.id,
              manufacturing_order_item_id: item.id,
              product_id: item.product_id,
              warehouse_id: mo.warehouse_id,
              reserved_quantity: toReserve,
              status: 'ACTIVE',
            },
          });
        }
      }

      const availabilityAfter = await this.getMaterialAvailabilityTx(
        tx,
        company_id,
        mo,
      );
      await tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { reservation_status: availabilityAfter.status },
      });
      return availabilityAfter;
    });
  }

  async releaseReservation(company_id: string, mo_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');

      const activeReservations = await tx.materialReservation.findMany({
        where: { company_id, manufacturing_order_id: mo.id, status: 'ACTIVE' },
      });

      for (const res of activeReservations) {
        await tx.warehouseStock.update({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id: res.warehouse_id,
              product_id: res.product_id,
            },
          },
          data: {
            reserved_stock: { decrement: res.reserved_quantity },
            available_stock: { increment: res.reserved_quantity },
          },
        });
        await tx.materialReservation.update({
          where: { id: res.id },
          data: { status: 'RELEASED', released_at: new Date() },
        });
      }

      await tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { reservation_status: 'RELEASED' },
      });

      return {
        message: 'Reservations released successfully',
        released_count: activeReservations.length,
      };
    });
  }

  private async getMaterialAvailabilityTx(
    tx: any,
    company_id: string,
    mo: any,
  ) {
    let totalRequired = 0;
    let totalReserved = 0;
    for (const item of mo.items) {
      const ownRes = await tx.materialReservation.aggregate({
        where: {
          company_id,
          manufacturing_order_id: mo.id,
          manufacturing_order_item_id: item.id,
          status: 'ACTIVE',
        },
        _sum: { reserved_quantity: true },
      });
      totalRequired += item.required_quantity - item.consumed_quantity;
      totalReserved += ownRes._sum.reserved_quantity || 0;
    }
    let status = 'NOT_RESERVED';
    if (totalRequired > 0 && totalReserved >= totalRequired) status = 'FULL';
    else if (totalReserved > 0) status = 'PARTIAL';
    return { status, totalRequired, totalReserved };
  }

  async startProduction(company_id: string, mo_id: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');
      if (mo.status !== 'CONFIRMED')
        throw new BadRequestException(`Cannot start MO in status ${mo.status}`);

      return tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { status: 'IN_PROGRESS', actual_start_date: new Date() },
      });
    });
  }

  async consumeMaterials(
    company_id: string,
    mo_id: string,
    items: { manufacturing_order_item_id: string; quantity: number }[],
    user_id: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
        include: { items: true },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');
      if (mo.status !== 'IN_PROGRESS' && mo.status !== 'CONFIRMED') {
        throw new BadRequestException(
          `Cannot consume materials for MO in status ${mo.status}`,
        );
      }
      if (mo.status === 'CONFIRMED') {
        await tx.manufacturingOrder.update({
          where: { id: mo.id },
          data: { status: 'IN_PROGRESS', actual_start_date: new Date() },
        });
      }

      for (const reqItem of items) {
        if (reqItem.quantity <= 0) continue;
        const moItem = mo.items.find(
          (i: any) => i.id === reqItem.manufacturing_order_item_id,
        );
        if (!moItem) throw new BadRequestException(`Item not found in MO`);

        const remainingToConsume =
          moItem.required_quantity - moItem.consumed_quantity;
        if (reqItem.quantity > remainingToConsume) {
          throw new BadRequestException(
            `Cannot consume ${reqItem.quantity}. Only ${remainingToConsume} required.`,
          );
        }

        const stock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id: mo.warehouse_id,
              product_id: moItem.product_id,
            },
          },
          include: { product: true },
        });
        if (!stock || stock.current_stock < reqItem.quantity) {
          throw new BadRequestException(`Insufficient physical stock`);
        }

        // STEP 16.5 - True FIFO Costing (Deferred to after movement creation)
        let total_cost = 0;

        let qtyToReleaseFromReservation = 0;
        const activeReservations = await tx.materialReservation.findMany({
          where: {
            company_id,
            manufacturing_order_id: mo.id,
            manufacturing_order_item_id: moItem.id,
            status: 'ACTIVE',
          },
          orderBy: { created_at: 'asc' },
        });

        let remainingToRelease = reqItem.quantity;
        for (const res of activeReservations) {
          if (remainingToRelease <= 0) break;
          const releaseAmount = Math.min(
            res.reserved_quantity,
            remainingToRelease,
          );

          if (releaseAmount === res.reserved_quantity) {
            await tx.materialReservation.update({
              where: { id: res.id },
              data: {
                status: 'RELEASED',
                released_at: new Date(),
                reserved_quantity: 0,
              },
            });
          } else {
            await tx.materialReservation.update({
              where: { id: res.id },
              data: { reserved_quantity: { decrement: releaseAmount } },
            });
          }
          qtyToReleaseFromReservation += releaseAmount;
          remainingToRelease -= releaseAmount;
        }

        const unreservedConsumption =
          reqItem.quantity - qtyToReleaseFromReservation;

        await tx.warehouseStock.update({
          where: { id: stock.id },
          data: {
            current_stock: { decrement: reqItem.quantity },
            reserved_stock: { decrement: qtyToReleaseFromReservation },
            available_stock: { decrement: unreservedConsumption },
          },
        });

        await tx.manufacturingOrderItem.update({
          where: { id: moItem.id },
          data: { consumed_quantity: { increment: reqItem.quantity } },
        });

        const mov = await tx.stockMovement.create({
          data: {
            company_id,
            warehouse_id: mo.warehouse_id,
            product_id: moItem.product_id,
            transaction_type: 'MANUFACTURING',
            transaction_id: mo.id,
            movement_type: 'MANUFACTURING_CONSUMPTION',
            qty_in: 0,
            qty_out: reqItem.quantity,
            balance_after: stock.current_stock - reqItem.quantity,
            unit_cost: 0,
            total_cost: 0,
            created_by: user_id,
            reference_number: mo.order_number,
            remarks: `Consumed for MO ${mo.order_number}`,
          },
        });

        // STEP 16.5 - True FIFO Consumption
        const { totalCogs, consumed } = await consumeFifoLayers(tx, {
          companyId: company_id,
          productId: moItem.product_id,
          warehouseId: mo.warehouse_id,
          quantity: reqItem.quantity,
          stockMovementId: mov.id,
        });

        const actual_unit_cost =
          reqItem.quantity > 0 ? totalCogs / reqItem.quantity : 0;
        await tx.stockMovement.update({
          where: { id: mov.id },
          data: { unit_cost: actual_unit_cost, total_cost: totalCogs },
        });

        if (totalCogs > 0) {
          await this.eventEmitter.emitAsync(
            'inventory.valuation',
            new InventoryValuationEvent(
              company_id,
              mov.id, // Stock movement id acts as source entity for tracing
              `VAL-MO-CONS-${mov.id}`,
              new Date(),
              {
                type: 'MANUFACTURING_CONSUMPTION',
                totalValue: totalCogs,
                description: `Material Consumed for MO ${mo.order_number}`,
              },
              tx,
            ),
          );
        }
      }

      const availabilityAfter = await this.getMaterialAvailabilityTx(
        tx,
        company_id,
        mo,
      );
      await tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { reservation_status: availabilityAfter.status },
      });

      return { message: 'Materials consumed successfully' };
    });
  }

  async produceFinishedGoods(
    company_id: string,
    mo_id: string,
    quantity: number,
    user_id: string,
  ) {
    if (quantity <= 0)
      throw new BadRequestException('Production quantity must be positive');

    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');
      if (mo.status !== 'IN_PROGRESS' && mo.status !== 'CONFIRMED') {
        throw new BadRequestException(
          `Cannot produce goods for MO in status ${mo.status}`,
        );
      }

      const remainingToProduce = mo.planned_quantity - mo.produced_quantity;
      if (quantity > remainingToProduce) {
        throw new BadRequestException(
          `Cannot produce ${quantity}. Only ${remainingToProduce} remaining to produce.`,
        );
      }

      if (mo.status === 'CONFIRMED') {
        await tx.manufacturingOrder.update({
          where: { id: mo.id },
          data: { status: 'IN_PROGRESS', actual_start_date: new Date() },
        });
      }

      // 14.4 Costing - Calculate Allocated Cost
      const consumedMovements = await tx.stockMovement.aggregate({
        where: {
          transaction_id: mo.id,
          movement_type: 'MANUFACTURING_CONSUMPTION',
          company_id,
        },
        _sum: { total_cost: true },
      });
      const producedMovements = await tx.stockMovement.aggregate({
        where: {
          transaction_id: mo.id,
          movement_type: 'MANUFACTURING_PRODUCTION',
          company_id,
        },
        _sum: { total_cost: true },
      });

      const totalConsumedCost = consumedMovements._sum.total_cost || 0;
      const totalProducedCost = producedMovements._sum.total_cost || 0;
      const remainingWipCost = Math.max(
        totalConsumedCost - totalProducedCost,
        0,
      );

      let allocatedCost = 0;
      if (mo.produced_quantity + quantity >= mo.planned_quantity) {
        // Final production, absorb all remaining WIP cost
        allocatedCost = remainingWipCost;
      } else {
        // Partial production, allocate proportionally to remaining unproduced units
        const unitsLeft = mo.planned_quantity - mo.produced_quantity;
        if (unitsLeft > 0) {
          allocatedCost = (remainingWipCost / unitsLeft) * quantity;
        }
      }

      const unit_cost = quantity > 0 ? allocatedCost / quantity : 0;

      let stock = await tx.warehouseStock.findUnique({
        where: {
          company_id_warehouse_id_product_id: {
            company_id,
            warehouse_id: mo.warehouse_id,
            product_id: mo.product_id,
          },
        },
      });

      if (!stock) {
        stock = await tx.warehouseStock.create({
          data: {
            company_id,
            warehouse_id: mo.warehouse_id,
            product_id: mo.product_id,
            current_stock: 0,
            available_stock: 0,
            reserved_stock: 0,
          },
        });
      }

      await tx.warehouseStock.update({
        where: { id: stock.id },
        data: {
          current_stock: { increment: quantity },
          available_stock: { increment: quantity },
        },
      });

      const updatedMo = await tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { produced_quantity: { increment: quantity } },
      });

      const mov = await tx.stockMovement.create({
        data: {
          company_id,
          warehouse_id: mo.warehouse_id,
          product_id: mo.product_id,
          transaction_type: 'MANUFACTURING',
          transaction_id: mo.id,
          movement_type: 'MANUFACTURING_PRODUCTION',
          qty_in: quantity,
          qty_out: 0,
          balance_after: stock.current_stock + quantity,
          unit_cost: unit_cost,
          total_cost: allocatedCost,
          created_by: user_id,
          reference_number: mo.order_number,
          remarks: `Produced from MO ${mo.order_number}`,
        },
      });

      if (allocatedCost > 0) {
        await this.eventEmitter.emitAsync(
          'inventory.valuation',
          new InventoryValuationEvent(
            company_id,
            mov.id,
            `VAL-MO-PROD-${mov.id}`,
            new Date(),
            {
              type: 'MANUFACTURING_PRODUCTION',
              totalValue: allocatedCost,
              description: `Finished Goods Produced for MO ${mo.order_number}`,
            },
            tx,
          ),
        );
      }

      if (updatedMo.produced_quantity >= updatedMo.planned_quantity) {
        await tx.manufacturingOrder.update({
          where: { id: mo.id },
          data: { status: 'COMPLETED', actual_end_date: new Date() },
        });
      }

      return {
        message: 'Finished goods produced successfully',
        produced_quantity: updatedMo.produced_quantity,
      };
    });
  }

  async completeProduction(company_id: string, mo_id: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');

      if (mo.produced_quantity < mo.planned_quantity) {
        throw new BadRequestException(
          'Cannot complete MO. Production quantity is less than planned.',
        );
      }

      return tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { status: 'COMPLETED', actual_end_date: new Date() },
      });
    });
  }

  async cancelProduction(company_id: string, mo_id: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const mo = await tx.manufacturingOrder.findFirst({
        where: { id: mo_id, company_id },
      });
      if (!mo) throw new NotFoundException('Manufacturing Order not found');

      if (mo.status === 'COMPLETED') {
        throw new BadRequestException('Cannot cancel a completed MO');
      }

      const activeReservations = await tx.materialReservation.findMany({
        where: { company_id, manufacturing_order_id: mo.id, status: 'ACTIVE' },
      });

      for (const res of activeReservations) {
        await tx.warehouseStock.update({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id: res.warehouse_id,
              product_id: res.product_id,
            },
          },
          data: {
            reserved_stock: { decrement: res.reserved_quantity },
            available_stock: { increment: res.reserved_quantity },
          },
        });
        await tx.materialReservation.update({
          where: { id: res.id },
          data: { status: 'CANCELLED', released_at: new Date() },
        });
      }

      return tx.manufacturingOrder.update({
        where: { id: mo.id },
        data: { status: 'CANCELLED', reservation_status: 'RELEASED' },
      });
    });
  }
}
