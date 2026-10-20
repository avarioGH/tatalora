import { Module } from '@nestjs/common';
import { GlService } from './gl.service';

import { PrismaModule } from '../prisma/prisma.module';

import { GlController } from './gl.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GlController],
  providers: [GlService],
  exports: [GlService],
})
export class GlModule {}
