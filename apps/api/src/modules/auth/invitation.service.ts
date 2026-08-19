import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { OrganizationAccessStatus, Prisma } from '@prisma/client';
import { EvidenceActions } from '../../common/constants';

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    
    // Hash password OUTSIDE the transaction to prevent connection pool exhaustion
    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findFirst({
        where: {
          tokenHash,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        throw new BadRequestException('Invalid, expired, or consumed invitation token');
      }

      if (invitation.organization.accessStatus !== OrganizationAccessStatus.PROVISIONING) {
        throw new ConflictException('Organization is not in PROVISIONING state');
      }

      const existingIdentity = await tx.identity.findUnique({
        where: { email: invitation.email },
      });

      if (existingIdentity) {
        throw new ConflictException('Email already in use');
      }

      const identity = await tx.identity.create({
        data: {
          email: invitation.email,
        },
      });

      await tx.passwordCredential.create({
        data: {
          identityId: identity.id,
          passwordHash,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          identityId: identity.id,
          role: 'ADMIN',
        },
      });

      await tx.organization.update({
        where: { id: invitation.organizationId },
        data: {
          accessStatus: OrganizationAccessStatus.ACTIVE,
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { consumedAt: new Date() },
      });

      await tx.evidence.create({
        data: {
          organizationId: invitation.organizationId,
          actorId: identity.id,
          action: EvidenceActions.ACTIVATE_ORGANIZATION,
          reason: 'Initial owner invitation accepted',
          before: { accessStatus: OrganizationAccessStatus.PROVISIONING },
          after: { accessStatus: OrganizationAccessStatus.ACTIVE },
        },
      });

      return { success: true };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async acceptCollaboratorInvitation(dto: AcceptInvitationDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    let identity = await this.prisma.identity.findUnique({
      where: { email: invitation.email },
      include: { passwordCredential: true }
    });

    let newPasswordHash: string | null = null;

    if (identity) {
      // Existing user: check if password is provided and verify it
      if (!dto.password) {
        throw new BadRequestException('Password required for authentication');
      }
      if (!identity.passwordCredential) {
        throw new BadRequestException('Invalid credentials');
      }
      const valid = await argon2.verify(identity.passwordCredential.passwordHash, dto.password);
      if (!valid) {
        throw new BadRequestException('Invalid or expired invitation token'); // Neutral failure
      }
    } else {
      // New user
      if (!dto.password) {
         throw new BadRequestException('Password is required');
      }
      newPasswordHash = await argon2.hash(dto.password);
    }

    return this.prisma.$transaction(async (tx) => {
      // Check again inside tx
      const txInvitation = await tx.organizationInvitation.findFirst({
        where: {
          tokenHash,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!txInvitation) {
        throw new BadRequestException('Invalid or expired invitation token');
      }

      if (!identity) {
        identity = await tx.identity.create({
          data: {
            email: invitation.email,
          },
          include: { passwordCredential: true }
        });

        await tx.passwordCredential.create({
          data: {
            identityId: identity.id,
            passwordHash: newPasswordHash!,
          },
        });
      }

      // Ensure no cross-linking error. Since we search for email, this creates the membership.
      // But if the member already exists, we should prevent duplicate creation.
      const existingMember = await tx.organizationMember.findUnique({
        where: {
          organizationId_identityId: {
            organizationId: invitation.organizationId,
            identityId: identity.id
          }
        }
      });

      if (!existingMember) {
        await tx.organizationMember.create({
          data: {
            organizationId: invitation.organizationId,
            identityId: identity.id,
            role: invitation.role || 'COLLABORATOR',
            grants: invitation.grants || Prisma.JsonNull,
          },
        });
      }

      // Mark invitation as consumed
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { consumedAt: new Date() },
      });

      // Record evidence
      await tx.evidence.create({
        data: {
          organizationId: invitation.organizationId,
          actorId: identity.id,
          action: EvidenceActions.ACCEPT_COLLABORATOR_INVITATION,
          reason: 'Collaborator invitation accepted',
          after: { role: invitation.role },
        },
      });

      return { success: true };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}
