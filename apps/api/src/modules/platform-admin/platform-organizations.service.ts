import { Injectable, NotFoundException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProvisionOrganizationDto } from './dto/provision-organization.dto';
import { InviteOwnerDto } from './dto/invite-owner.dto';
import { DisableOrganizationDto } from './dto/disable-organization.dto';
import { PlatformInterventionDto } from './dto/platform-intervention.dto';
import { IdentityService } from '../identity/identity.service';
import { AuthService } from '../identity/auth.service';
import { OrganizationAccessStatus, Prisma } from '@prisma/client';
import { SYSTEM_ORGANIZATION_ID, EvidenceActions } from '../../common/constants';
import * as crypto from 'crypto';

@Injectable()
export class PlatformOrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identityService: IdentityService,
    private readonly authService: AuthService,
  ) {}

  async provisionOrganization(dto: ProvisionOrganizationDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
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

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where: {
          id: { not: SYSTEM_ORGANIZATION_ID },
        },
        select: {
          id: true,
          name: true,
          accessStatus: true,
          commercialStatus: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({
        where: {
          id: { not: SYSTEM_ORGANIZATION_ID },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async inviteInitialOwner(organizationId: string, dto: InviteOwnerDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
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

      const payload = JSON.stringify({
        type: 'INITIAL_OWNER_INVITATION',
        email: dto.email,
        token, // Plaintext token sent via email
      });

      await tx.emailOutbox.create({
        data: {
          organizationId,
          payload,
        },
      });

      return { success: true };
    });
  }

  async disableOrganization(organizationId: string, dto: DisableOrganizationDto, actorId: string) {
    const isValid = await this.identityService.verifyPassword(actorId, dto.passwordConfirmation);
    if (!isValid) {
      throw new UnauthorizedException('Recent authentication failed.');
    }

    return this.prisma.$transaction(async (tx) => {
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

    return this.prisma.$transaction(async (tx) => {
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
}

