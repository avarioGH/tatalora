import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        company: true,
        warehouse_accesses: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role?.name || 'User',
      company_id: user.company_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role?.name || 'User',
        accessible_modules: user.accessible_modules || [],
        accessible_warehouses:
          user.warehouse_accesses?.map((wa: any) => ({
            id: wa.warehouse.id,
            name: wa.warehouse.name,
            code: wa.warehouse.code,
          })) || [],
      },
    };
  }
}
