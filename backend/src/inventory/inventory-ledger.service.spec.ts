import { InventoryLedgerService } from './inventory-ledger.service';
import { BadRequestException } from '@nestjs/common';

describe('InventoryLedger Validation & Concurrency Check', () => {
  let service: InventoryLedgerService;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      timberStock: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      timberStockMovement: {
        create: jest.fn(),
      },
    };
    service = new InventoryLedgerService({} as any);
  });

  it('should create stock if it does not exist for IN movement', async () => {
    txMock.timberStock.findUnique.mockResolvedValue(null);
    txMock.timberStock.create.mockResolvedValue({ id: 's1', currentPcs: 0 });

    await service.createMovement(
      txMock,
      'loc1',
      'tv1',
      'IN',
      'OPENING_BALANCE',
      'ref1',
      10,
      0.5,
    );

    expect(txMock.timberStock.create).toHaveBeenCalled();
    expect(txMock.timberStock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ currentPcs: { increment: 10 } }),
      }),
    );
  });

  it('should reject OUT movement if stock is missing', async () => {
    txMock.timberStock.findUnique.mockResolvedValue(null);
    await expect(
      service.createMovement(
        txMock,
        'loc1',
        'tv1',
        'OUT',
        'TRANSFER_OUT',
        'ref1',
        10,
        0.5,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject OUT movement if insufficient stock (Concurrency protection check)', async () => {
    txMock.timberStock.findUnique.mockResolvedValue({
      id: 's1',
      currentPcs: 5,
    }); // Less than 10

    await expect(
      service.createMovement(
        txMock,
        'loc1',
        'tv1',
        'OUT',
        'TRANSFER_OUT',
        'ref1',
        10,
        0.5,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
