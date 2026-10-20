import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createAdmin(data: any, creatorCompanyId: string) {
    // Cari role admin
    let adminRole = await this.prisma.role.findFirst({
      where: { name: 'Admin', company_id: creatorCompanyId },
    });

    if (!adminRole) {
      adminRole = await this.prisma.role.create({
        data: {
          name: 'Admin',
          company_id: creatorCompanyId,
          description: 'Administrator with elevated privileges',
        },
      });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username atau Email sudah terdaftar.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          name: data.name,
          password: hashedPassword,
          company_id: creatorCompanyId,
          role_id: adminRole.id,
          status: true,
          accessible_modules: data.modules || [],
        },
      });

      if (data.warehouse_ids && Array.isArray(data.warehouse_ids)) {
        const accessData = data.warehouse_ids.map((wId: string) => ({
          user_id: newUser.id,
          warehouse_id: wId,
        }));
        await tx.userWarehouseAccess.createMany({
          data: accessData,
        });
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: { select: { name: true } },
          warehouse_accesses: { select: { warehouse_id: true } },
          created_at: true,
        },
      });
    });
  }

  async findByCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        status: true,
        role: { select: { name: true } },
        warehouse_accesses: {
          select: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
  }
}
