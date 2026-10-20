import { NotificationService } from '../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createFifoLayer } from '../inventory/fifo.engine';
import { InventoryService } from '../inventory/inventory.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasingService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private inventoryService: InventoryService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getPurchaseRequests(
    companyId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { company_id: companyId };

    if (search) {
      where.OR = [
        { request_number: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      (this.prisma.purchaseRequest as any).findMany({
        where,
        include: { items: { include: { product: true } } },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      (this.prisma.purchaseRequest as any).count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPurchaseRequest(companyId: string, data: any) {
    return (this.prisma.purchaseRequest as any).create({
      data: {
        company_id: companyId,
        request_number: `PR-${Date.now()}`,
        required_date: data.requiredDate ? new Date(data.requiredDate) : null,
        source: data.source || 'MANUAL',
        status: 'SUBMITTED',
        reason: data.reason,
        warehouse_id: data.warehouseId,
        items: {
          create: data.items.map((i: any) => ({
            product_id: i.productId,
            qty: i.qty,
            unit: i.unit,
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    });
  }

  async setSupplierProductPrice(companyId: string, data: any) {
    const existing = await this.prisma.supplierProduct.findFirst({
      where: {
        company_id: companyId,
        supplier_id: data.supplierId,
        product_id: data.productId,
      },
    });

    if (existing) {
      return this.prisma.supplierProduct.update({
        where: { id: existing.id },
        data: {
          unit_price: data.unitPrice,
          minimum_order_qty: data.minQty,
          lead_time_days: data.leadTime,
          supplier_sku: data.supplierSku,
          active: true,
        },
      });
    } else {
      return this.prisma.supplierProduct.create({
        data: {
          company_id: companyId,
          supplier_id: data.supplierId,
          product_id: data.productId,
          unit_price: data.unitPrice,
          minimum_order_qty: data.minQty || 1,
          lead_time_days: data.leadTime || 0,
          supplier_sku: data.supplierSku,
          active: true,
        },
      });
    }
  }

  async getVendorComparison(companyId: string, productId: string) {
    return this.prisma.supplierProduct.findMany({
      where: { company_id: companyId, product_id: productId, active: true },
      include: { supplier: true },
      orderBy: { unit_price: 'asc' },
    });
  }

  async createRFQ(companyId: string, data: any) {
    const {
      supplierId,
      orderDate,
      expectedReceipt,
      notes,
      paymentTerms,
      items,
      warehouseId,
    } = data;

    const supplier = await this.prisma.customer.findUnique({
      where: { id: supplierId },
    });
    if (!supplier || supplier.company_id !== companyId)
      throw new BadRequestException('Invalid supplier');

    const orderNumber = `RFQ-${Date.now()}`;

    let total = 0;
    const itemData = items.map((item: any) => {
      const subtotal = item.qty * item.price;
      const tax = subtotal * (item.taxRate || 0);
      const discount = item.discount || 0;
      const finalSub = subtotal + tax - discount;
      total += finalSub;
      return {
        product_id: item.productId,
        qty: item.qty,
        unit_price: item.price,
        tax,
        discount,
        subtotal: finalSub,
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        company_id: companyId,
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        order_number: orderNumber,
        order_date: new Date(orderDate),
        expected_receipt: expectedReceipt ? new Date(expectedReceipt) : null,
        status: 'DRAFT',
        receipt_status: 'PENDING',
        bill_status: 'PENDING',
        payment_status: 'UNPAID',
        notes,
        payment_terms: paymentTerms,
        total_amount: total,
        items: {
          create: itemData,
        },
      },
      include: { items: true, supplier: true },
    });
  }

  async confirmPO(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id, company_id: companyId },
      });
      if (!po) throw new NotFoundException('Order not found');
      if (po.status !== 'DRAFT')
        throw new BadRequestException('Order is already confirmed');

      const newOrderNumber = po.order_number.replace('RFQ-', 'PO-');

      return tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: 'CONFIRMED',
          order_number: newOrderNumber,
        },
        include: { items: true, supplier: true },
      });
    });
  }

  async receiveGoods(
    companyId: string,
    purchaseOrderId: string,
    receiptData: any,
  ) {
    const _grnResult = await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId, company_id: companyId },
        include: { items: true },
      });
      if (!po) throw new NotFoundException('PO not found');
      if (po.status !== 'CONFIRMED')
        throw new BadRequestException('PO is not confirmed');

      const receiptNumber = `GRN-${Date.now()}`;
      const grn = await tx.goodsReceipt.create({
        data: {
          company_id: companyId,
          purchase_order_id: po.id,
          supplier_id: po.supplier_id,
          warehouse_id: receiptData.warehouseId || po.warehouse_id,
          receipt_number: receiptNumber,
          receipt_date: new Date(),
          status: 'VALIDATED',
          items: {
            create: receiptData.items.map((item: any) => ({
              product_id: item.productId,
              qty: item.qty,
            })),
          },
        },
        include: { items: true },
      });

      let allFullyReceived = true;
      for (const rItem of receiptData.items) {
        const poItem = po.items.find(
          (i: any) => i.product_id === rItem.productId,
        );
        if (!poItem)
          throw new BadRequestException(
            'Product ' + rItem.productId + ' not in PO',
          );

        const newReceivedQty = (poItem as any).received_qty + rItem.qty;
        if (newReceivedQty > poItem.qty)
          throw new BadRequestException(
            'Cannot receive more than ordered. Ordered: ' +
              poItem.qty +
              ', Attempting to receive total: ' +
              newReceivedQty,
          );

        if (newReceivedQty < poItem.qty) allFullyReceived = false;

        const upR = await tx.purchaseOrderItem.updateMany({
          where: { id: poItem.id, received_qty: poItem.received_qty },
          data: { received_qty: { increment: rItem.qty } },
        });
        if (upR.count === 0)
          throw new BadRequestException(
            'Concurrency conflict for PO Item ' + poItem.id,
          );

        await this.inventoryService.receiveStock(tx as any, {
          companyId,
          warehouseId: grn.warehouse_id,
          productId: rItem.productId,
          quantity: rItem.qty,
          unitCost: poItem.unit_price,
          referenceType: 'PURCHASE_RECEIPT',
          referenceId: grn.id,
          description: 'PO Receipt ' + po.order_number,
          userId: (await tx.user.findFirst({
            where: { company_id: companyId },
          }))!.id,
        });
      }

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { receipt_status: allFullyReceived ? 'RECEIVED' : 'PARTIAL' },
      });

      return grn;
    });
    try {
      await this.notificationService.sendToOwners(companyId, {
        type: 'GOODS_RECEIPT',
        title: '📦 Inventori Masuk',
        message: `Penerimaan barang GRN berhasil dicatat ke inventori.`,
        severity: 'INFO',
        actionUrl: '/purchasing/receipts',
        idempotencyKey: `grn-notif-${Date.now()}`,
      });
    } catch (_ne) {
      /* silent */
    }
    return _grnResult;
  }

  async createVendorBill(
    companyId: string,
    purchaseOrderId: string,
    billData: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId, company_id: companyId },
        include: { items: true },
      });
      if (!po) throw new NotFoundException('PO not found');

      let subtotal = 0;
      let tax = 0;
      let allFullyBilled = true;

      // Auto-fill billData if empty (e.g. fast bill)
        if (!billData.items || billData.items.length === 0) {
          billData.items = po.items.map((i: any) => ({
            productId: i.product_id,
            qty: i.qty - (i.billed_qty || 0),
          })).filter((i: any) => i.qty > 0);
        }

        for (const bItem of billData.items) {
        const poItem = po.items.find(
          (i: any) => i.product_id === bItem.productId,
        );
        if (!poItem) throw new BadRequestException('Product not in PO');

        const newBilledQty = ((poItem as any).billed_qty || 0) + bItem.qty;
        if (newBilledQty > poItem.qty)
          throw new BadRequestException('Cannot bill more than PO quantity');

        if (newBilledQty < poItem.qty) allFullyBilled = false;

        const lineSubtotal = bItem.qty * poItem.unit_price;
        const lineTax =
          lineSubtotal * (poItem.tax / (poItem.qty * poItem.unit_price || 1)) ||
          0;
        subtotal += lineSubtotal;
        tax += lineTax;

        const updateRes = await tx.purchaseOrderItem.updateMany({
          where: { id: poItem.id, billed_qty: (poItem as any).billed_qty || 0 },
          data: { billed_qty: newBilledQty } as any,
        });
        if (updateRes.count === 0)
          throw new BadRequestException(
            'Concurrency conflict for PO Item ' + poItem.id,
          );
      }

      const total = subtotal + tax;
      const invoiceNumber = `VB-${Date.now()}`;

      const invoice = await tx.invoice.create({
        data: {
          company_id: companyId,
          type: 'AP',
          purchase_order_id: po.id,
          supplier_id: po.supplier_id,
          invoice_number: invoiceNumber,
          invoice_date: new Date(),
          due_date: billData.dueDate ? new Date(billData.dueDate) : null,
          status: 'POSTED',
          subtotal,
          tax,
          total,
          paid_amount: 0,
          remaining_amount: total,
        },
      });

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { bill_status: allFullyBilled ? 'BILLED' : 'PARTIAL' },
      });

      await this.eventEmitter.emitAsync('invoice.posted', {
        companyId,
        sourceEntityId: invoice.id,
        eventId: 'EVT-' + Date.now(),
        occurredAt: new Date(),
        payload: { type: 'VENDOR_BILL', totalAmount: invoice.total },
        tx: tx as any,
      });
      return invoice;
    });
  }

  async payVendorBill(companyId: string, invoiceId: string, paymentData: any) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, company_id: companyId, type: 'AP' },
        include: { purchase_order: true },
      });

      if (!invoice) throw new NotFoundException('Vendor Bill not found');
      if (invoice.status === 'PAID')
        throw new BadRequestException('Already fully paid');

      const amount = Number(paymentData.amount);
      if (amount <= 0) throw new BadRequestException('Invalid amount');
      if (amount > invoice.remaining_amount)
        throw new BadRequestException('Payment exceeds remaining amount');

      const payment = await tx.payment.create({
        data: {
          company_id: companyId,
          invoice_id: invoice.id,
          payment_number: `PAY-OUT-${Date.now()}`,
          payment_date: new Date(),
          amount: amount,
          payment_method: paymentData.method || 'BANK_TRANSFER',
          notes: paymentData.notes,
        },
      });

      const newRemaining = invoice.remaining_amount - amount;
      const newPaid = invoice.paid_amount + amount;
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIALLY PAID';

      const updateRes = await tx.invoice.updateMany({
        where: { id: invoice.id, remaining_amount: invoice.remaining_amount },
        data: {
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          status: newStatus,
        },
      });
      if (updateRes.count === 0)
        throw new BadRequestException(
          'Concurrency conflict processing payment',
        );

      if (invoice.purchase_order_id) {
        const allInvs = await tx.invoice.findMany({
          where: { purchase_order_id: invoice.purchase_order_id, type: 'AP' },
        });
        const allPaid = allInvs.every((i: any) => i.status === 'PAID');
        const anyPaid = allInvs.some((i: any) => i.paid_amount > 0);

        await tx.purchaseOrder.update({
          where: { id: invoice.purchase_order_id },
          data: {
            payment_status: allPaid ? 'PAID' : anyPaid ? 'PARTIAL' : 'UNPAID',
          },
        });
      }

      await this.eventEmitter.emitAsync('payment.processed', {
        companyId,
        sourceEntityId: payment.id,
        eventId: 'EVT-' + Date.now(),
        occurredAt: new Date(),
        payload: {
          type: 'PAYABLE',
          amount: payment.amount,
          accountId: paymentData.accountId,
        },
        tx: tx as any,
      });
      return payment;
    });
  }

  async getProcurementAnalytics(companyId: string) {
    const [orders, invoices] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { company_id: companyId, status: 'CONFIRMED' },
      }),
      this.prisma.invoice.findMany({
        where: {
          company_id: companyId,
          type: 'AP',
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
      }),
    ]);

    let openPoValue = 0;
    let unreceivedPoValue = 0;
    orders.forEach((po: any) => {
      openPoValue += po.total_amount;
      if (po.receipt_status !== 'RECEIVED')
        unreceivedPoValue += po.total_amount;
    });

    let outstandingAp = 0;
    invoices.forEach((inv: any) => {
      outstandingAp += inv.remaining_amount;
    });

    const supplierTotals = new Map();
    orders.forEach((po: any) => {
      supplierTotals.set(
        po.supplier_id,
        (supplierTotals.get(po.supplier_id) || 0) + po.total_amount,
      );
    });

    const topSuppliers = Array.from(supplierTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, val]) => ({ supplierId: id, total: val }));

    return {
      open_po_value: openPoValue,
      unreceived_po_value: unreceivedPoValue,
      outstanding_ap: outstandingAp,
      top_suppliers: topSuppliers,
    };
  }

  async findOrders(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { company_id: companyId };

    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOrder(companyId: string, id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id, company_id: companyId },
      include: {
        items: { include: { product: true } },
        supplier: true,
        receipts: { include: { items: true } },
        invoices: true,
      },
    });
  }
}
