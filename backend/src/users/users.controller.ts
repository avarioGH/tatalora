import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Permissions('users.view')
  @Get()
  async getCompanyUsers(@Request() req) {
    // Hanya ambil user di dalam company/tenant yang sama
    return this.usersService.findByCompany(req.user.companyId);
  }

  @Permissions('users.create')
  @Post('admin')
  async createAdmin(@Request() req, @Body() body: any) {
    // Hanya Owner yang boleh bikin Admin
    
    return this.usersService.createAdmin(body, req.user.companyId);
  }
}
