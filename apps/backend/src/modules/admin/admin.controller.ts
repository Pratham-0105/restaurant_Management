import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';

const ADMIN_SESSION_COOKIE = 'swamiverse_admin_session';
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

@ApiTags('admin')
@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwt: JwtService,
  ) {}

  private checkSuperAdmin(req: Request) {
    const adminCookie = req.cookies?.[ADMIN_SESSION_COOKIE];
    const sessionCookie = req.cookies?.['swamiverse_session'];
    const authHeader = req.headers.authorization?.replace(/^Bearer /i, '');
    const token = adminCookie || sessionCookie || authHeader;

    if (!token) {
      throw new UnauthorizedException('Admin authentication required');
    }

    try {
      const payload = this.jwt.verify(token);
      // Allow super admin or swami username
      if (
        payload.role === 'SUPER_ADMIN' ||
        payload.username === 'swami' ||
        payload.sub === 'super-admin-swami'
      ) {
        return payload;
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session');
    }
  }

  @Post('login')
  async login(
    @Body() body: { username?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const username = body.username || '';
    const password = body.password || '';

    const { token, admin } = await this.adminService.validateSuperAdmin(
      username,
      password,
    );

    const isSecure = process.env.COOKIE_SECURE === 'true';

    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.cookie('swamiverse_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: COOKIE_MAX_AGE_MS,
    });

    return { success: true, admin, token };
  }

  @Get('me')
  getMe(@Req() req: Request) {
    const admin = this.checkSuperAdmin(req);
    return {
      authenticated: true,
      username: 'swami',
      role: 'SUPER_ADMIN',
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_SESSION_COOKIE);
    res.clearCookie('swamiverse_session');
    return { success: true };
  }

  @Get('stats')
  getStats(@Req() req: Request) {
    this.checkSuperAdmin(req);
    return this.adminService.getStats();
  }

  @Get('users')
  listUsers(@Req() req: Request) {
    this.checkSuperAdmin(req);
    return this.adminService.listUsers();
  }

  @Post('users')
  createUser(@Req() req: Request, @Body() body: any) {
    this.checkSuperAdmin(req);
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  updateUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.checkSuperAdmin(req);
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Req() req: Request, @Param('id') id: string) {
    this.checkSuperAdmin(req);
    return this.adminService.deleteUser(id);
  }

  @Get('restaurants')
  listRestaurants(@Req() req: Request) {
    this.checkSuperAdmin(req);
    return this.adminService.listRestaurants();
  }

  @Post('restaurants')
  createRestaurant(@Req() req: Request, @Body() body: any) {
    this.checkSuperAdmin(req);
    return this.adminService.createRestaurant(body);
  }

  @Patch('subscriptions/:restaurantId')
  updateSubscription(
    @Req() req: Request,
    @Param('restaurantId') restaurantId: string,
    @Body() body: any,
  ) {
    this.checkSuperAdmin(req);
    return this.adminService.updateSubscription(restaurantId, body);
  }
}
