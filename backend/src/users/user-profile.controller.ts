import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    const userId = req.user.id || req.user.userId;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }

    const { password, ...result } = user;
    return result;
  }

  @Put('profile')
  async updateProfile(@Request() req: any, @Body() body: any) {
    const userId = req.user.id || req.user.userId;

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.avatar !== undefined) dataToUpdate.avatar = body.avatar;

    if (body.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: body.email,
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new BadRequestException('Email sudah digunakan oleh akun lain.');
      }
      dataToUpdate.email = body.email;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: {
        role: true,
        company: true,
      },
    });

    const { password, ...result } = updatedUser;
    return {
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: result,
    };
  }

  @Put('change-password')
  async changePassword(@Request() req: any, @Body() body: any) {
    const userId = req.user.id || req.user.userId;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Password lama dan password baru wajib diisi.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Password baru minimal 6 karakter.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }

    // Verify current password
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Password saat ini salah.');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: 'Password berhasil diubah. Silakan gunakan password baru pada sesi berikutnya.',
    };
  }
}
