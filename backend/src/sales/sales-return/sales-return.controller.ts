import { Controller, Post, Param, Body, Patch } from '@nestjs/common';
import { SalesReturnService } from './sales-return.service';

@Controller('sales-returns')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Post()
  create(@Body() body: any, @Body('companyId') companyId: string, @Body('userId') userId: string) {
    return this.salesReturnService.create(companyId, body, userId);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body('companyId') companyId: string, @Body('userId') userId: string) {
    return this.salesReturnService.approve(companyId, id, userId);
  }

  @Patch(':id/reverse')
  reverse(@Param('id') id: string, @Body('companyId') companyId: string, @Body('userId') userId: string) {
    return this.salesReturnService.reverse(companyId, id, userId);
  }
}
