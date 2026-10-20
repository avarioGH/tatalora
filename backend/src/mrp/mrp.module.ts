import { Module } from '@nestjs/common';
import { MrpController } from './mrp.controller';
import { MrpService } from './mrp.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MrpController],
  providers: [MrpService],
})
export class MrpModule {}
