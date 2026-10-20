import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto, ReportResultDto } from '../report.types';

@Injectable()
export class InventoryReportService {
  constructor(private prisma: PrismaService) {}

  async getInventoryValuation(
    filters: ReportFilterDto,
  ): Promise<ReportResultDto> {
    const whereCondition: any = {
      company_id: filters.company_id,
      remaining_quantity: { gt: 0 },
    };
    if (filters.warehouse_id)
      whereCondition.warehouse_id = filters.warehouse_id;
    if (filters.product_id) whereCondition.product_id = filters.product_id;

    const layers = await this.prisma.inventoryCostLayer.findMany({
      where: whereCondition,
      include: { product: true, warehouse: true },
    });

    let totalValuation = 0;
    const productMap = new Map<string, any>();

    layers.forEach((layer) => {
      const val = layer.remaining_quantity * layer.unit_cost;
      totalValuation += val;

      const p = layer.product;
      if (!productMap.has(p.id)) {
        productMap.set(p.id, {
          code: p.code,
          name: p.name,
          qty: 0,
          value: 0,
        });
      }
      const pData = productMap.get(p.id);
      pData.qty += layer.remaining_quantity;
      pData.value += val;
    });

    const data = Array.from(productMap.values()).map((p) => ({
      product_code: p.code,
      product_name: p.name,
      qty: p.qty,
      valuation: p.value,
    }));

    return {
      title: 'Inventory Valuation (FIFO)',
      columns: [
        { header: 'Item Code', key: 'product_code' },
        { header: 'Product Name', key: 'product_name' },
        { header: 'Remaining Qty', key: 'qty', type: 'number' },
        { header: 'Total Value', key: 'valuation', type: 'currency' },
      ],
      data,
      totals: { valuation: totalValuation },
    };
  }

  async getStockOnHand(filters: ReportFilterDto): Promise<ReportResultDto> {
    const where: any = { company_id: filters.company_id };
    if (filters.warehouse_id) where.warehouse_id = filters.warehouse_id;
    if (filters.product_id) where.product_id = filters.product_id;

    const stocks = await this.prisma.warehouseStock.findMany({
      where,
      include: { product: true, warehouse: true },
    });

    let totalQty = 0;
    const data = stocks.map((s) => {
      totalQty += s.current_stock;
      return {
        warehouse: s.warehouse.name,
        product_code: s.product.code,
        product_name: s.product.name,
        current_stock: s.current_stock,
        reserved_stock: s.reserved_stock,
        available_stock: s.available_stock,
      };
    });

    return {
      title: 'Stock On Hand',
      columns: [
        { header: 'Warehouse', key: 'warehouse' },
        { header: 'Item Code', key: 'product_code' },
        { header: 'Product Name', key: 'product_name' },
        { header: 'On Hand', key: 'current_stock', type: 'number' },
        { header: 'Allocated', key: 'reserved_stock', type: 'number' },
        { header: 'Available', key: 'available_stock', type: 'number' },
      ],
      data,
      totals: { current_stock: totalQty },
    };
  }
}
