import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory.service';
import { CreateDisposalDto } from './disposal.dto';
import { InventoryValuationEvent } from '../../events/accounting.events';

@Injectable()
export class DisposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(companyId: string) {
    return this.prisma.inventoryDisposal.findMany({
      where: { company_id: companyId },
      include: {
        warehouse: true,
        creator: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async detail(id: string, companyId: string) {
    const disposal = await this.prisma.inventoryDisposal.findFirst({
      where: { id, company_id: companyId },
      include: {
        items: {
          include: { product: true },
        },
        warehouse: true,
        creator: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    if (!disposal) throw new NotFoundException('Disposal not found');
    return disposal;
  }

  async create(dto: CreateDisposalDto, userId: string) {
    const nextNum = await this.prisma.inventoryDisposal.count({
      where: { company_id: dto.companyId as string },
    });
    const disposalNo = `DSP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(nextNum + 1).padStart(4, '0')}`;

    return this.prisma.inventoryDisposal.create({
      data: {
        company_id: dto.companyId as string,
        warehouse_id: dto.warehouseId,
        disposal_number: disposalNo,
        disposal_date: new Date(),
        reason: dto.reason || dto.notes || "Disposal",
        notes: dto.notes,
        status: 'DRAFT',
        created_by: userId,
        items: {
          create: dto.items.map((item) => ({
            product_id: item.productId,
            qty: item.quantity,
            notes: item.reason,
          })),
        },
      },
      include: { items: true },
    });
  }

  async submit(id: string, companyId: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'DRAFT')
      throw new BadRequestException('Only DRAFT disposal can be submitted');

    return this.prisma.inventoryDisposal.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }

  async cancel(id: string, companyId: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'PENDING' && disposal.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only PENDING or DRAFT disposal can be cancelled',
      );
    }

    return this.prisma.inventoryDisposal.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async reject(id: string, companyId: string, userId: string, notes?: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'PENDING')
      throw new BadRequestException('Only PENDING disposal can be rejected');

    return this.prisma.inventoryDisposal.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: notes
          ? `${disposal.notes || ''}\nReject Notes: ${notes}`
          : disposal.notes,
      },
    });
  }

  async approve(id: string, companyId: string, userId: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'PENDING')
      throw new BadRequestException('Only PENDING disposal can be approved');

    return this.prisma.$transaction(async (tx) => {
      // 1. Atomic Guard
      const check = await (tx as any).inventoryDisposal.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'PROCESSING' }
      });
      if (check.count === 0) {
        throw new BadRequestException('Disposal not pending or already processed');
      }

      // 2. Update status to APPROVED
      const updated = await tx.inventoryDisposal.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by: userId,
          approved_at: new Date(),
        },
      });

      // 3. Issue stock and calculate consumed cost
      let totalConsumedCost = 0;
      for (const item of disposal.items) {
        const issueResult = await this.inventoryService.issueStock(tx, {
          companyId,
          warehouseId: disposal.warehouse_id,
          productId: item.product_id,
          quantity: item.qty,
          referenceType: 'DISPOSAL',
          referenceId: id,
          userId,
          description: `Disposal ${disposal.disposal_number}`,
          allowNegative: false,
        });
        if (issueResult.consumedCost) {
          totalConsumedCost += issueResult.consumedCost;
        }
      }

      if (totalConsumedCost > 0) {
        this.eventEmitter.emit(
          'inventory.valuation',
          new InventoryValuationEvent(
            companyId,
            id,
            `DSP_VAL_${Date.now()}`,
            new Date(),
            {
              type: 'DISPOSAL_LOSS',
              totalValue: totalConsumedCost,
              description: `Disposal ${disposal.disposal_number}`,
            },
            tx,
          ),
        );
      }

      // 4. Log Audit
      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          action: 'APPROVE',
          entity: 'InventoryDisposal',
          entity_id: id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          after_data: updated as any,
        },
      });

      return updated;
    });
  }

  async update(id: string, dto: Partial<CreateDisposalDto>, companyId: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT disposal can be updated');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.inventoryDisposalItem.deleteMany({
          where: { disposal_id: id }
        });
      }

      return tx.inventoryDisposal.update({
        where: { id },
        data: {
          warehouse_id: dto.warehouseId,
          reason: dto.reason,
          notes: dto.notes,
          ...(dto.items && {
            items: {
              create: dto.items.map(item => ({
                product_id: item.productId,
                qty: item.quantity,
                notes: item.reason,
              }))
            }
          })
        },
        include: { items: true }
      });
    });
  }

  async delete(id: string, companyId: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT disposal can be deleted');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryDisposalItem.deleteMany({
        where: { disposal_id: id }
      });
      return tx.inventoryDisposal.delete({
        where: { id }
      });
    });
  }

  async reverse(id: string, companyId: string, userId: string) {
    const disposal = await this.detail(id, companyId);
    if (disposal.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED disposal can be reversed');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Atomic Guard
      const check = await (tx as any).inventoryDisposal.updateMany({
        where: { id, status: 'APPROVED' },
        data: { status: 'PROCESSING_REVERSAL' }
      });
      if (check.count === 0) {
        throw new BadRequestException('Disposal not approved or already processing reversal');
      }

      // 2. Fetch Stock Movements and Cost Layers to calculate unit cost
      const stockMovements = await tx.stockMovement.findMany({
        where: {
          transaction_id: id,
          transaction_type: 'DISPOSAL'
        },
        include: {
          CostLayerConsumption: true
        }
      });

      let totalConsumedCost = 0;

      // 3. Receive stock for each item using calculated unit cost
      for (const item of disposal.items) {
        // Find the corresponding stock movement for this product
        const movement = stockMovements.find(sm => sm.product_id === item.product_id);
        let unitCost = 0;
        
        if (movement) {
          // Sum the cost from CostLayerConsumption
          const itemTotalCost = movement.CostLayerConsumption.reduce((sum, layer) => sum + layer.total_cost, 0);
          const itemTotalQty = movement.CostLayerConsumption.reduce((sum, layer) => sum + layer.quantity, 0);
          
          if (itemTotalQty > 0) {
            unitCost = itemTotalCost / itemTotalQty;
            totalConsumedCost += itemTotalCost;
          }
        } else {
           // Fallback to purchase price if no movement found
           unitCost = item.product.purchase_price;
           totalConsumedCost += (unitCost * item.qty);
        }

        await this.inventoryService.receiveStock(tx, {
          companyId,
          warehouseId: disposal.warehouse_id,
          productId: item.product_id,
          quantity: item.qty,
          unitCost: unitCost,
          referenceType: 'DISPOSAL_REVERSAL',
          referenceId: id,
          userId,
          description: `Reversal of Disposal ${disposal.disposal_number}`,
        });
      }

      // 4. Emit Reversal Event
      if (totalConsumedCost > 0) {
        this.eventEmitter.emit(
          'inventory.valuation',
          new InventoryValuationEvent(
            companyId,
            id,
            `DSP_REV_VAL_${Date.now()}`,
            new Date(),
            {
              type: 'DISPOSAL_LOSS_REVERSAL',
              totalValue: totalConsumedCost,
              description: `Reversal of Disposal ${disposal.disposal_number}`,
            },
            tx,
          ),
        );
      }

      // 5. Update status to REVERSED
      const updated = await tx.inventoryDisposal.update({
        where: { id },
        data: {
          status: 'REVERSED',
          // could clear approved_by or keep it for record
        },
      });

      // 6. Log Audit
      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          action: 'REVERSE',
          entity: 'InventoryDisposal',
          entity_id: id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          after_data: updated as any,
        },
      });

      return updated;
    });
  }
}
