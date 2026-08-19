import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import { EvidenceActions } from '../../common/constants';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';

@Injectable()
export class CollaboratorInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async inviteCollaborator(
    inviterIdentityId: string,
    organizationId: string,
    dto: InviteCollaboratorDto
  ) {
    const rawToken = crypto.randomBytes(32).toString('hex'); // 256 bits entropy
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Ensure email is normalized
    const email = dto.email.toLowerCase().trim();

    return this.prisma.$transaction(async (tx) => {
      // Find org
      const org = await tx.organization.findUnique({
        where: { id: organizationId }
      });
      if (!org) {
        throw new BadRequestException('Organization not found');
      }

      // Check if they are already a member
      const existingIdentity = await tx.identity.findUnique({ where: { email } });
      if (existingIdentity) {
        const existingMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_identityId: {
              organizationId,
              identityId: existingIdentity.id
            }
          }
        });
        if (existingMember) {
          // Neutral success response for existing member, no email sent
          return { success: true };
        }
      }

      // Invalidate existing pending invitations for this email in this org
      await tx.organizationInvitation.updateMany({
        where: {
          organizationId,
          email,
          consumedAt: null,
          expiresAt: { gt: new Date() }
        },
        data: {
          consumedAt: new Date(), // Mark as consumed to invalidate
        }
      });

      // Create new invitation
      await tx.organizationInvitation.create({
        data: {
          organizationId,
          email,
          tokenHash,
          role: dto.role,
          grants: dto.grants ? dto.grants : undefined,
          expiresAt,
        }
      });

      // Queue email
      const outboxId = await this.emailService.queueEmail(
        tx,
        organizationId,
        email,
        'collaborator-invitation',
        {
          organizationName: org.name,
          inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation?token=${rawToken}`
        }
      );

      // Record evidence
      await tx.evidence.create({
        data: {
          organizationId,
          actorId: inviterIdentityId,
          action: EvidenceActions.INVITE_COLLABORATOR,
          reason: `Invited ${email} as ${dto.role}`,
          after: { email, role: dto.role, grants: dto.grants }
        }
      });
      
      return { success: true };
    });
  }
}
