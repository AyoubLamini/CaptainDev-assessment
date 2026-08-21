import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = isProduction ? '__Host-session' : 'nova_session';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.cookies?.[SESSION_COOKIE];

    if (!sessionId || typeof sessionId !== 'string') {
      throw new UnauthorizedException('Missing or invalid session');
    }

    const sessionIdHash = crypto.createHash('sha256').update(sessionId).digest('hex');

    const session = await this.prisma.session.findUnique({
      where: { id: sessionIdHash },
      include: { identity: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (!session.identity.isPlatformAdmin) {
      throw new ForbiddenException('Platform Administrator access required');
    }

    // Attach identity to request
    request.identity = session.identity;

    return true;
  }
}
