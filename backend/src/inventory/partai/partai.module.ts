import { Module } from '@nestjs/common';
import { PartaiController } from './partai.controller';
import { PartaiService } from './partai.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PartaiController],
  providers: [PartaiService],
  exports: [PartaiService],
})
export class PartaiModule {}
