import { Module } from '@nestjs/common';
import { OpnameController } from './opname.controller';
import { OpnameService } from './opname.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLedgerService } from '../inventory-ledger.service';

@Module({
  imports: [PrismaModule],
  controllers: [OpnameController],
  providers: [OpnameService, InventoryLedgerService],
  exports: [OpnameService],
})
export class OpnameModule {}
