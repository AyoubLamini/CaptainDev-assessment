import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';
import { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = isProduction ? '__Host-session' : 'nova_session';

@Injectable()
export class OrgAdminGuard implements CanActivate {
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

    const orgIdHeader = request.headers['x-organization-id'];
    const organizationId = String(request.params.organizationId || (Array.isArray(orgIdHeader) ? orgIdHeader[0] : orgIdHeader));
    
    if (!organizationId || organizationId === 'undefined') {
      throw new BadRequestException('Organization ID is required');
    }

    const membership = await this.prisma.executeAsPlatformAdmin(async (tx) => {
      return tx.organizationMember.findUnique({
        where: {
          organizationId_identityId: {
            organizationId: organizationId,
            identityId: session.identityId,
          }
        }
      });
    });

    if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
      throw new ForbiddenException('Organization Administrator or Owner access required');
    }

    if (membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Member is not active');
    }

    // Attach identity, session, and organizationId to request
    (request as any).identity = session.identity;
    (request as any).session = session;
    (request as any).organizationId = organizationId;
    (request as any).membership = membership;

    return true;
  }
}
