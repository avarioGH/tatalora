import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';

@Global()
@Module({
  providers: [
    AuditService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [AuditService],
})
export class CoreModule {}
