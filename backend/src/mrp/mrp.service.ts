import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MrpService {
  private readonly logger = new Logger(MrpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateMrp(company_id: string, warehouse_id?: string) {
    this.logger.log(
      `Starting MRP calculation for company ${company_id} ${warehouse_id ? 'warehouse ' + warehouse_id : ''}`,
    );

    // 1. Fetch all products
    const products = await this.prisma.product.findMany({
      where: { company_id, status: true },
    });

    const productMap = new Map();
    const inDegree = new Map();
    const grossDemand = new Map();
    const incomingSupply = new Map();
    const availableStock = new Map();
    const demandSources = new Map();
    const supplySources = new Map();

    for (const p of products) {
      productMap.set(p.id, p);
      inDegree.set(p.id, 0);
      grossDemand.set(p.id, 0);
      incomingSupply.set(p.id, 0);
      availableStock.set(p.id, 0);
      demandSources.set(p.id, []);
      supplySources.set(p.id, []);
    }

    // 2. Fetch BOMs
    const boms = await this.prisma.bom.findMany({
      where: { company_id, status: 'ACTIVE' },
      include: { items: true },
    });

    const bomMap = new Map();
    const adjacencyList = new Map(); // product -> list of components

    for (const bom of boms) {
      bomMap.set(bom.product_id, bom);
      adjacencyList.set(bom.product_id, bom.items);
      for (const item of bom.items) {
        if (inDegree.has(item.product_id)) {
          inDegree.set(item.product_id, inDegree.get(item.product_id) + 1);
        }
      }
    }

    // 3. Fetch Stock (Available = Current - Reserved)
    const stockWhere: any = { company_id };
    if (warehouse_id) stockWhere.warehouse_id = warehouse_id;

    const stocks = await this.prisma.warehouseStock.findMany({
      where: stockWhere,
    });

    for (const st of stocks) {
      if (!availableStock.has(st.product_id)) continue;
      const currentAvail = availableStock.get(st.product_id);
      availableStock.set(
        st.product_id,
        currentAvail + (st.current_stock - st.reserved_stock),
      );
    }

    // 4. Independent Demand: Sales Orders (Not delivered, Not cancelled, Not draft)
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        company_id,
        status: { notIn: ['CANCELLED', 'DRAFT'] },
        delivery_status: { not: 'DELIVERED' },
      },
      include: { items: true },
    });

    for (const so of salesOrders) {
      for (const item of so.items) {
        if (!grossDemand.has(item.product_id)) continue;
        grossDemand.set(
          item.product_id,
          grossDemand.get(item.product_id) + item.qty,
        );
        demandSources.get(item.product_id).push({
          type: 'SALES_ORDER',
          id: so.order_number,
          qty: item.qty,
          date: so.order_date,
        });
      }
    }

    // 5. Supply: Purchase Orders
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        company_id,
        status: { notIn: ['CANCELLED', 'DRAFT'] },
        receipt_status: { not: 'RECEIVED' },
      },
      include: { items: true },
    });

    for (const po of purchaseOrders) {
      for (const item of po.items) {
        if (!incomingSupply.has(item.product_id)) continue;
        const remaining = Math.max(0, item.qty - item.received_qty);
        if (remaining > 0) {
          incomingSupply.set(
            item.product_id,
            incomingSupply.get(item.product_id) + remaining,
          );
          supplySources.get(item.product_id).push({
            type: 'PURCHASE_ORDER',
            id: po.order_number,
            qty: remaining,
            date: po.expected_receipt,
          });
        }
      }
    }

    // 6. Supply & Dependent Demand: Open Manufacturing Orders
    const manufacturingOrders = await this.prisma.manufacturingOrder.findMany({
      where: {
        company_id,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      include: { items: true },
    });

    // We also need material reservations to accurately avoid double-planning component demand.
    const materialReservations = await this.prisma.materialReservation.findMany(
      {
        where: {
          company_id,
          status: 'ACTIVE',
        },
      },
    );

    for (const mo of manufacturingOrders) {
      // MO as Supply
      if (incomingSupply.has(mo.product_id)) {
        const remainingSupply = Math.max(
          0,
          mo.planned_quantity - mo.produced_quantity,
        );
        if (remainingSupply > 0) {
          incomingSupply.set(
            mo.product_id,
            incomingSupply.get(mo.product_id) + remainingSupply,
          );
          supplySources.get(mo.product_id).push({
            type: 'MANUFACTURING_ORDER',
            id: mo.order_number,
            qty: remainingSupply,
          });
        }
      }

      // MO as Dependent Demand
      for (const item of mo.items) {
        if (!grossDemand.has(item.product_id)) continue;

        // Unreserved dependent demand
        const reservedForThisItem = materialReservations
          .filter((r) => r.manufacturing_order_item_id === item.id)
          .reduce((sum, r) => sum + r.reserved_quantity, 0);

        const unreservedDemand = Math.max(
          0,
          item.required_quantity - item.consumed_quantity - reservedForThisItem,
        );
        if (unreservedDemand > 0) {
          grossDemand.set(
            item.product_id,
            grossDemand.get(item.product_id) + unreservedDemand,
          );
          demandSources.get(item.product_id).push({
            type: 'MANUFACTURING_ORDER',
            id: mo.order_number,
            qty: unreservedDemand,
          });
        }
      }
    }

    // 7. Topological Evaluation
    const queue: any[] = [];
    for (const [productId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(productId);
    }

    let processedCount = 0;
    const results: any[] = [];

    while (queue.length > 0) {
      const productId = queue.shift();
      processedCount++;

      const product = productMap.get(productId);
      const gross = grossDemand.get(productId) || 0;
      const available = availableStock.get(productId) || 0;
      const incoming = incomingSupply.get(productId) || 0;
      const minStock = product.minimum_stock || 0;

      const net = Math.max(0, gross + minStock - available - incoming);

      let recommendation = 'COVERED';
      let suggestedQty = 0;
      let bomRef = null;

      if (net > 0) {
        suggestedQty = net;
        if (bomMap.has(productId)) {
          recommendation = 'MANUFACTURE';
          const bom = bomMap.get(productId);
          bomRef = bom.code;

          // Explode BOM dependent demand
          for (const item of adjacencyList.get(productId)) {
            const componentDemand = (net / bom.quantity) * item.quantity;
            grossDemand.set(
              item.product_id,
              grossDemand.get(item.product_id) + componentDemand,
            );
            demandSources.get(item.product_id).push({
              type: 'BOM_EXPLOSION',
              id: `Parent: ${product.name}`,
              qty: componentDemand,
            });

            // Decrement in-degree and check if ready
            const deg = inDegree.get(item.product_id) - 1;
            inDegree.set(item.product_id, deg);
            if (deg === 0) {
              queue.push(item.product_id);
            }
          }
        } else if (product.supplier_id) {
          recommendation = 'PURCHASE';
        } else {
          recommendation = 'UNRESOLVED';
        }
      } else {
        // Even if net is 0, we still need to process its components' in-degrees to unblock topological sort
        if (bomMap.has(productId)) {
          for (const item of adjacencyList.get(productId)) {
            const deg = inDegree.get(item.product_id) - 1;
            inDegree.set(item.product_id, deg);
            if (deg === 0) {
              queue.push(item.product_id);
            }
          }
        }
      }

      // Only add to results if there is some activity or requirement
      if (
        gross > 0 ||
        incoming > 0 ||
        available > 0 ||
        minStock > 0 ||
        net > 0
      ) {
        results.push({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          gross_requirement: gross,
          safety_stock: minStock,
          available_stock: available,
          incoming_supply: incoming,
          net_requirement: net,
          recommendation,
          suggested_quantity: suggestedQty,
          bom: bomRef,
          demand_sources: demandSources.get(product.id),
          supply_sources: supplySources.get(product.id),
          explanation:
            net > 0
              ? `Demand (${gross}) + Safety Stock (${minStock}) exceeds Available (${available}) and Incoming (${incoming}) by ${net}.`
              : `Supply covers all demand.`,
        });
      }
    }

    if (processedCount < products.length) {
      throw new BadRequestException(
        'Circular BOM dependency detected. MRP calculation aborted.',
      );
    }

    return {
      company_id,
      warehouse_id: warehouse_id || 'ALL',
      calculated_at: new Date(),
      total_products_evaluated: processedCount,
      results,
    };
  }
}
