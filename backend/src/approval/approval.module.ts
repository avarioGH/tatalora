import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalDomainListener } from './approval.listener';
import { PrismaModule } from '../prisma/prisma.module';

import { ApprovalController } from './approval.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalDomainListener],
  exports: [ApprovalService],
})
export class ApprovalModule {}
