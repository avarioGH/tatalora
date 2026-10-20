import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Query,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Permissions('inventory.category.view')
  @Get('categories')
  async getCategories(@Request() req) {
    return this.inventoryService.getCategories(req.user.company_id);
  }

  @Permissions('inventory.category.create')
  @Post('categories')
  async createCategory(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    return this.inventoryService.createCategory(data);
  }

  @Permissions('inventory.category.update')
  @Put('categories/:id')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.inventoryService.updateCategory(req.user.company_id, id, data);
  }

  @Permissions('inventory.category.delete')
  @Delete('categories/:id')
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.deleteCategory(req.user.company_id, id);
  }

  @Permissions('inventory.product.view')
  @Get('products')
  async getProducts(@Request() req) {
    return this.inventoryService.getProducts(req.user.company_id);
  }

  @Permissions('inventory.product.create')
  @Post('products')
  @UseInterceptors(
    FilesInterceptor('images', 8, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const fs = require('fs');
          const dir = './uploads/products';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async createProduct(
    @Request() req,
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      // Add files array and company_id to data
      data.companyId = req.user.company_id || req.user.companyId;
      if (files && files.length > 0) {
        data.images = files.map((file) => `/uploads/products/${file.filename}`);
      }
      return await this.inventoryService.createProduct(data);
    } catch (error: any) {
      console.error('Error creating product:', error);
      const { HttpException, HttpStatus } = require('@nestjs/common');
      if (error.code === 'P2002') {
        throw new HttpException(
          'SKU atau Barcode sudah terpakai oleh produk lain',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        error.message || 'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  
  @Permissions('inventory.product.update')
  @Put('products/:id')
  @UseInterceptors(
    FilesInterceptor('images', 8, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const fs = require('fs');
          const dir = './uploads/products';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, uniqueSuffix + ext);
        },
      }),
    }),
  )
  async updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      data.companyId = req.user.company_id || req.user.companyId;
      if (files && files.length > 0) {
        data.images = files.map((file) => '/uploads/products/' + file.filename);
      }
      return await this.inventoryService.updateProduct(data.companyId, id, data);
    } catch (error: any) {
      console.error('Error updating product:', error);
      const { HttpException, HttpStatus } = require('@nestjs/common');
      throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Permissions('inventory.product.delete')
  @Delete('products/:id')
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    try {
      const companyId = req.user.company_id || req.user.companyId;
      return await this.inventoryService.deleteProduct(companyId, id);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      const { HttpException, HttpStatus } = require('@nestjs/common');
      if (error.message && error.message.includes('Foreign key') || error.code === 'P2003' || error.code === 'P2014' || error.message.includes('Foreign key constraint failed')) {
        throw new HttpException('Tidak bisa menghapus produk karena sedang digunakan dalam transaksi atau stok.', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(error.message || 'Gagal menghapus produk.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Permissions('inventory.warehouse.view')

  @Get('warehouses')
  async getWarehouses(@Request() req) {
    return this.inventoryService.getWarehouses(req.user.company_id);
  }

  @Permissions('inventory.warehouse.create')
  @Post('warehouses')
  async createWarehouse(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    return this.inventoryService.createWarehouse(data);
  }

  @Permissions('inventory.warehouse.update')
  @Put('warehouses/:id')
  async updateWarehouse(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.inventoryService.updateWarehouse(req.user.company_id, id, data);
  }

  @Permissions('inventory.warehouse.delete')
  @Delete('warehouses/:id')
  async deleteWarehouse(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.deleteWarehouse(req.user.company_id, id);
  }

  @Permissions('inventory.view')
  @Get('transactions')
  async getTransactions(@Request() req) {
    return this.inventoryService.getTransactions(req.user.company_id);
  }

  @Permissions('inventory.view')
  @Get('stocks')
  async getStocks(@Request() req, @Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getWarehouseStocks(req.user.company_id, warehouseId);
  }

  @Permissions('inventory.create')
  @Post('inbound')
  async createInbound(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    data.userId = req.user.userId || req.user.id;
    // Generate simple transaction no if not provided
    if (!data.transactionNo) {
      data.transactionNo = `IN-${Date.now()}`;
    }
    data.transactionDate = new Date();
    return this.inventoryService.createInbound(data);
  }

  @Permissions('inventory.create')
  @Post('outbound')
  async createOutbound(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    data.userId = req.user.userId || req.user.id;
    if (!data.transactionNo) {
      data.transactionNo = `OUT-${Date.now()}`;
    }
    data.transactionDate = new Date();
    return this.inventoryService.createOutbound(data);
  }

  @Permissions('inventory.create')
  @Post('transfer')
  async createTransfer(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    data.userId = req.user.userId || req.user.id;
    if (!data.transactionNo) {
      data.transactionNo = `TRF-${Date.now()}`;
    }
    data.transactionDate = new Date();
    return this.inventoryService.createTransfer(data);
  }

  @Permissions('inventory.create')
  @Post('adjustment')
  async createAdjustment(@Request() req, @Body() data: any) {
    data.companyId = req.user.company_id;
    data.userId = req.user.userId || req.user.id;
    if (!data.transactionNo) {
      data.transactionNo = `ADJ-${Date.now()}`;
    }
    data.transactionDate = new Date();
    return this.inventoryService.createAdjustment(data);
  }

  @Permissions('inventory.create')
  @Post('transfer/:id/validate')
  async validateTransfer(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.validateTransfer(
      req.user.company_id,
      id,
      req.user.id,
    );
  }

  @Permissions('inventory.create')
  @Post('adjustment/:id/validate')
  async validateAdjustment(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.validateAdjustment(
      req.user.company_id,
      id,
      req.user.id,
    );
  }

  @Permissions('inventory.create')
  @Post('stock-opname')
  async createStockOpname(
    @Request() req: any,
    @Body() data: { warehouseId: string; productIds?: string[] },
  ) {
    return this.inventoryService.createStockOpname(
      req.user.company_id,
      data.warehouseId,
      req.user.id,
      data.productIds,
    );
  }

  @Permissions('inventory.create')
  @Post('stock-opname/:id/approve')
  async approveStockOpname(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    data: {
      counts: { productId: string; countedQty: number; unitCost?: number }[];
    },
  ) {
    return this.inventoryService.approveStockOpname(
      req.user.company_id,
      id,
      req.user.id,
      data.counts,
    );
  }

  @Permissions('inventory.view')
  @Get('movements')
  async getMovements(@Request() req: any) {
    return this.inventoryService['prisma'].stockMovement.findMany({
      where: { company_id: req.user.company_id },
      include: { product: true, warehouse: true },
      orderBy: { created_at: 'desc' },
    });
  }

  @Permissions('inventory.view')
  @Get('fifo/diagnostic')
  async getFifoDiagnostic(@Request() req) {
    return this.inventoryService.getFifoDiagnostic(req.user.companyId);
  }
}
