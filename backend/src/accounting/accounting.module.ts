import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { CoaController } from './coa.controller';
import { AccountingService } from './accounting.service';
import { AccountingListener } from './accounting.listener';
import { GlModule } from '../gl/gl.module';
import { CoaService } from './coa.service';

@Module({
  imports: [GlModule],
  controllers: [AccountingController, CoaController],
  providers: [AccountingService, AccountingListener, CoaService],
  exports: [CoaService],
})
export class AccountingModule {}
