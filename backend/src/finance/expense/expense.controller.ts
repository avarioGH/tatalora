import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';

@Controller('expense')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  getClaims(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expenseService.getClaims(
      req.user.company_id,
      employeeId,
      page ? +page : 1,
      limit ? +limit : 50,
    );
  }

  @Get(':id')
  getClaim(@Request() req: any, @Param('id') id: string) {
    return this.expenseService.getClaim(req.user.company_id, id);
  }

  @Post()
  createClaim(@Request() req: any, @Body() data: any) {
    return this.expenseService.createClaim(
      req.user.company_id,
      req.user.id,
      data,
    );
  }

  @Post(':id/submit')
  submitClaim(@Request() req: any, @Param('id') id: string) {
    return this.expenseService.submitClaim(req.user.company_id, id);
  }

  @Post(':id/approve')
  approveClaim(@Request() req: any, @Param('id') id: string) {
    return this.expenseService.approveClaim(
      req.user.company_id,
      id,
      req.user.id,
    );
  }

  @Post(':id/post')
  postClaim(@Request() req: any, @Param('id') id: string) {
    return this.expenseService.postClaim(req.user.company_id, id, req.user.id);
  }
}
