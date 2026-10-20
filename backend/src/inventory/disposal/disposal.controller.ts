import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DisposalService } from './disposal.service';
import { CreateDisposalDto } from './disposal.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('inventory/disposals')
@UseGuards(JwtAuthGuard)
export class DisposalController {
  constructor(private readonly disposalService: DisposalService) {}

  @Get()
  async list(@Request() req: any) {
    return this.disposalService.list(req.user.companyId);
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Request() req: any) {
    return this.disposalService.detail(id, req.user.companyId);
  }

  @Post()
  async create(@Body() dto: CreateDisposalDto, @Request() req: any) {
    dto.companyId = req.user.companyId || req.user.company_id;
    dto.reason = dto.reason || dto.notes || "Pemusnahan (Disposal)";
    return this.disposalService.create(dto, req.user.id);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Request() req: any) {
    return this.disposalService.submit(id, req.user.companyId);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.disposalService.approve(id, req.user.companyId, req.user.id);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.disposalService.reject(
      id,
      req.user.companyId,
      req.user.id,
      notes,
    );
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.disposalService.cancel(id, req.user.companyId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDisposalDto>,
    @Request() req: any,
  ) {
    return this.disposalService.update(id, dto, req.user.companyId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.disposalService.delete(id, req.user.companyId);
  }
}
