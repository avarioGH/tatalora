import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FishProcessingService {
  constructor(private prisma: PrismaService) {}

  async processStock(data: any, reqUser: any) {
    const { date, notes, inputs, outputs } = data;
    const company_id = (reqUser.company_id || reqUser.companyId);
    const created_by = reqUser.userId || reqUser.id;

    if (!inputs || inputs.length === 0 || !outputs || outputs.length === 0) {
      throw new BadRequestException('Inputs and outputs are required');
    }

    return this.prisma.$transaction(async (tx) => {
      const transformNo = `TRF-${Date.now()}`;
      
      const transformation = await tx.stockTransformation.create({
        data: {
          company: { connect: { id: company_id } },
          transform_no: transformNo,
          date: new Date(date || new Date()),
          notes,
          user: { connect: { id: created_by } },
          status: 'COMPLETED'
        }
      });

      let totalInputCost = 0;

      // Process Inputs (Deduct Stock)
      for (const input of inputs) {
        let stock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id: input.warehouse_id,
              product_id: input.product_id
            }
          }
        });

        if (!stock || stock.current_stock < input.qty) {
          throw new BadRequestException(`Insufficient stock for product ID: ${input.product_id}`);
        }

        // We assume cost logic here is simple average or last cost, but since we don't have cost readily available in WarehouseStock, we will use 0 for now or fetch from product
        const unitCost = 0; // Enhance this later with actual cost layers
        const totalCost = unitCost * input.qty;
        totalInputCost += totalCost;

        await tx.stockTransformationInput.create({
          data: {
            transformation_id: transformation.id,
            warehouse_id: input.warehouse_id,
            product_id: input.product_id,
            qty: input.qty,
            unit_cost: unitCost,
            total_cost: totalCost
          }
        });

        await tx.warehouseStock.update({
          where: { id: stock.id },
          data: {
            current_stock: stock.current_stock - input.qty,
            available_stock: stock.available_stock - input.qty
          }
        });

        await tx.stockMovement.create({
          data: {
            company_id,
            warehouse_id: input.warehouse_id,
            product_id: input.product_id,
            transaction_type: 'OUT',
            transaction_id: transformation.id,
            movement_type: 'TRANSFORMATION_OUT', // We can use ADJUSTMENT_MINUS if not using enums strictly, or add new enum
            qty_out: input.qty,
            balance_after: stock.current_stock - input.qty,
            created_by,
          }
        });
      }

      // Process Outputs (Increase Stock)
      // We distribute the totalInputCost over the outputs based on qty proportion
      const totalOutputQty = outputs.reduce((sum, o) => sum + o.qty, 0);

      for (const output of outputs) {
        const outputCost = totalOutputQty > 0 ? (totalInputCost * (output.qty / totalOutputQty)) : 0;
        const unitCost = output.qty > 0 ? outputCost / output.qty : 0;

        await tx.stockTransformationOutput.create({
          data: {
            transformation_id: transformation.id,
            warehouse_id: output.warehouse_id,
            product_id: output.product_id,
            qty: output.qty,
            unit_cost: unitCost,
            total_cost: outputCost
          }
        });

        let stock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id: output.warehouse_id,
              product_id: output.product_id
            }
          }
        });

        if (!stock) {
          stock = await tx.warehouseStock.create({
            data: {
              company_id,
              warehouse_id: output.warehouse_id,
              product_id: output.product_id,
              current_stock: output.qty,
              available_stock: output.qty
            }
          });
        } else {
          stock = await tx.warehouseStock.update({
            where: { id: stock.id },
            data: {
              current_stock: stock.current_stock + output.qty,
              available_stock: stock.available_stock + output.qty
            }
          });
        }

        await tx.stockMovement.create({
          data: {
            company_id,
            warehouse_id: output.warehouse_id,
            product_id: output.product_id,
            transaction_type: 'IN',
            transaction_id: transformation.id,
            movement_type: 'TRANSFORMATION_IN',
            qty_in: output.qty,
            balance_after: stock.current_stock,
            created_by,
          }
        });
      }

      return transformation;
    });
  }

  async getTransformations(reqUser: any) {
    return this.prisma.stockTransformation.findMany({
      where: { company_id: (reqUser.company_id || reqUser.companyId) },
      include: {
        inputs: { include: { product: true, warehouse: true } },
        outputs: { include: { product: true, warehouse: true } },
        user: true
      },
      orderBy: { date: 'desc' }
    });
  }
}
