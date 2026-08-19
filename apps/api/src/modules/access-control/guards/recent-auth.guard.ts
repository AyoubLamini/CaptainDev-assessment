import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

export function verifyRecentAuth(sessionCreatedAt: any, maxAgeMinutes = 15): void {
  if (!sessionCreatedAt) {
    throw new ForbiddenException({ message: 'Recent authentication required', code: 'RECENT_AUTH_REQUIRED' });
  }
  
  let createdAtDate: Date;
  if (sessionCreatedAt instanceof Date) {
    createdAtDate = sessionCreatedAt;
  } else if (typeof sessionCreatedAt === 'string' || typeof sessionCreatedAt === 'number') {
    createdAtDate = new Date(sessionCreatedAt);
  } else {
    throw new ForbiddenException({ message: 'Recent authentication required', code: 'RECENT_AUTH_REQUIRED' });
  }

  if (isNaN(createdAtDate.getTime())) {
    throw new ForbiddenException({ message: 'Recent authentication required', code: 'RECENT_AUTH_REQUIRED' });
  }

  const ageMinutes = (Date.now() - createdAtDate.getTime()) / (1000 * 60);
  
  if (ageMinutes < 0 || ageMinutes > maxAgeMinutes) {
    throw new ForbiddenException({ message: 'Recent authentication required', code: 'RECENT_AUTH_REQUIRED' });
  }
}

@Injectable()
export class RecentAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.cookies?.['__Host-session'];

    if (!sessionId || typeof sessionId !== 'string') {
      throw new UnauthorizedException('Missing or invalid session');
    }

    const sessionIdHash = crypto.createHash('sha256').update(sessionId).digest('hex');

    const session = await this.prisma.session.findUnique({
      where: { id: sessionIdHash },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    verifyRecentAuth(session.createdAt);

    return true;
  }
}
