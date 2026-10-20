import { Module } from '@nestjs/common';
import { SystemBootstrapService } from './system-bootstrap.service';

@Module({
  providers: [SystemBootstrapService],
})
export class SystemModule {}
