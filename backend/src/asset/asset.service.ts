import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAssetDto {
  companyId: string;
  categoryId: string;
  assetCode: string;
  assetName: string;
  purchasePrice: number;
  condition: string;
  userId: string;
}

export interface BorrowAssetDto {
  assetId: string;
  borrowerId: string;
  department?: string;
  borrowDate: Date;
  returnDate: Date;
  notes?: string;
}

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}

  async createAsset(data: CreateAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.assetMaster.create({
        data: {
          company_id: data.companyId,
          category_id: data.categoryId,
          asset_code: data.assetCode,
          asset_name: data.assetName,
          purchase_price: data.purchasePrice,
          condition: data.condition,
          status: 'ACTIVE',
        },
      });

      // Record History
      await tx.assetHistory.create({
        data: {
          asset_id: asset.id,
          action: 'REGISTERED',
          after_data: asset as any,
          performed_by: data.userId,
        },
      });

      return asset;
    });
  }

  async requestBorrow(data: BorrowAssetDto, requestedBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.assetMaster.findUnique({
        where: { id: data.assetId },
      });

      if (!asset || asset.status !== 'ACTIVE') {
        throw new BadRequestException('Asset is not available for borrowing.');
      }

      const borrowing = await tx.assetBorrowing.create({
        data: {
          asset_id: data.assetId,
          borrower: data.borrowerId,
          department: data.department,
          borrow_date: data.borrowDate,
          return_date: data.returnDate,
          status: 'PENDING',
          notes: data.notes,
        },
      });

      // Record History
      await tx.assetHistory.create({
        data: {
          asset_id: asset.id,
          action: 'BORROW_REQUESTED',
          after_data: borrowing as any,
          performed_by: requestedBy,
        },
      });

      return borrowing;
    });
  }

  async approveBorrow(borrowingId: string, approverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const borrowing = await tx.assetBorrowing.findUnique({
        where: { id: borrowingId },
      });
      if (!borrowing || borrowing.status !== 'PENDING') {
        throw new BadRequestException('Invalid borrowing request.');
      }

      // Update Borrowing
      const updatedBorrow = await tx.assetBorrowing.update({
        where: { id: borrowingId },
        data: {
          status: 'BORROWED',
          approved_by: approverId,
        },
      });

      // Update Asset Status
      const asset = await tx.assetMaster.update({
        where: { id: borrowing.asset_id },
        data: { status: 'BORROWED' },
      });

      // Record History
      await tx.assetHistory.create({
        data: {
          asset_id: asset.id,
          action: 'BORROW_APPROVED',
          performed_by: approverId,
        },
      });

      return updatedBorrow;
    });
  }
}
