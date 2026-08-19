import { Controller, Post, Body, Res, BadRequestException, HttpCode, HttpStatus, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import * as crypto from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf')
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    res.cookie('__Host-csrf', csrfToken, {
      secure: true,
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
    const existingSession = req.cookies['__Host-session'];
    if (existingSession) {
      await this.authService.logout(existingSession);
    }

    const { sessionId, expiresAt } = await this.authService.login(email, password);

    res.cookie('__Host-session', sessionId, {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      expires: expiresAt,
    });

    const csrfToken = crypto.randomBytes(32).toString('base64url');
    res.cookie('__Host-csrf', csrfToken, {
      secure: true,
      sameSite: 'strict',
      path: '/',
    });

    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const existingSession = req.cookies['__Host-session'];
    if (existingSession) {
      await this.authService.logout(existingSession);
    }

    res.clearCookie('__Host-session', { path: '/' });
    res.clearCookie('__Host-csrf', { path: '/' });

    return { success: true };
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

