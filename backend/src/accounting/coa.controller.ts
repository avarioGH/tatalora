import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CoaService } from './coa.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('accounting/coa')
export class CoaController {
  constructor(
    private readonly coaService: CoaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('bootstrap')
  async bootstrap(@Body() body: { companyId: string }) {
    await this.prisma.$transaction(async (tx) => {
        await this.coaService.ensureStandardAccounts(tx, body.companyId);
    });
    return { success: true, message: 'COA bootstrapped successfully' };
  }
}