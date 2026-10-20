import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FishPurchaseService {
  constructor(private prisma: PrismaService) {}

  async createAtomicPurchase(data: any, reqUser: any) {
    let { partner_id, warehouse_id, date, items, paid_amount, payment_method, payment_terms } = data;
    items = items.map((i: any) => ({
      ...i,
      qty: Number(i.qty || 0),
      unit_price: Number(i.unit_price || 0)
    }));
    paid_amount = Number(paid_amount || 0);
    const company_id = reqUser.company_id || reqUser.companyId;
    const created_by = reqUser.userId || reqUser.id; // user ID

    if (!partner_id || !warehouse_id || !items || items.length === 0) {
      throw new BadRequestException('Missing required fields for Fish Purchase');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Purchase Order
      let total_amount = 0;
      items.forEach((i: any) => {
        total_amount += (i.qty * i.unit_price);
      });

      const orderNumber = `FP-${Date.now()}`;
      
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          company_id,
          supplier_id: partner_id,
          warehouse_id,
          order_number: orderNumber,
          order_date: new Date(date),
          status: 'COMPLETED',
          receipt_status: 'RECEIVED',
          bill_status: paid_amount >= total_amount ? 'BILLED' : 'PENDING',
          payment_status: paid_amount >= total_amount ? 'PAID' : (paid_amount > 0 ? 'PARTIAL' : 'UNPAID'),
          total_amount,
        }
      });

      // 2. Create Purchase Order Items & Goods Receipt Items
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          company_id,
          purchase_order_id: purchaseOrder.id,
          supplier_id: partner_id,
          warehouse_id,
          receipt_number: `GR-${orderNumber}`,
          receipt_date: new Date(date),
          status: 'RECEIVED',
        }
      });

      for (const item of items) {
        const poItem = await tx.purchaseOrderItem.create({
          data: {
            purchase_order_id: purchaseOrder.id,
            product_id: item.product_id,
            qty: item.qty,
            unit_price: item.unit_price,
            subtotal: item.qty * item.unit_price,
            received_qty: item.qty,
            billed_qty: item.qty,
          }
        });

        await tx.goodsReceiptItem.create({
          data: {
            goods_receipt_id: goodsReceipt.id,
            product_id: item.product_id,
            qty: item.qty,
          }
        });

        // Update Inventory Stock (WarehouseStock)
        let stock = await tx.warehouseStock.findUnique({
          where: {
            company_id_warehouse_id_product_id: {
              company_id,
              warehouse_id,
              product_id: item.product_id
            }
          }
        });
        
        if (!stock) {
          stock = await tx.warehouseStock.create({
            data: {
              company_id,
              warehouse_id,
              product_id: item.product_id,
              current_stock: item.qty,
              available_stock: item.qty
            }
          });
        } else {
          stock = await tx.warehouseStock.update({
            where: { id: stock.id },
            data: {
              current_stock: stock.current_stock + item.qty,
              available_stock: stock.available_stock + item.qty
            }
          });
        }

        // Add Stock Movement
        await tx.stockMovement.create({
          data: {
            company_id,
            warehouse_id,
            product_id: item.product_id,
            transaction_type: 'IN',
            transaction_id: goodsReceipt.id,
            movement_type: 'PURCHASE_IN',
            qty_in: item.qty,
            balance_after: stock.current_stock,
            created_by,
          }
        });
      }

      // 3. Accounts Payable Logic (Invoice + Payment if paid)
      const invoice = await tx.invoice.create({
        data: {
          company_id,
          type: 'AP',
          purchase_order_id: purchaseOrder.id,
          customer_id: partner_id, // we mapped it to Customer model
          invoice_number: `INV-AP-${orderNumber}`,
          invoice_date: new Date(date),
          due_date: (() => {
            const d = new Date(date);
            if (payment_terms) {
              d.setDate(d.getDate() + parseInt(payment_terms));
            }
            return d;
          })(),
          status: paid_amount >= total_amount ? 'PAID' : (paid_amount > 0 ? 'PARTIALLY PAID' : 'POSTED'),
          subtotal: total_amount,
          tax: 0,
          total: total_amount,
          remaining_amount: Math.max(0, total_amount - paid_amount),
        }
      });

      for (const item of items) {
        await tx.invoiceItem.create({
          data: {
            invoice_id: invoice.id,
            product_id: item.product_id,
            qty: item.qty,
            unit_price: item.unit_price,
            subtotal: item.qty * item.unit_price,
            tax: 0,
            
          }
        });
      }

      // If there is any upfront payment
      if (paid_amount > 0) {
        const payment = await tx.payment.create({
          data: {
            company_id,
            customer_id: partner_id, // we unified
            invoice_id: invoice.id,
            payment_number: `PAY-${Date.now()}`,
            payment_date: new Date(date),
            amount: paid_amount,
            payment_method: payment_method || 'CASH',
            notes: 'Downpayment for fish purchase'
          }
        });

        await tx.paymentAllocation.create({
          data: {
            payment_id: payment.id,
            invoice_id: invoice.id,
            amount: paid_amount
          }
        });
      }

      return purchaseOrder;
    });
  }
}
