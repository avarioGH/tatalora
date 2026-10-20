import { PermissionsGuard } from './auth/permissions.guard';
import { Permissions } from './auth/permissions.decorator';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Permissions('src.view')
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
