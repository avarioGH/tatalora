import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantsAndUsers() {
    // Ambil data users lengkap dengan company dan rolenya
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        status: true,
        created_at: true,
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
            tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
                status: true,
                subscription: {
                  select: {
                    status: true,
                    billing_cycle: true,
                    start_date: true,
                    end_date: true,
                    plan: {
                      select: {
                        name: true,
                        price_monthly: true,
                        price_yearly: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Format output untuk admin dashboard
    return users.map((u) => {
      const sub = u.company?.tenant?.subscription;
      const planName = sub?.plan?.name || (u.role?.name === 'SUPERADMIN' ? 'Enterprise' : 'Starter');
      const monthlyFee = sub?.plan?.price_monthly || (planName === 'Enterprise' ? 1500000 : planName === 'Pro' ? 500000 : 250000);
      
      // Calculate active / expired status
      const expiredDate = sub?.end_date ? sub.end_date.toISOString().split('T')[0] : '2027-12-31';
      const statusLabel = u.status ? 'Active' : 'Suspended';

      return {
        id: u.id,
        name: u.name || u.username || 'Tanpa Nama',
        username: u.username,
        email: u.email,
        phone: u.phone || u.company?.phone || '-',
        company: u.company?.name || 'Workspace Mandiri',
        company_id: u.company?.id,
        role: u.role?.name || 'User',
        plan: planName,
        storageUsedMB: 120, // baseline estimation
        storageLimitMB: planName === 'Enterprise' ? 10240 : planName === 'Pro' ? 5120 : 2048,
        monthlyFee: monthlyFee,
        expiredDate: expiredDate,
        status: statusLabel,
        createdAt: u.created_at,
      };
    });
  }

  async getOverviewStats() {
    const totalUsers = await this.prisma.user.count();
    const totalCompanies = await this.prisma.company.count();
    let totalLeads = 0;
    try {
      totalLeads = await this.prisma.consultationLead.count();
    } catch (e) {
      // fallback if table is empty or error
      totalLeads = 0;
    }

    return {
      totalUsers,
      totalCompanies,
      totalLeads,
    };
  }

  async updateUser(id: string, data: { name?: string; email?: string; phone?: string; status?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }
}
