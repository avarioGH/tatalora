import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Permissions('notification.view')
  @Get()
  async getNotifications(
    @Request() req: any,
    @Query('skip') skip: string,
    @Query('take') take: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;
    return this.notificationService.getNotifications(
      req.user.company_id,
      req.user.id,
      skipNum,
      takeNum,
    );
  }

  @Permissions('notification.view')
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(
      req.user.company_id,
      req.user.id,
    );
    return { count };
  }

  @Permissions('notification.create')
  @Post(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(
      req.user.company_id,
      req.user.id,
      id,
    );
  }

  @Permissions('notification.create')
  @Post('read-all')
  async markAllAsRead(@Request() req: any) {
    const result = await this.notificationService.markAllAsRead(
      req.user.company_id,
      req.user.id,
    );
    return { success: true, updated: result.count };
  }
}
