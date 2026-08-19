import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateCollaboratorGrantsDto, GrantsPayloadDto } from './dto/update-collaborator-grants.dto';
import { verifyRecentAuth } from '../access-control/guards/recent-auth.guard';
import { EvidenceActions } from '../../common/constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollaboratorService {
  constructor(private readonly prisma: PrismaService) {}

  async getCollaborator(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        id: memberId,
      },
      include: {
        identity: {
          select: {
            id: true,
            email: true,
          }
        }
      }
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Collaborator not found');
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Inactive member');
    }

    return member;
  }

  async updateCollaboratorGrants(
    organizationId: string,
    memberId: string,
    adminIdentityId: string,
    dto: UpdateCollaboratorGrantsDto,
    sessionCreatedAt: any
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Collaborator not found');
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Inactive member');
    }

    if (member.identityId === adminIdentityId) {
      throw new ForbiddenException('Administrators cannot update their own explicit grants');
    }

    // Validate scope boundaries: all provided scopes must exist in the organization and be active
    if (dto.grants.scopes && dto.grants.scopes.length > 0) {
      // Use Set to handle duplicate valid IDs correctly as per spec
      const uniqueScopeIds = Array.from(new Set(dto.grants.scopes));
      
      const existingScopes = await this.prisma.businessScope.findMany({
        where: {
          id: { in: uniqueScopeIds },
          organizationId: organizationId,
          status: 'ACTIVE',
        },
        select: { id: true }
      });

      if (existingScopes.length !== uniqueScopeIds.length) {
        throw new BadRequestException('One or more scopes do not exist within this organization or are inactive');
      }
    }

    const oldGrants = member.grants as Record<string, any> | null;
    const isReduction = this.detectAccessReduction(oldGrants, dto.grants);

    if (isReduction) {
      verifyRecentAuth(sessionCreatedAt, 15);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedMember = await tx.organizationMember.update({
        where: { id: memberId },
        data: {
          grants: dto.grants as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.evidence.create({
        data: {
          organizationId,
          actorId: adminIdentityId,
          action: EvidenceActions.UPDATE_COLLABORATOR_GRANTS,
          reason: 'Administrator updated explicit grants',
          before: oldGrants as unknown as Prisma.InputJsonValue ?? Prisma.JsonNull,
          after: dto.grants as unknown as Prisma.InputJsonValue,
        }
      });

      return updatedMember;
    });
  }

  private detectAccessReduction(oldGrants: Record<string, any> | null, newGrants: GrantsPayloadDto): boolean {
    if (!oldGrants) return false;
    
    const oldCaps = Array.isArray(oldGrants.capabilities) ? oldGrants.capabilities : [];
    const newCaps = Array.isArray(newGrants.capabilities) ? newGrants.capabilities : [];
    
    for (const cap of oldCaps) {
      if (!newCaps.includes(cap)) return true;
    }
    
    const oldScopes = Array.isArray(oldGrants.scopes) ? oldGrants.scopes : [];
    const newScopes = Array.isArray(newGrants.scopes) ? newGrants.scopes : [];
    
    for (const scope of oldScopes) {
      if (!newScopes.includes(scope)) return true;
    }
    
    return false;
  }

  async updateCollaboratorStatus(
    organizationId: string,
    memberId: string,
    adminIdentityId: string,
    status: import('@prisma/client').OrganizationMemberStatus,
    sessionCreatedAt: Date | undefined
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Collaborator not found');
    }

    if (member.status === 'REMOVED') {
      throw new BadRequestException('Cannot change status of a removed member');
    }
    
    if (status === member.status) {
      return member;
    }

    if (member.identityId === adminIdentityId) {
      throw new ForbiddenException('Administrators cannot change their own status');
    }

    if (status === 'SUSPENDED' || status === 'REMOVED') {
      verifyRecentAuth(sessionCreatedAt, 15);
    }

    return this.prisma.$transaction(async (tx) => {
      if (status === 'SUSPENDED' || status === 'REMOVED') {
        if (member.role === 'OWNER') {
          const activeOwnersCount = await tx.organizationMember.count({
            where: { organizationId, role: 'OWNER', status: 'ACTIVE' }
          });
          if (activeOwnersCount <= 1) {
            throw new BadRequestException('Cannot suspend or remove the last active owner');
          }
        }

        if (member.role === 'ADMIN') {
          const activeAdminsCount = await tx.organizationMember.count({
            where: { organizationId, role: 'ADMIN', status: 'ACTIVE' }
          });
          if (activeAdminsCount <= 1) {
            throw new BadRequestException('Cannot suspend or remove the last active administrator');
          }
        }
      }

      const updatedMember = await tx.organizationMember.update({
        where: { id: memberId },
        data: { status },
      });

      let evidenceAction = '';
      if (status === 'SUSPENDED') evidenceAction = EvidenceActions.SUSPEND_COLLABORATOR;
      else if (status === 'ACTIVE') evidenceAction = EvidenceActions.REACTIVATE_COLLABORATOR;
      else if (status === 'REMOVED') evidenceAction = EvidenceActions.REMOVE_COLLABORATOR;
      else evidenceAction = 'UPDATE_COLLABORATOR_STATUS';

      await tx.evidence.create({
        data: {
          organizationId,
          actorId: adminIdentityId,
          action: evidenceAction,
          reason: `Administrator updated status to ${status}`,
          before: { status: member.status },
          after: { status },
        }
      });

      if (status === 'SUSPENDED' || status === 'REMOVED') {
        await tx.session.deleteMany({
          where: { identityId: member.identityId },
        });
      }

      return updatedMember;
    });
  }
}
