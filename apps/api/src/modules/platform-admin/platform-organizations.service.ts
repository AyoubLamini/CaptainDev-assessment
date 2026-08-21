import { Injectable, NotFoundException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProvisionOrganizationDto } from './dto/provision-organization.dto';
import { InviteOwnerDto } from './dto/invite-owner.dto';
import { DisableOrganizationDto } from './dto/disable-organization.dto';
import { PlatformInterventionDto } from './dto/platform-intervention.dto';
import { IdentityService } from '../identity/identity.service';
import { AuthService } from '../identity/auth.service';
import { EmailService } from '../email/email.service';
import { OrganizationAccessStatus, Prisma } from '@prisma/client';
import { SYSTEM_ORGANIZATION_ID, EvidenceActions } from '../../common/constants';
import * as crypto from 'crypto';

@Injectable()
export class PlatformOrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identityService: IdentityService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  async provisionOrganization(dto: ProvisionOrganizationDto, actorId: string) {
    const newOrgId = crypto.randomUUID();
    return this.prisma.executeAsTenant(newOrgId, async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: newOrgId,
          name: dto.name,
          accessStatus: OrganizationAccessStatus.PROVISIONING,
          commercialStatus: dto.commercialStatus,
        },
      });

      await tx.evidence.create({
        data: {
          organizationId: org.id,
          actorId,
          action: EvidenceActions.PROVISION_ORGANIZATION,
          reason: dto.reason,
          before: Prisma.JsonNull,
          after: {
            name: org.name,
            accessStatus: org.accessStatus,
            commercialStatus: org.commercialStatus,
          },
        },
      });

      return org;
    });
  }

  async getDirectory(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    return this.prisma.executeAsPlatformAdmin(async (tx) => {
      const [data, total] = await Promise.all([
        tx.organization.findMany({
          where: {
            id: { not: SYSTEM_ORGANIZATION_ID },
          },
          select: {
            id: true,
            name: true,
            accessStatus: true,
            commercialStatus: true,
            createdAt: true,
            members: {
              where: { role: 'OWNER' },
              select: {
                identity: { select: { email: true } },
              },
              take: 1,
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        tx.organization.count({
          where: {
            id: { not: SYSTEM_ORGANIZATION_ID },
          },
        }),
      ]);

      return {
        data: data.map(org => ({
          id: org.id,
          name: org.name,
          accessStatus: org.accessStatus,
          commercialStatus: org.commercialStatus,
          createdAt: org.createdAt,
          ownerEmail: org.members[0]?.identity?.email || null,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  async inviteInitialOwner(organizationId: string, dto: InviteOwnerDto, actorId: string) {
    let queuedOutboxId: string | null = null;
    await this.prisma.executeAsTenant(organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      if (org.accessStatus !== OrganizationAccessStatus.PROVISIONING) {
        throw new ConflictException('Organization is not in PROVISIONING state');
      }

      // Invalidate any prior pending invitations for this organization
      await tx.organizationInvitation.updateMany({
        where: {
          organizationId,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await tx.organizationInvitation.create({
        data: {
          organizationId,
          email: dto.email,
          tokenHash,
          expiresAt,
        },
      });

      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`;
      queuedOutboxId = await this.emailService.queueEmail(
        tx as any,
        organizationId,
        dto.email,
        'initial-owner-invitation',
        {
          organizationName: org.name,
          inviterName: 'Platform Administrator',
          inviteUrl,
        }
      );
    });

    if (queuedOutboxId) {
      setImmediate(async () => {
        try {
          await this.prisma.executeAsTenant(organizationId, async (tx) => {
            await this.emailService.dispatchEmail(tx as any, queuedOutboxId!);
          });
        } catch (error) {
          console.error('Failed to dispatch initial owner invitation email:', error);
        }
      });
    }

    return { success: true };
  }

  async disableOrganization(organizationId: string, dto: DisableOrganizationDto, actorId: string) {
    const isValid = await this.identityService.verifyPassword(actorId, dto.passwordConfirmation);
    if (!isValid) {
      throw new UnauthorizedException('Recent authentication failed.');
    }

    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      if (org.accessStatus === OrganizationAccessStatus.DISABLED) {
        throw new ConflictException('Organization is already disabled');
      }

      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: { accessStatus: OrganizationAccessStatus.DISABLED },
      });

      await this.authService.revokeSessionsForOrganization(organizationId);

      await tx.evidence.create({
        data: {
          organizationId: updatedOrg.id,
          actorId,
          action: EvidenceActions.DISABLE_ORGANIZATION,
          reason: dto.reason,
          before: { accessStatus: org.accessStatus },
          after: { accessStatus: updatedOrg.accessStatus },
        },
      });

      return updatedOrg;
    });
  }

  async performIntervention(organizationId: string, dto: PlatformInterventionDto, actorId: string) {
    const isValid = await this.identityService.verifyPassword(actorId, dto.passwordConfirmation);
    if (!isValid) {
      throw new UnauthorizedException('Recent authentication failed.');
    }

    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      const membership = await tx.organizationMember.findFirst({
        where: {
          organizationId,
          identityId: dto.targetIdentityId,
        },
      });

      if (!membership) {
        throw new ForbiddenException('Target identity is not a member of the specified organization');
      }

      await tx.evidence.create({
        data: {
          organizationId,
          actorId,
          action: EvidenceActions.PLATFORM_INTERVENTION,
          reason: dto.reason,
          before: Prisma.JsonNull,
          after: {
            targetIdentityId: dto.targetIdentityId,
            action: dto.action,
          },
        },
      });

      return { success: true };
    });
  }

  async suspendOrganization(organizationId: string, dto: { reason: string; passwordConfirmation: string }, actorId: string) {
    const isValid = await this.identityService.verifyPassword(actorId, dto.passwordConfirmation);
    if (!isValid) {
      throw new UnauthorizedException('Recent authentication failed.');
    }

    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      if (org.accessStatus !== OrganizationAccessStatus.ACTIVE) {
        throw new ConflictException('Only ACTIVE organizations can be suspended');
      }

      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: { accessStatus: OrganizationAccessStatus.SUSPENDED },
      });

      await this.authService.revokeSessionsForOrganization(organizationId);

      await tx.evidence.create({
        data: {
          organizationId: updatedOrg.id,
          actorId,
          action: EvidenceActions.SUSPEND_ORGANIZATION,
          reason: dto.reason,
          before: { accessStatus: org.accessStatus },
          after: { accessStatus: updatedOrg.accessStatus },
        },
      });

      return updatedOrg;
    });
  }

  async reactivateOrganization(organizationId: string, dto: { reason: string; passwordConfirmation: string }, actorId: string) {
    const isValid = await this.identityService.verifyPassword(actorId, dto.passwordConfirmation);
    if (!isValid) {
      throw new UnauthorizedException('Recent authentication failed.');
    }

    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      if (org.accessStatus !== OrganizationAccessStatus.SUSPENDED) {
        throw new ConflictException('Only SUSPENDED organizations can be reactivated');
      }

      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: { accessStatus: OrganizationAccessStatus.ACTIVE },
      });

      await tx.evidence.create({
        data: {
          organizationId: updatedOrg.id,
          actorId,
          action: EvidenceActions.REACTIVATE_ORGANIZATION,
          reason: dto.reason,
          before: { accessStatus: org.accessStatus },
          after: { accessStatus: updatedOrg.accessStatus },
        },
      });

      return updatedOrg;
    });
  }

  async updateCommercialStatus(organizationId: string, dto: { commercialStatus: string; reason: string }, actorId: string) {
    return this.prisma.executeAsTenant(organizationId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: { commercialStatus: dto.commercialStatus as any },
      });

      await tx.evidence.create({
        data: {
          organizationId: updatedOrg.id,
          actorId,
          action: EvidenceActions.UPDATE_COMMERCIAL_STATUS,
          reason: dto.reason,
          before: { commercialStatus: org.commercialStatus },
          after: { commercialStatus: updatedOrg.commercialStatus },
        },
      });

      return updatedOrg;
    });
  }
}
