import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryLedgerService } from '../inventory-ledger.service';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryLedgerService: InventoryLedgerService,
  ) {}

  async createProcess(data: any) {
    const {
      company_id,
      processType,
      processDate,
      notes,
      createdBy,
      inputs,
      outputs,
    } = data;

    // Calculate volumes
    let inputVolumeM3 = 0;
    inputs.forEach((input: any) => {
      inputVolumeM3 += input.volumeM3;
    });

    let outputVolumeM3 = 0;
    let wasteVolumeM3 = 0;
    outputs.forEach((output: any) => {
      if (output.outputType === 'WASTE') {
        wasteVolumeM3 += output.volumeM3;
      } else {
        outputVolumeM3 += output.volumeM3;
      }
    });

    const yieldPercentage =
      inputVolumeM3 > 0 ? (outputVolumeM3 / inputVolumeM3) * 100 : 0;

    // Generate processNo
    const dateStr = new Date().toISOString().slice(2, 4); // yy
    const count = await this.prisma.productionProcess.count({
      where: { company_id },
    });
    const processNo = `PRD-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    return this.prisma.productionProcess.create({
      data: {
        company_id,
        processNo,
        processType,
        processDate: new Date(processDate || new Date()),
        status: 'DRAFT',
        notes,
        createdBy,
        inputVolumeM3,
        outputVolumeM3,
        wasteVolumeM3,
        yieldPercentage,
        inputs: {
          create: inputs.map((input: any) => ({
            timberStockId: input.timberStockId,
            variantId: input.variantId,
            quantityPCS: input.quantityPCS,
            volumeM3: input.volumeM3,
          })),
        },
        outputs: {
          create: outputs.map((output: any) => ({
            variantId: output.variantId,
            outputType: output.outputType,
            quantityPCS: output.quantityPCS,
            volumeM3: output.volumeM3,
            warehouseId: output.warehouseId,
          })),
        },
      },
      include: {
        inputs: true,
        outputs: true,
      },
    });
  }

  async confirmProcess(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const process = await tx.productionProcess.findUnique({
        where: { id },
        include: { inputs: true, outputs: true },
      });

      if (!process) throw new BadRequestException('Process not found');
      if (process.status !== 'DRAFT')
        throw new BadRequestException('Process must be in DRAFT status');

      // Process inputs
      let defaultWarehouseId: string | null = null;
      for (const input of process.inputs) {
        const stock = await tx.timberStock.findUnique({
          where: { id: input.timberStockId },
        });
        if (!stock)
          throw new BadRequestException(
            `Timber stock ${input.timberStockId} not found`,
          );
        if (!defaultWarehouseId) defaultWarehouseId = stock.locationId;

        await this.inventoryLedgerService.createMovement(
          tx,
          stock.locationId,
          input.variantId,
          'OUT',
          'PRODUCTION_PROCESS_INPUT',
          process.id,
          input.quantityPCS,
          input.volumeM3,
        );
      }

      // Process outputs
      for (const output of process.outputs) {
        if (
          output.outputType === 'PRODUCT' ||
          output.outputType === 'BYPRODUCT'
        ) {
          const targetWarehouseId = output.warehouseId || defaultWarehouseId;
          if (!targetWarehouseId)
            throw new BadRequestException(
              'Warehouse ID is required for outputs',
            );
          if (!output.variantId)
            throw new BadRequestException(
              'Variant ID is required for product outputs',
            );

          await this.inventoryLedgerService.createMovement(
            tx,
            targetWarehouseId,
            output.variantId,
            'IN',
            'PRODUCTION_PROCESS_OUTPUT',
            process.id,
            output.quantityPCS,
            output.volumeM3,
          );
        }
      }

      return tx.productionProcess.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { inputs: true, outputs: true },
      });
    });
  }

  async cancelProcess(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const process = await tx.productionProcess.findUnique({
        where: { id },
        include: { inputs: true, outputs: true },
      });

      if (!process) throw new BadRequestException('Process not found');
      if (process.status !== 'CONFIRMED')
        throw new BadRequestException('Process must be in CONFIRMED status');

      // Determine defaultWarehouseId from inputs
      let defaultWarehouseId: string | null = null;
      for (const input of process.inputs) {
        const stock = await tx.timberStock.findUnique({
          where: { id: input.timberStockId },
        });
        if (stock && !defaultWarehouseId) {
          defaultWarehouseId = stock.locationId;
          break;
        }
      }

      // Cancellation Safety: Check if outputs have been consumed
      for (const output of process.outputs) {
        if (output.outputType === 'PRODUCT') {
          const targetWarehouseId = output.warehouseId || defaultWarehouseId;
          if (!targetWarehouseId)
            throw new BadRequestException(
              'Warehouse ID is required for outputs',
            );
          if (!output.variantId)
            throw new BadRequestException(
              'Variant ID is required for product outputs',
            );

          const stock = await tx.timberStock.findFirst({
            where: {
              locationId: targetWarehouseId,
              timberVariantId: output.variantId,
            },
          });

          const currentPcs = stock ? stock.currentPcs : 0;
          if (currentPcs < output.quantityPCS) {
            throw new BadRequestException(
              `Cannot cancel this production. Output has already been consumed. Variant ID: ${output.variantId}, Produced: ${output.quantityPCS}, Remaining: ${currentPcs}`,
            );
          }
        }
      }

      // Reverse inputs
      for (const input of process.inputs) {
        const stock = await tx.timberStock.findUnique({
          where: { id: input.timberStockId },
        });
        if (!stock)
          throw new BadRequestException(
            `Timber stock ${input.timberStockId} not found`,
          );

        await this.inventoryLedgerService.createMovement(
          tx,
          stock.locationId,
          input.variantId,
          'IN',
          'PRODUCTION_PROCESS_REVERSAL',
          process.id,
          input.quantityPCS,
          input.volumeM3,
        );
      }

      // Reverse outputs
      for (const output of process.outputs) {
        if (
          output.outputType === 'PRODUCT' ||
          output.outputType === 'BYPRODUCT'
        ) {
          const targetWarehouseId = output.warehouseId || defaultWarehouseId;
          if (!targetWarehouseId)
            throw new BadRequestException(
              'Warehouse ID is required for outputs',
            );
          if (!output.variantId)
            throw new BadRequestException(
              'Variant ID is required for product outputs',
            );

          await this.inventoryLedgerService.createMovement(
            tx,
            targetWarehouseId,
            output.variantId,
            'OUT',
            'PRODUCTION_PROCESS_REVERSAL',
            process.id,
            output.quantityPCS,
            output.volumeM3,
          );
        }
      }

      return tx.productionProcess.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }
}
