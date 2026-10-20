import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SystemBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    // We assume the company could be missing, but User needs a company.
    // Actually, in our schema, User does not require a company, or does it?
    // Let's look at prisma/schema.prisma for User model.
    // Assuming User needs an email, password, etc.
    const exists = await this.prisma.user.findUnique({
      where: { id: SYSTEM_USER_ID },
    });
    if (!exists) {
      this.logger.log('Bootstrapping System User...');
      const sysCompany = await this.prisma.company.upsert({
        where: { id: SYSTEM_USER_ID },
        update: {},
        create: {
          id: SYSTEM_USER_ID,
          name: 'SYSTEM INTERNAL',

          timezone: 'UTC',
        },
      });
      await this.prisma.user.create({
        data: {
          id: SYSTEM_USER_ID,
          email: 'system@internal.local',
          name: 'System Actor',
          password: '',
          username: 'system', // Or SYSTEM if enum has it
          company_id: sysCompany.id,
        },
      });
      this.logger.log('System User successfully seeded.');
    }
  }
}
