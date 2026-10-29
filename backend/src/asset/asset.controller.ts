import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('asset')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getAssets(@Request() req: any) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.assetMaster.findMany({
      where: { company_id: companyId },
      include: {
        category: true,
      },
      orderBy: { created_at: 'desc' }
    });
  }

  @Get('categories')
  getCategories(@Request() req: any) {
    const companyId = req.user.company_id || req.user.companyId;
    return this.prisma.assetCategory.findMany({
      where: { company_id: companyId, status: true },
      orderBy: { name: 'asc' }
    });
  }

  @Post()
  async createAsset(@Request() req: any, @Body() data: any) {
    const companyId = req.user.company_id || req.user.companyId;
    
    // Ensure category exists or create default
    let categoryId = data.category_id || data.categoryId;
    if (!categoryId) {
      let cat = await this.prisma.assetCategory.findFirst({
        where: { company_id: companyId }
      });
      if (!cat) {
        cat = await this.prisma.assetCategory.create({
          data: {
            company_id: companyId,
            name: 'Aset Tetap Umum',
            code: 'FA-GEN'
          }
        });
      }
      categoryId = cat.id;
    }

    const assetCode = data.asset_code || data.assetCode || `AST-${Date.now()}`;
    const assetName = data.asset_name || data.assetName || 'Aset Baru';
    const purchasePrice = Number(data.purchase_price || data.purchasePrice || 0);
    const purchaseDate = data.purchase_date || data.purchaseDate ? new Date(data.purchase_date || data.purchaseDate) : new Date();

    return this.prisma.assetMaster.create({
      data: {
        company_id: companyId,
        category_id: categoryId,
        asset_code: assetCode,
        asset_name: assetName,
        purchase_price: purchasePrice,
        current_value: Number(data.current_value || data.currentValue || purchasePrice),
        purchase_date: purchaseDate,
        depreciation_method: data.depreciation_method || 'Garis Lurus',
        useful_life: Number(data.useful_life || 48), // in months (e.g. 4 years)
        condition: data.condition || 'GOOD',
        status: data.status || 'ACTIVE',
        notes: data.notes || null,
        location: data.location || null
      },
      include: {
        category: true
      }
    });
  }

  @Post('bulk-import')
  async bulkImportAssets(@Request() req: any, @Body() body: { assets: any[] }) {
    const companyId = req.user.company_id || req.user.companyId;
    const assets = body.assets || [];
    const results: any[] = [];

    let defaultCat = await this.prisma.assetCategory.findFirst({ where: { company_id: companyId } });
    if (!defaultCat) {
      defaultCat = await this.prisma.assetCategory.create({
        data: {
          company_id: companyId,
          name: 'Aset Tetap Umum',
          code: 'FA-GEN'
        }
      });
    }

    for (const a of assets) {
      if (!a.asset_name) continue;
      const code = a.asset_code || `AST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const price = Number(a.purchase_price || 0);

      const created = await this.prisma.assetMaster.create({
        data: {
          company_id: companyId,
          category_id: a.category_id || defaultCat.id,
          asset_code: code,
          asset_name: a.asset_name,
          purchase_price: price,
          current_value: Number(a.current_value || price),
          purchase_date: a.purchase_date ? new Date(a.purchase_date) : new Date(),
          status: 'ACTIVE',
          condition: 'GOOD',
          depreciation_method: 'Garis Lurus'
        }
      });
      results.push(created);
    }

    return { count: results.length, data: results };
  }

  @Post('borrow')
  requestBorrow(@Request() req: any, @Body() data: any) {
    return this.assetService.requestBorrow(data, req.user.id);
  }

  @Post('borrow/:id/approve')
  approveBorrow(@Request() req: any, @Param('id') id: string) {
    return this.assetService.approveBorrow(id, req.user.id);
  }
}
