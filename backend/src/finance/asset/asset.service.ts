import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssetCapitalizedEvent,
  AssetDepreciationPostedEvent,
  AssetDisposedEvent,
} from '../../events/accounting.events';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getAssetFinancials(companyId: string, assetId: string) {
    const asset = await this.prisma.assetMaster.findFirst({
      where: { id: assetId, company_id: companyId },
      include: { asset_depreciations: { orderBy: { period: 'asc' } } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async capitalizeAsset(companyId: string, assetId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.assetMaster.findFirst({
        where: { id: assetId, company_id: companyId },
      });
      if (!asset) throw new NotFoundException('Asset not found');
      if (asset.is_capitalized)
        throw new BadRequestException('Asset is already capitalized');

      const acquisitionCost = data.acquisitionCost || asset.purchase_price;
      if (acquisitionCost <= 0)
        throw new BadRequestException('Acquisition cost must be > 0');

      const residualValue = data.residualValue || 0;
      if (residualValue < 0 || residualValue >= acquisitionCost) {
        throw new BadRequestException('Invalid residual value');
      }

      const updated = await tx.assetMaster.update({
        where: { id: assetId },
        data: {
          is_capitalized: true,
          capitalization_date: new Date(data.capitalizationDate || Date.now()),
          purchase_price: acquisitionCost,
          residual_value: residualValue,
          useful_life: data.usefulLifeMonths || asset.useful_life || 1,
          asset_account_id: data.assetAccountId,
          accumulated_depreciation_account_id:
            data.accumulatedDepreciationAccountId,
          depreciation_expense_account_id: data.depreciationExpenseAccountId,
          status: 'ACTIVE',
        },
      });

      await this.eventEmitter.emitAsync(
        'asset.capitalized',
        new AssetCapitalizedEvent(
          companyId,
          asset.id,
          'EVT-AST-CAP-' + Date.now(),
          updated.capitalization_date!,
          {
            acquisitionCost,
            assetAccountId: updated.asset_account_id!,
            clearingAccountId: data.clearingAccountId, // AP, Cash, or Clearing
          },
          tx as any,
        ),
      );

      return updated;
    });
  }

  async postDepreciation(companyId: string, assetId: string, period: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.assetMaster.findFirst({
        where: { id: assetId, company_id: companyId },
      });
      if (!asset) throw new NotFoundException('Asset not found');
      if (!asset.is_capitalized)
        throw new BadRequestException('Asset is not capitalized');
      if (asset.status === 'DISPOSED')
        throw new BadRequestException('Cannot depreciate disposed asset');

      const existing = await tx.assetDepreciation.findUnique({
        where: {
          company_id_asset_id_period: {
            company_id: companyId,
            asset_id: assetId,
            period,
          },
        },
      });
      if (existing)
        throw new BadRequestException(
          'Depreciation already posted for this period',
        );

      const depreciableAmount = asset.purchase_price - asset.residual_value;
      const monthlyDepreciation = depreciableAmount / (asset.useful_life || 1);

      let actualDepreciation = monthlyDepreciation;
      const remainingDepreciable =
        depreciableAmount - asset.accumulated_depreciation;

      if (remainingDepreciable <= 0) {
        throw new BadRequestException('Asset is fully depreciated');
      }

      if (actualDepreciation > remainingDepreciable) {
        actualDepreciation = remainingDepreciable;
      }

      const openingBookValue =
        asset.purchase_price - asset.accumulated_depreciation;
      const closingBookValue = openingBookValue - actualDepreciation;
      const newAccumulated =
        asset.accumulated_depreciation + actualDepreciation;

      const depreciationRecord = await tx.assetDepreciation.create({
        data: {
          company_id: companyId,
          asset_id: assetId,
          period,
          depreciation_date: new Date(),
          amount: actualDepreciation,
          opening_book_value: openingBookValue,
          closing_book_value: closingBookValue,
          accumulated_depreciation: newAccumulated,
          status: 'POSTED',
        },
      });

      let status = asset.status;
      if (newAccumulated >= depreciableAmount) {
        status = 'FULLY_DEPRECIATED';
      }

      await tx.assetMaster.update({
        where: { id: assetId },
        data: {
          accumulated_depreciation: newAccumulated,
          current_value: closingBookValue,
          status: status,
        },
      });

      if (
        asset.depreciation_expense_account_id &&
        asset.accumulated_depreciation_account_id
      ) {
        await this.eventEmitter.emitAsync(
          'asset.depreciation_posted',
          new AssetDepreciationPostedEvent(
            companyId,
            depreciationRecord.id,
            'EVT-AST-DEP-' + Date.now(),
            new Date(),
            {
              depreciationAmount: actualDepreciation,
              depreciationExpenseAccountId:
                asset.depreciation_expense_account_id,
              accumulatedDepreciationAccountId:
                asset.accumulated_depreciation_account_id,
              period,
              assetId: asset.id,
            },
            tx as any,
          ),
        );
      }

      return depreciationRecord;
    });
  }

  async disposeAsset(companyId: string, assetId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.assetMaster.findFirst({
        where: { id: assetId, company_id: companyId },
      });
      if (!asset) throw new NotFoundException('Asset not found');
      if (asset.status === 'DISPOSED')
        throw new BadRequestException('Asset already disposed');
      if (!asset.is_capitalized)
        throw new BadRequestException(
          'Only capitalized assets can be disposed',
        );

      const proceeds = data.proceeds || 0;
      const bookValue = asset.purchase_price - asset.accumulated_depreciation;
      const gainLoss = proceeds - bookValue;
      const isGain = gainLoss >= 0;

      const updated = await tx.assetMaster.update({
        where: { id: assetId },
        data: {
          status: 'DISPOSED',
          disposal_date: new Date(data.disposalDate || Date.now()),
          disposal_proceeds: proceeds,
          current_value: 0,
        },
      });

      if (asset.asset_account_id && asset.accumulated_depreciation_account_id) {
        await this.eventEmitter.emitAsync(
          'asset.disposed',
          new AssetDisposedEvent(
            companyId,
            asset.id,
            'EVT-AST-DISP-' + Date.now(),
            updated.disposal_date!,
            {
              originalCost: asset.purchase_price,
              accumulatedDepreciation: asset.accumulated_depreciation,
              disposalProceeds: proceeds,
              gainLossAmount: Math.abs(gainLoss),
              assetAccountId: asset.asset_account_id,
              accumulatedDepreciationAccountId:
                asset.accumulated_depreciation_account_id,
              proceedsAccountId: data.proceedsAccountId,
              gainLossAccountId: data.gainLossAccountId,
              isGain: isGain,
            },
            tx as any,
          ),
        );
      }

      return updated;
    });
  }
}
