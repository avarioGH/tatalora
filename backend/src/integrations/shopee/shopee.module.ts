import { Module } from '@nestjs/common';
import { ShopeeController } from './shopee.controller';
import { ShopeeService } from './shopee.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsModule } from '../../reports/reports.module';

@Module({
  imports: [PrismaModule, ReportsModule],
  controllers: [ShopeeController],
  providers: [ShopeeService],
})
export class ShopeeModule {}
