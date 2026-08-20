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

  async promoteCollaborator(
    organizationId: string,
    memberId: string,
    adminIdentityId: string,
    reason: string,
    sessionCreatedAt: any
  ) {
    verifyRecentAuth(sessionCreatedAt, 15);

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: { id: memberId },
      });

      if (!member || member.organizationId !== organizationId) {
        throw new NotFoundException('Collaborator not found');
      }

      if (member.status !== 'ACTIVE') {
        throw new BadRequestException('Inactive member');
      }

      if (member.identityId === adminIdentityId) {
        throw new BadRequestException('Cannot promote yourself');
      }

      if (member.role === 'ADMIN' || member.role === 'OWNER') {
        throw new BadRequestException('Member is already an admin or owner');
      }

      const updatedMember = await tx.organizationMember.update({
        where: { id: memberId },
        data: { role: 'ADMIN' },
      });

      await tx.evidence.create({
        data: {
          organizationId,
          actorId: adminIdentityId,
          action: EvidenceActions.PROMOTE_COLLABORATOR,
          reason,
          before: { role: member.role },
          after: { role: 'ADMIN' },
        }
      });

      return updatedMember;
    });
  }

  async proposeOwnershipTransfer(
    organizationId: string,
    adminIdentityId: string,
    successorMemberId: string,
    sessionCreatedAt: any
  ) {
    verifyRecentAuth(sessionCreatedAt, 15);

    return this.prisma.$transaction(async (tx) => {
      const ownerMember = await tx.organizationMember.findUnique({
        where: { organizationId_identityId: { organizationId, identityId: adminIdentityId } }
      });

      if (!ownerMember || ownerMember.role !== 'OWNER' || ownerMember.status !== 'ACTIVE') {
        throw new ForbiddenException('Only the active organization owner can propose a transfer');
      }

      const successor = await tx.organizationMember.findUnique({
        where: { id: successorMemberId }
      });

      if (!successor || successor.organizationId !== organizationId) {
        throw new NotFoundException('Successor member not found');
      }

      if (successor.status !== 'ACTIVE' || successor.role !== 'ADMIN') {
        throw new BadRequestException('Successor must be an active administrator');
      }

      if (successor.identityId === adminIdentityId) {
        throw new BadRequestException('Cannot transfer ownership to yourself');
      }

      const existingActiveProposals = await tx.ownershipTransferProposal.findMany({
        where: {
          organizationId,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      });

      if (existingActiveProposals.length > 0) {
        throw new BadRequestException('An active ownership transfer proposal already exists');
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const proposal = await tx.ownershipTransferProposal.create({
        data: {
          organizationId,
          proposerId: ownerMember.id,
          successorId: successor.id,
          status: 'PENDING',
          expiresAt,
        }
      });

      await tx.evidence.create({
        data: {
          organizationId,
          actorId: adminIdentityId,
          action: EvidenceActions.PROPOSE_OWNERSHIP_TRANSFER,
          reason: 'Owner proposed ownership transfer',
          before: {},
          after: { proposalId: proposal.id, successorId: successor.id },
        }
      });

      return proposal;
    });
  }

  async acceptOwnershipTransfer(
    organizationId: string,
    adminIdentityId: string,
    sessionCreatedAt: any
  ) {
    verifyRecentAuth(sessionCreatedAt, 15);

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: { organizationId_identityId: { organizationId, identityId: adminIdentityId } }
      });

      if (!member) {
        throw new ForbiddenException('Member not found');
      }

      const proposals = await tx.ownershipTransferProposal.findMany({
        where: { organizationId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      });
      
      const proposal = proposals[0];

      if (!proposal) {
        throw new NotFoundException('No pending proposal found');
      }

      if (proposal.successorId !== member.id) {
        throw new ForbiddenException('You are not the designated successor');
      }

      if (proposal.expiresAt < new Date()) {
        throw new BadRequestException('Proposal has expired');
      }

      const proposer = await tx.organizationMember.findUnique({
        where: { id: proposal.proposerId }
      });

      if (!proposer || proposer.role !== 'OWNER' || proposer.status !== 'ACTIVE') {
        throw new BadRequestException('Proposer is no longer the active owner');
      }

      if (member.role !== 'ADMIN' || member.status !== 'ACTIVE') {
        throw new BadRequestException('Successor is no longer an active administrator');
      }

      await tx.organizationMember.update({
        where: { id: proposer.id },
        data: { role: 'ADMIN' }
      });

      await tx.organizationMember.update({
        where: { id: member.id },
        data: { role: 'OWNER' }
      });

      const updatedProposal = await tx.ownershipTransferProposal.update({
        where: { id: proposal.id },
        data: { status: 'ACCEPTED' }
      });

      await tx.evidence.create({
        data: {
          organizationId,
          actorId: adminIdentityId,
          action: EvidenceActions.ACCEPT_OWNERSHIP_TRANSFER,
          reason: 'Successor accepted ownership transfer',
          before: { proposerRole: 'OWNER', successorRole: 'ADMIN', proposalStatus: 'PENDING' },
          after: { proposerRole: 'ADMIN', successorRole: 'OWNER', proposalStatus: 'ACCEPTED' },
        }
      });

      return updatedProposal;
    });
  }

  async cancelOwnershipTransfer(
    organizationId: string,
    adminIdentityId: string,
    sessionCreatedAt: any
  ) {
    verifyRecentAuth(sessionCreatedAt, 15);

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: { organizationId_identityId: { organizationId, identityId: adminIdentityId } }
      });

      if (!member || member.role !== 'OWNER') {
        throw new ForbiddenException('Only the owner can cancel a transfer proposal');
      }

      const proposals = await tx.ownershipTransferProposal.findMany({
        where: { organizationId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      });

      const proposal = proposals[0];
      if (!proposal) {
        throw new NotFoundException('No pending proposal found');
      }

      if (proposal.expiresAt < new Date()) {
        throw new BadRequestException('Proposal expired');
      }

      const updatedProposal = await tx.ownershipTransferProposal.update({
        where: { id: proposal.id },
        data: { status: 'CANCELLED' }
      });

      await tx.evidence.create({
        data: {
          organizationId,
          actorId: adminIdentityId,
          action: EvidenceActions.CANCEL_OWNERSHIP_TRANSFER,
          reason: 'Owner cancelled ownership transfer proposal',
          before: { proposalStatus: 'PENDING' },
          after: { proposalStatus: 'CANCELLED' },
        }
      });

      return updatedProposal;
    });
  }


}
