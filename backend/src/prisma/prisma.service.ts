import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  
  async onModuleInit() {
    await this.$connect();
    // Auto-migrate null warehouse_id to Gudang A
    try {
      const warehouses = await this.warehouse.findMany({});
      const gudangA = warehouses.find(w => w.name.toLowerCase().includes('a'));
      if (gudangA) {
        await this.salesOrder.updateMany({
          where: { warehouse_id: null },
          data: { warehouse_id: gudangA.id }
        });
      }
    } catch(e) {}
  }


  async onModuleDestroy() {
    await this.$disconnect();
  }
}
