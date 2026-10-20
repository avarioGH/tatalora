import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Load user role
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!dbUser || !dbUser.role) {
      throw new ForbiddenException('User has no role');
    }

    const userPermissions = dbUser.role.permissions.map(
      (p) => p.permission.name,
    );

    if (
      dbUser.role.name === 'Owner' ||
      dbUser.role.name === 'Admin' ||
      dbUser.role.name === 'Superadmin' ||
      dbUser.role.name === 'FULL_ADMIN'
    ) {
      return true;
    }

    const hasPermission = requiredPermissions.every(
      (permission) =>
        userPermissions.includes(permission) || userPermissions.includes('*'),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(',')}`,
      );
    }

    return true;
  }
}
