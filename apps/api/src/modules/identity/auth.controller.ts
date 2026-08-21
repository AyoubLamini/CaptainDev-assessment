import { Controller, Post, Body, Res, BadRequestException, HttpCode, HttpStatus, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import * as crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = isProduction ? '__Host-session' : 'nova_session';
const CSRF_COOKIE = isProduction ? '__Host-csrf' : 'nova_csrf';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf')
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    res.cookie(CSRF_COOKIE, csrfToken, {
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
    return { success: true };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { email, password } = body;
    
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Session rotation
    const existingSession = req.cookies[SESSION_COOKIE];
    if (existingSession) {
      await this.authService.logout(existingSession);
    }

    const { sessionId, expiresAt, isPlatformAdmin } = await this.authService.login(email, password);

    res.cookie(SESSION_COOKIE, sessionId, {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt,
    });

    res.cookie('isPlatformAdmin', String(isPlatformAdmin), {
      secure: isProduction,
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt,
    });

    const csrfToken = crypto.randomBytes(32).toString('base64url');
    res.cookie(CSRF_COOKIE, csrfToken, {
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });

    return { success: true, isPlatformAdmin };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const existingSession = req.cookies[SESSION_COOKIE];
    if (existingSession) {
      await this.authService.logout(existingSession);
    }

    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    res.clearCookie('isPlatformAdmin', { path: '/' });

    return { success: true };
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    const sessionId = req.cookies[SESSION_COOKIE];
    if (!sessionId) {
      throw new BadRequestException('Not logged in');
    }
    const data = await this.authService.getMe(sessionId);
    if (!data) {
      throw new BadRequestException('Invalid session');
    }
    return data;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: any) {
    const { email } = body;
    if (typeof email !== 'string' || !email.trim() || !email.includes('@') || email.length > 255) {
      throw new BadRequestException('Invalid email');
    }
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: any) {
    const { token, newPassword } = body;
    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string' || newPassword.length > 128) {
      throw new BadRequestException('Invalid input');
    }
    return this.authService.resetPassword(token, newPassword);
  }
}

