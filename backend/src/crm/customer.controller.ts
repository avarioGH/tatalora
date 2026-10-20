import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from './customer.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  @Permissions('crm.customer.view')
  @Get()
  async getCustomers(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    return this.customerService.getCustomersWithReceivables(req.user.company_id || req.user.companyId, search, pageNum, limitNum, warehouseId);
  }

  @Permissions('crm.customer.view')
  @Get(':id')
  async getCustomerDetail(@Request() req, @Param('id') id: string) {
    return this.customerService.getCustomerWithFinancials(
      req.user.company_id || req.user.companyId,
      id,
    );
  }

  @Permissions('crm.customer.create')
  @Post()
  async createCustomer(@Request() req, @Body() data: any) {
    return this.prisma.customer.create({
      data: {
        company_id: req.user.company_id || req.user.companyId,
        code: data.code || `CUST-${Date.now()}`,
        name: data.name,
        phone: data.phone,
        email: data.email, address: data.address, warehouse_id: data.warehouse_id || undefined,
      },
    });
  }

  @Permissions('crm.customer.update')
  @Put(':id')
  async updateCustomer(
    @Request() req,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.prisma.customer.update({
      where: { id, company_id: req.user.company_id || req.user.companyId },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
    });
  }

  @Permissions('crm.customer.delete')
  @Delete(':id')
  async deleteCustomer(@Request() req, @Param('id') id: string) {
    return this.prisma.customer.delete({
      where: { id, company_id: req.user.company_id || req.user.companyId },
    });
  }
}
