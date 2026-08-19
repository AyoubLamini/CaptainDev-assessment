import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorService } from './collaborator.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EvidenceActions } from '../../common/constants';

describe('CollaboratorService', () => {
  let service: CollaboratorService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organizationMember: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    businessScope: {
      findMany: vi.fn(),
    },
    evidence: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      return cb(mockPrismaService);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CollaboratorService>(CollaboratorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCollaborator', () => {
    it('should throw NotFoundException if member not found', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.getCollaborator('org_1', 'mem_1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if member is in a different organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_2',
        identityId: 'user_1',
      });
      await expect(service.getCollaborator('org_1', 'mem_1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCollaboratorGrants', () => {
    it('should throw NotFoundException if member is in a different organization', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_2',
        identityId: 'user_1',
      });
      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: { capabilities: [], scopes: [] } }, new Date()))
        .rejects.toThrow(NotFoundException);
    });

    it('should allow access reduction with fresh session', async () => {
      const oldGrants = { capabilities: ['CAP_1', 'CAP_2'], scopes: ['scope_1'] };
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'other_user',
        grants: oldGrants,
      });
      mockPrismaService.businessScope.findMany.mockResolvedValue([{ id: 'scope_1' }]);
      mockPrismaService.organizationMember.update.mockResolvedValue({ id: 'mem_1' });
      mockPrismaService.evidence.create.mockResolvedValue({});

      // Reducing capabilities
      const newGrants = { capabilities: ['CAP_1'], scopes: ['scope_1'] };
      const freshDate = new Date(); // right now

      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: newGrants }, freshDate))
        .resolves.toBeDefined();
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: { capabilities: [], scopes: [] } }, new Date()))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if admin updates their own grants', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'admin_1',
      });
      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: { capabilities: [], scopes: [] } }, new Date()))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if cross-org scopes are referenced', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'other_user',
      });
      // Simulate finding only 1 out of 2 scopes
      mockPrismaService.businessScope.findMany.mockResolvedValue([{ id: 'scope_1' }]);
      
      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: { capabilities: [], scopes: ['scope_1', 'scope_2'] } }, new Date()))
        .rejects.toThrow(BadRequestException);
    });

    it('should update grants and create evidence for valid request', async () => {
      const oldGrants = { capabilities: ['CAP_1'], scopes: ['scope_1'] };
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'other_user',
        grants: oldGrants,
      });
      mockPrismaService.businessScope.findMany.mockResolvedValue([{ id: 'scope_1' }, { id: 'scope_2' }]);
      mockPrismaService.organizationMember.update.mockResolvedValue({ id: 'mem_1' });
      mockPrismaService.evidence.create.mockResolvedValue({});

      const newGrants = { capabilities: ['CAP_1', 'CAP_2'], scopes: ['scope_1', 'scope_2'] };

      await service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: newGrants }, new Date());

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { grants: newGrants },
      });
      expect(mockPrismaService.evidence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: EvidenceActions.UPDATE_COLLABORATOR_GRANTS,
          actorId: 'admin_1',
          before: oldGrants,
          after: newGrants,
        }),
      });
    });

    it('should require recent auth when access is reduced', async () => {
      const oldGrants = { capabilities: ['CAP_1', 'CAP_2'], scopes: ['scope_1'] };
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'other_user',
        grants: oldGrants,
      });
      mockPrismaService.businessScope.findMany.mockResolvedValue([{ id: 'scope_1' }]);

      // Reducing capabilities
      const newGrants = { capabilities: ['CAP_1'], scopes: ['scope_1'] };
      const staleDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes old

      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: newGrants }, staleDate))
        .rejects.toThrow(ForbiddenException); // Recent auth required
    });
  });
});
