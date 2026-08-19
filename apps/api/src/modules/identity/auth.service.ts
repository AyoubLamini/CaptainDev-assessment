import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { SYSTEM_ORGANIZATION_ID } from '../../common/constants';

@Injectable()
export class AuthService {
  private attempts = new Map<string, { count: number; nextAllowed: number }>();

  constructor(
    private readonly identityService: IdentityService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, pass: string) {
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();
    const throttle = this.attempts.get(normalizedEmail);

    if (throttle && now < throttle.nextAllowed) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.identityService.findByEmailWithPassword(normalizedEmail);

    let isValid = false;

    if (user?.passwordCredential) {
      try {
        isValid = await argon2.verify(user.passwordCredential.passwordHash, pass);
      } catch {
        isValid = false;
      }
    } else {
      // Dummy verify to prevent timing attacks
      try {
        await argon2.hash(pass || 'dummy', {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4
        });
      } catch {
        // Ignore
      }
    }

    if (!isValid || !user) {
      const count = throttle ? throttle.count + 1 : 1;
      const penaltyMs = Math.min(1000 * Math.pow(2, count), 60000); // Max 1 minute penalty
      this.attempts.set(normalizedEmail, { count, nextAllowed: now + penaltyMs });
      throw new UnauthorizedException('Invalid email or password');
    }

    this.attempts.delete(normalizedEmail);

    // SEC-15: Cryptographic entropy (32 bytes)
    const sessionId = crypto.randomBytes(32).toString('base64url');
    // Store only the SHA-256 (or stronger) hash of the session ID
    const sessionIdHash = crypto.createHash('sha256').update(sessionId).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        id: sessionIdHash,
        identityId: user.id,
        expiresAt,
      },
    });

    return { sessionId, expiresAt };
  }

  async logout(sessionId: string) {
    const sessionIdHash = crypto.createHash('sha256').update(sessionId).digest('hex');
    await this.prisma.session.deleteMany({
      where: { id: sessionIdHash },
    });
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase();
    
    // Constant time return to prevent timing attacks.
    // The DB and email operations run in the background.
    setImmediate(async () => {
      try {
        const user = await this.identityService.findByEmailWithPassword(normalizedEmail);
        if (!user) {
          return;
        }

        const token = crypto.randomBytes(32).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

        let queuedOutboxId: string | null = null;
          queuedOutboxId = await this.prisma.executeAsTenant(SYSTEM_ORGANIZATION_ID, async (tx) => {
          const systemOrg = await tx.organization.upsert({
            where: { id: SYSTEM_ORGANIZATION_ID },
            update: {},
            create: { 
              id: SYSTEM_ORGANIZATION_ID,
              name: 'System',
              accessStatus: 'ACTIVE',
              commercialStatus: 'ACTIVE'
            },
          });

          await tx.passwordResetToken.create({
            data: {
              id: tokenHash,
              identityId: user.id,
              expiresAt,
            },
          });

          const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
          
          return this.emailService.queueEmail(
            tx as any,
            systemOrg.id,
            normalizedEmail,
            'password-reset',
            { resetUrl }
          );
        });

        if (queuedOutboxId) {
          setImmediate(async () => {
            try {
              await this.prisma.executeAsTenant(SYSTEM_ORGANIZATION_ID, async (tx) => {
                await this.emailService.dispatchEmail(tx as any, queuedOutboxId!);
              });
            } catch (error) {
              console.log("First error catch: ", error);
            }
          });
        }
      } catch (error) {
        console.log("Second error catch: ", error);
      }
    });

    return { message: 'If an account with that email exists, we sent a reset link.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { id: tokenHash },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    await this.prisma.$transaction(async (tx) => {
      // Safely delete token, using deleteMany to prevent P2025 errors on concurrent redemptions
      await tx.passwordResetToken.deleteMany({
        where: { id: tokenHash },
      });

      // Update password
      await tx.passwordCredential.update({
        where: { identityId: resetToken.identityId },
        data: { passwordHash },
      });

      // Revoke all existing sessions
      await tx.session.deleteMany({
        where: { identityId: resetToken.identityId },
      });
    });

    return { success: true };
  }

  async revokeSessionsForOrganization(organizationId: string) {
    // Delete sessions for any identity that has a membership in this organization
    await this.prisma.session.deleteMany({
      where: {
        identity: {
          memberships: {
            some: {
              organizationId,
            },
          },
        },
      },
    });
  }
}
