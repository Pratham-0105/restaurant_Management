import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
  type AdminRestaurantItem,
  type AdminStats,
  type AdminUserItem,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@swamiverse/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateSuperAdmin(username: string, password: string) {
    if (username.trim() === 'swami' && password === 'swami12') {
      const token = await this.jwt.signAsync({
        sub: 'super-admin-swami',
        role: 'SUPER_ADMIN',
        username: 'swami',
      });
      return { token, admin: { username: 'swami', role: 'SUPER_ADMIN' } };
    }
    throw new UnauthorizedException('Invalid Admin ID or Password');
  }

  async getStats(): Promise<AdminStats> {
    const [totalRestaurants, totalUsers, totalOrders, activeSubs] =
      await Promise.all([
        this.prisma.restaurant.count(),
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.restaurant.count({
          where: { subscriptionStatus: 'ACTIVE' },
        }),
      ]);

    return {
      totalRestaurants,
      totalUsers,
      totalOrders,
      activeSubscriptions: activeSubs,
    };
  }

  async listUsers(): Promise<AdminUserItem[]> {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roleName: u.role.name,
      roleId: u.roleId,
      restaurantId: u.restaurantId,
      restaurantName: u.restaurant.name,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async createUser(data: {
    name: string;
    email: string;
    password?: string;
    roleName: string;
    restaurantId: string;
    phone?: string;
  }): Promise<AdminUserItem> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: data.restaurantId },
      include: { roles: true, branches: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    let role = restaurant.roles.find((r) => r.name === data.roleName);
    if (!role) {
      role = await this.prisma.role.create({
        data: {
          restaurantId: restaurant.id,
          name: data.roleName,
          label: data.roleName.replace(/_/g, ' '),
        },
      });
    }

    const password = data.password && data.password.length >= 6 ? data.password : '12345678';
    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = await bcrypt.hash('1234', 12);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        restaurantId: restaurant.id,
        roleId: role.id,
        passwordHash,
        pinHash,
        isActive: true,
      },
      include: {
        role: true,
        restaurant: { select: { id: true, name: true } },
      },
    });

    if (restaurant.branches.length > 0) {
      await this.prisma.userBranch.create({
        data: {
          userId: user.id,
          branchId: restaurant.branches[0].id,
        },
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleName: user.role.name,
      roleId: user.roleId,
      restaurantId: user.restaurantId,
      restaurantName: user.restaurant.name,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      roleName?: string;
      isActive?: boolean;
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: { include: { roles: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password && data.password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(data.password.trim(), 12);
    }

    if (data.roleName && data.roleName !== user.roleId) {
      let role = user.restaurant.roles.find((r) => r.name === data.roleName);
      if (!role) {
        role = await this.prisma.role.create({
          data: {
            restaurantId: user.restaurantId,
            name: data.roleName,
            label: data.roleName.replace(/_/g, ' '),
          },
        });
      }
      updateData.roleId = role.id;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        restaurant: { select: { id: true, name: true } },
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'User deleted successfully' };
  }

  async listRestaurants(): Promise<AdminRestaurantItem[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      include: {
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
        branches: {
          select: {
            _count: {
              select: { orders: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return restaurants.map((r) => {
      const orderCount = r.branches.reduce(
        (acc, b) => acc + (b._count?.orders ?? 0),
        0,
      );
      return {
        id: r.id,
        name: r.name,
        currency: r.currency,
        subscriptionPlan: r.subscriptionPlan as SubscriptionPlan,
        subscriptionStatus: r.subscriptionStatus as SubscriptionStatus,
        subscriptionExpiresAt: r.subscriptionExpiresAt
          ? r.subscriptionExpiresAt.toISOString()
          : null,
        branchCount: r._count.branches,
        userCount: r._count.users,
        orderCount,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async updateSubscription(
    restaurantId: string,
    data: {
      plan?: SubscriptionPlan;
      status?: SubscriptionStatus;
      expiresAt?: string | null;
    },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.plan) updateData.subscriptionPlan = data.plan;
    if (data.status) updateData.subscriptionStatus = data.status;
    if (data.expiresAt !== undefined) {
      updateData.subscriptionExpiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
    });
  }

  async createRestaurant(data: {
    name: string;
    branchName?: string;
    ownerName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    subscriptionPlan?: SubscriptionPlan;
  }) {
    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }
    const allPermissions = await this.prisma.permission.findMany();
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: data.name,
        subscriptionPlan: data.subscriptionPlan || 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      },
    });

    const branch = await this.prisma.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: data.branchName || 'Main Branch',
      },
    });

    let ownerRoleId = '';
    for (const roleName of STAFF_ROLES) {
      const role = await this.prisma.role.create({
        data: {
          restaurantId: restaurant.id,
          name: roleName,
          label: roleName.replace(/_/g, ' '),
        },
      });
      if (roleName === 'OWNER') ownerRoleId = role.id;

      const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
      await this.prisma.rolePermission.createMany({
        data: grantedKeys
          .map((key) => permissionByKey.get(key))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
      });
    }

    if (data.ownerEmail) {
      const password = data.ownerPassword || '12345678';
      const passwordHash = await bcrypt.hash(password, 12);
      const pinHash = await bcrypt.hash('1234', 12);

      const owner = await this.prisma.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRoleId,
          name: data.ownerName || 'Restaurant Owner',
          email: data.ownerEmail,
          passwordHash,
          pinHash,
        },
      });

      await this.prisma.userBranch.create({
        data: { userId: owner.id, branchId: branch.id },
      });
    }

    return restaurant;
  }
}
