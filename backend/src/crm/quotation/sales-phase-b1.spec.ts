import { Test, TestingModule } from '@nestjs/testing';
import { SalesOrderService } from './sales-order.service';
import { QuotationService } from './quotation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../../finance/payment/payment.service';
import { SequenceService } from '../../reports/sequence.service';
import { BadRequestException } from '@nestjs/common';

describe('Sales Phase B1 - SalesOrder & Quotation Integrity Unit Tests', () => {
  let salesOrderService: SalesOrderService;
  let quotationService: QuotationService;
  let prismaMock: any;
  let paymentServiceMock: any;
  let sequenceServiceMock: any;

  const mockCompanyId = 'comp-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn(async (cb: any) => cb(prismaMock)),
      product: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      salesOrder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      quotation: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
      financeTransaction: {
        create: jest.fn(),
      },
    };

    paymentServiceMock = {
      create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
    };

    sequenceServiceMock = {
      generateNumber: jest.fn().mockResolvedValue('SO/2026/00001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderService,
        QuotationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PaymentService, useValue: paymentServiceMock },
        { provide: SequenceService, useValue: sequenceServiceMock },
      ],
    }).compile();

    salesOrderService = module.get<SalesOrderService>(SalesOrderService);
    quotationService = module.get<QuotationService>(QuotationService);
  });

  describe('SalesOrderService.create', () => {
    it('1. Creating a Sales Order does NOT create stock issues or finance income transactions', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Teak Wood Plank',
        company_id: mockCompanyId,
        selling_price: 150000,
      });

      prismaMock.salesOrder.create.mockImplementation((args: any) => ({
        id: 'so-1',
        ...args.data,
      }));

      const payload = {
        customer_id: 'cust-1',
        warehouse_id: 'wh-1',
        items: [
          {
            product_id: 'prod-1',
            qty: 5,
            unit_price: 150000,
          },
        ],
      };

      const result = await salesOrderService.create(mockCompanyId, payload, mockUserId);

      // Verify Sales Order created with correct totals
      expect(result).toBeDefined();
      expect(result.id).toBe('so-1');
      expect(result.subtotal).toBe(750000);
      expect(result.total_amount).toBe(750000);
      expect(result.order_number).toBe('SO/2026/00001');

      // Verify NO financeTransaction created prematurely
      expect(prismaMock.financeTransaction.create).not.toHaveBeenCalled();

      // Verify NO upfront payment triggered if paidAmount is 0
      expect(paymentServiceMock.create).not.toHaveBeenCalled();
    });

    it('2. Creating a Sales Order enforces tenant/company isolation for products', async () => {
      // Product belongs to a different company
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-foreign',
        name: 'Foreign Product',
        company_id: 'comp-other',
        selling_price: 100000,
      });

      const payload = {
        customer_id: 'cust-1',
        items: [
          {
            product_id: 'prod-foreign',
            qty: 2,
            unit_price: 100000,
          },
        ],
      };

      await expect(
        salesOrderService.create(mockCompanyId, payload, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('3. Upfront B2B payment on Sales Order is safely delegated to PaymentService', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Teak Wood Plank',
        company_id: mockCompanyId,
        selling_price: 200000,
      });

      prismaMock.salesOrder.create.mockImplementation((args: any) => ({
        id: 'so-upfront',
        ...args.data,
      }));

      prismaMock.salesOrder.findUnique.mockResolvedValue({
        id: 'so-upfront',
        payment_status: 'PAID',
        customer_id: 'cust-1',
        total_amount: 200000,
      });

      const payload = {
        customer_id: 'cust-1',
        paidAmount: 200000,
        payment_method: 'Transfer',
        items: [{ product_id: 'prod-1', qty: 1, unit_price: 200000 }],
      };

      const result = await salesOrderService.create(mockCompanyId, payload, mockUserId);

      expect(paymentServiceMock.create).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          salesOrderId: 'so-upfront',
          customerId: 'cust-1',
          amount: 200000,
          paymentMethod: 'Transfer',
        }),
        mockUserId,
      );
      expect(result).toBeDefined();
    });
  });

  describe('QuotationService.confirm', () => {
    it('4. Quotation conversion generates valid SO number using SequenceService and preserves fields', async () => {
      const mockQuotation = {
        id: 'quo-1',
        company_id: mockCompanyId,
        customer_id: 'cust-1',
        status: 'SENT',
        subtotal: 500000,
        discount_percent: 10,
        discount_amount: 50000,
        tax: 49500,
        total_amount: 499500,
        notes: 'Delivery next week',
        billing_address: 'Main Street 123',
        delivery_address: 'Warehouse Gate 4',
        email: 'client@example.com',
        payment_terms: 'net30',
        tag: 'VIP',
        client_ref: 'PO-CLIENT-99',
        currency: 'IDR',
        message: 'Thank you for your business',
        memo: 'Internal note',
        items: [
          {
            product_id: 'prod-1',
            qty: 10,
            unit_price: 50000,
            subtotal: 500000,
          },
        ],
      };

      prismaMock.quotation.findFirst.mockResolvedValue(mockQuotation);
      prismaMock.salesOrder.findFirst.mockResolvedValue(null);
      prismaMock.quotation.updateMany.mockResolvedValue({ count: 1 });
      sequenceServiceMock.generateNumber.mockResolvedValue('SO/2026/00042');

      prismaMock.salesOrder.create.mockImplementation((args: any) => ({
        id: 'so-gen-1',
        ...args.data,
      }));

      const so = await quotationService.confirm(mockCompanyId, 'quo-1');

      expect(sequenceServiceMock.generateNumber).toHaveBeenCalledWith(
        expect.anything(),
        mockCompanyId,
        'SALES_ORDER',
        'SO',
      );
      expect(so.order_number).toBe('SO/2026/00042');
      expect(so.quotation_id).toBe('quo-1');
      expect(so.subtotal).toBe(500000);
      expect(so.discount_amount).toBe(50000);
      expect(so.tax).toBe(49500);
      expect(so.total_amount).toBe(499500);
      expect(so.billing_address).toBe('Main Street 123');
      expect(so.delivery_address).toBe('Warehouse Gate 4');
      expect(so.payment_terms).toBe('net30');
      expect(so.client_ref).toBe('PO-CLIENT-99');
    });

    it('5. Duplicate or concurrent conversion attempt is rejected', async () => {
      // Case A: Sales order already exists for this quotation
      prismaMock.quotation.findFirst.mockResolvedValue({
        id: 'quo-1',
        company_id: mockCompanyId,
        status: 'CONFIRMED',
        items: [],
      });
      await expect(quotationService.confirm(mockCompanyId, 'quo-1')).rejects.toThrow(
        BadRequestException,
      );

      // Case B: Concurrent modification where atomic updateMany matches 0 rows
      prismaMock.quotation.findFirst.mockResolvedValue({
        id: 'quo-2',
        company_id: mockCompanyId,
        status: 'SENT',
        items: [],
      });
      prismaMock.salesOrder.findFirst.mockResolvedValue(null);
      prismaMock.quotation.updateMany.mockResolvedValue({ count: 0 }); // Concurrently updated by another request

      await expect(quotationService.confirm(mockCompanyId, 'quo-2')).rejects.toThrow(
        'Quotation already confirmed or concurrently modified',
      );
    });
  });
});
