import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('fix')
export class FixController {
  @Get('partai-force-fix')
  async partaiForceFix() {
    const t = await this.prisma.trimmedLog.findFirst({where: {trimNumber: '201A'}});
    let items: any[] = [];
    let logs: any[] = [];
    if (t) {
        items = await this.prisma.inputLogItem.findMany({where: {trimmedLogId: t.id}});
        logs = await this.prisma.inputLog.findMany({where: {id: {in: items.map(i => i.inputLogId)}}});
    }
    
    // forcefully fix it
    if (t) {
        await this.prisma.trimmedLog.update({where: {id: t.id}, data: {status: 'AVAILABLE', inputLogId: null}});
    }
    await this.prisma.inputLog.deleteMany({where: {partaiId: null}});

    return { trimmedLog: t, items, logs, message: "TrimmedLog 201A forcibly set to AVAILABLE." };
  }
  
  constructor(private prisma: PrismaService) {}

  @Get('make-owner')
  async makeOwner() {
    const user = await this.prisma.user.findFirst({
      where: { username: 'ikan' },
    });
    if (!user || !user.company_id)
      return { success: false, message: 'User not found or no company' };

    let ownerRole = await this.prisma.role.findFirst({
      where: { name: 'Owner', company_id: user.company_id },
    });
    if (!ownerRole) {
      ownerRole = await this.prisma.role.create({
        data: {
          name: 'Owner',
          company_id: user.company_id,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        role_id: ownerRole.id,
        accessible_modules: ['inventory', 'production', 'sales', 'pos', 'crm', 'finance', 'purchasing', 'manufacturing', 'hr', 'reports']
      },
    });

    const warehouses = await this.prisma.warehouse.findMany({
      where: { company_id: user.company_id },
    });

    for (const w of warehouses) {
      await this.prisma.userWarehouseAccess.upsert({
        where: {
          user_id_warehouse_id: { user_id: user.id, warehouse_id: w.id },
        },
        update: {},
        create: { user_id: user.id, warehouse_id: w.id },
      });
    }

    return {
      success: true,
      message: 'Berhasil! Akun ikan sekarang adalah Owner dan memiliki semua akses modul & gudang. Silakan Logout dan Login kembali di frontend.',
      warehouses: warehouses.length,
    };
  }
}
