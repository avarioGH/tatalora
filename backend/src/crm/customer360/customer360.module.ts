import { Module } from '@nestjs/common';
import { Customer360Controller } from './customer360.controller';
import { Customer360Service } from './customer360.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [Customer360Controller],
  providers: [Customer360Service],
})
export class Customer360Module {}
