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
    const role = data.is_supplier || data.type?.toUpperCase() === 'VENDOR' || data.type?.toUpperCase() === 'SUPPLIER'
      ? 'SUPPLIER'
      : (Array.isArray(data.roles) && data.roles.length > 0 ? data.roles[0].toUpperCase() : (data.type?.toUpperCase() || 'CUSTOMER'));
    const companyId = req.user.company_id || req.user.companyId;
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = (role === 'VENDOR' || role === 'SUPPLIER') ? 'VEND' : 'CUST';
    const code = data.code || (prefix + '-' + Date.now() + '-' + randSuffix);

    return this.prisma.customer.create({
      data: {
        company_id: companyId,
        code: code,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        company_name: data.company_name || data.company || null,
        roles: Array.isArray(data.roles) ? data.roles : [role],
        warehouse_id: data.warehouse_id || undefined,
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
