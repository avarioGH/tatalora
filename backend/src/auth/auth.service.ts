import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
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
        email: user.email,
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

  async validateOrRegisterGoogleUser(googleProfile: any): Promise<any> {
    const email = googleProfile.email;
    if (!email) {
      throw new BadRequestException('Email tidak ditemukan dari akun Google');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: email.split('@')[0] }
        ]
      },
      include: {
        role: true,
        company: true,
        warehouse_accesses: {
          include: { warehouse: true },
        },
      },
    });

    if (!user) {
      // Auto-create workspace + user
      const companyName = `${googleProfile.fullName}'s Workspace`;
      const newCompany = await this.prisma.company.create({
        data: {
          name: companyName,
          timezone: 'Asia/Jakarta',
          currency: 'IDR',
        },
      });

      const ownerRole = await this.prisma.role.create({
        data: {
          name: 'Owner',
          company_id: newCompany.id,
          description: 'Company Owner & Administrator',
        },
      });

      const defaultWarehouse = await this.prisma.warehouse.create({
        data: {
          name: 'Gudang Utama',
          code: 'GDG-01',
          company_id: newCompany.id,
        },
      });

      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      const uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;

      user = await this.prisma.user.create({
        data: {
          username: uniqueUsername,
          email,
          name: googleProfile.fullName,
          avatar: googleProfile.picture || null,
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
          company_id: newCompany.id,
          role_id: ownerRole.id,
          status: true,
          accessible_modules: [
            'dashboard',
            'inventory',
            'sales',
            'purchasing',
            'finance',
            'reports',
            'settings',
            'crm',
          ],
        },
        include: {
          role: true,
          company: true,
          warehouse_accesses: {
            include: { warehouse: true },
          },
        },
      });

      await this.prisma.userWarehouseAccess.create({
        data: {
          user_id: user.id,
          warehouse_id: defaultWarehouse.id,
        },
      });
    }

    const { password, ...result } = user;
    return result;
  }

  async register(data: {
    name: string;
    email: string;
    company_name: string;
    password: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.email.split('@')[0] }
        ]
      }
    });

    if (existing) {
      throw new BadRequestException('Email sudah terdaftar. Silakan login langsung.');
    }

    const newCompany = await this.prisma.company.create({
      data: {
        name: data.company_name || `${data.name}'s Workspace`,
        phone: data.phone || null,
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
      },
    });

    const ownerRole = await this.prisma.role.create({
      data: {
        name: 'Owner',
        company_id: newCompany.id,
        description: 'Company Owner & Administrator',
      },
    });

    const defaultWarehouse = await this.prisma.warehouse.create({
      data: {
        name: 'Gudang Utama',
        code: 'GDG-01',
        company_id: newCompany.id,
      },
    });

    const baseUsername = data.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let finalUsername = baseUsername;
    const userWithSameUname = await this.prisma.user.findUnique({ where: { username: finalUsername } });
    if (userWithSameUname) {
      finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username: finalUsername,
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        password: hashedPassword,
        company_id: newCompany.id,
        role_id: ownerRole.id,
        status: true,
        accessible_modules: [
          'dashboard',
          'inventory',
          'sales',
          'purchasing',
          'finance',
          'reports',
          'settings',
          'crm',
        ],
      },
      include: {
        role: true,
        company: true,
        warehouse_accesses: {
          include: { warehouse: true },
        },
      },
    });

    await this.prisma.userWarehouseAccess.create({
      data: {
        user_id: newUser.id,
        warehouse_id: defaultWarehouse.id,
      },
    });

    return this.login(newUser);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }],
      },
    });

    if (!user || !user.email) {
      return {
        success: true,
        message: 'Jika email terdaftar, instruksi reset password telah dikirim ke email Anda.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires_at: expiresAt,
      },
    });

    const resetLink = `https://app.tatalora.com/reset-password?token=${token}`;
    await this.sendResetEmail(user.email, user.name, resetLink);

    return {
      success: true,
      message: 'Jika email terdaftar, instruksi reset password telah dikirim ke email Anda.',
    };
  }

  private async sendResetEmail(toEmail: string, userName: string, resetLink: string) {
    const mailketingToken = process.env.MAILKETING_API_TOKEN;
    const fromEmail = process.env.MAILKETING_FROM_EMAIL || 'forgot-password@tatalora.com';
    const fromName = process.env.MAILKETING_FROM_NAME || 'TATALORA Support';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #fafbfc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TATALORA</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Sistem ERP Cloud Terpadu</p>
        </div>
        <div style="background-color: #ffffff; padding: 28px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Halo, ${userName}</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Kami menerima permintaan untuk mereset kata sandi akun TATALORA Anda. Silakan klik tombol di bawah untuk membuat kata sandi baru:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="background-color: #155eef; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">Reset Password Saya</a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
            Link ini berlaku selama <strong>60 menit</strong>. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dengan aman.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
          © 2026 TATALORA by Avario. Seluruh hak cipta dilindungi.
        </div>
      </div>
    `;

    if (!mailketingToken) {
      this.logger.warn(`MAILKETING_API_TOKEN belum diset. Link reset: ${resetLink}`);
      return;
    }

    try {
      const response = await fetch('https://api.mailketing.co.id/api/v2/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': mailketingToken,
        },
        body: JSON.stringify({
          api_token: mailketingToken,
          from_name: fromName,
          from_email: fromEmail,
          recipient: toEmail,
          subject: 'Reset Password Akun TATALORA',
          content: htmlContent,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      this.logger.log(`Mailketing send response: ${JSON.stringify(resData)}`);
    } catch (err: any) {
      this.logger.error(`Gagal mengirim email reset via Mailketing: ${err.message}`);
    }
  }

  async resetPassword(token: string, newPass: string) {
    if (!token || !newPass) {
      throw new BadRequestException('Token dan password baru wajib diisi.');
    }

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord || resetRecord.used || new Date() > resetRecord.expires_at) {
      throw new BadRequestException('Token reset password tidak valid atau sudah kedaluwarsa.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: resetRecord.email },
    });

    if (!user) {
      throw new BadRequestException('Pengguna tidak ditemukan.');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan login kembali.',
    };
  }
}
