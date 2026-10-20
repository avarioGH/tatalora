import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingListener } from './accounting.listener';
import { GlModule } from '../gl/gl.module';

@Module({
  imports: [GlModule],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingListener],
})
export class AccountingModule {}
