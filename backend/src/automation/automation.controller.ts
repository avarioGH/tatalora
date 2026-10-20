import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Controller, UseGuards } from '@nestjs/common';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('automation')
export class AutomationController {}
