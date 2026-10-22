import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// DTO for public consultation submission
class CreateConsultationDto {
  name: string;
  phone: string;
  company_name: string;
  position: string;
  industry: string;
  budget: string;
  notes?: string;
}

@Controller('public')
export class PublicConsultationController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('consultation')
  @HttpCode(201)
  async submitConsultation(@Body() data: CreateConsultationDto, @Req() req: any) {
    const lead = await this.prisma.consultationLead.create({
      data: {
        name: data.name,
        phone: data.phone,
        company_name: data.company_name,
        position: data.position,
        industry: data.industry,
        budget: data.budget,
        notes: data.notes || null,
        source: 'WEBSITE',
        ip_address: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    return {
      success: true,
      message: 'Terima kasih! Data konsultasi Anda telah diterima.',
      id: lead.id,
    };
  }
}

// Protected admin endpoints for managing consultation leads
@UseGuards(JwtAuthGuard)
@Controller('admin/consultations')
export class AdminConsultationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAll() {
    return this.prisma.consultationLead.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  @Get('stats')
  async getStats() {
    const total = await this.prisma.consultationLead.count();
    const byStatus = await this.prisma.consultationLead.groupBy({
      by: ['status'],
      _count: true,
    });
    const byIndustry = await this.prisma.consultationLead.groupBy({
      by: ['industry'],
      _count: true,
    });
    const byBudget = await this.prisma.consultationLead.groupBy({
      by: ['budget'],
      _count: true,
    });
    return { total, byStatus, byIndustry, byBudget };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.consultationLead.update({
      where: { id },
      data: { status: body.status },
    });
  }
}
