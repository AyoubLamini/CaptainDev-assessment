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
      count: vi.fn(),
    },
    businessScope: {
      findMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    evidence: {
      create: vi.fn(),
    },
    ownershipTransferProposal: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
        status: 'ACTIVE',
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
        status: 'ACTIVE',
      });
      await expect(service.updateCollaboratorGrants('org_1', 'mem_1', 'admin_1', { grants: { capabilities: [], scopes: [] } }, new Date()))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if cross-org scopes are referenced', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'other_user',
        status: 'ACTIVE',
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
        status: 'ACTIVE',
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
        status: 'ACTIVE',
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

  describe('updateCollaboratorStatus', () => {
    it('should throw NotFoundException if member not found', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.updateCollaboratorStatus('org_1', 'mem_1', 'admin_1', 'SUSPENDED', new Date()))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if member is REMOVED', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'user_1',
        status: 'REMOVED'
      });
      await expect(service.updateCollaboratorStatus('org_1', 'mem_1', 'admin_1', 'SUSPENDED', new Date()))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if admin updates their own status', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'admin_1',
        status: 'ACTIVE'
      });
      await expect(service.updateCollaboratorStatus('org_1', 'mem_1', 'admin_1', 'SUSPENDED', new Date()))
        .rejects.toThrow(ForbiddenException);
    });

    it('should update status and revoke sessions', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'user_1',
        status: 'ACTIVE',
        role: 'MEMBER'
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({ id: 'mem_1' });
      mockPrismaService.evidence.create.mockResolvedValue({});
      mockPrismaService.session.deleteMany.mockResolvedValue({});
      
      const freshDate = new Date();
      await service.updateCollaboratorStatus('org_1', 'mem_1', 'admin_1', 'SUSPENDED', freshDate);

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { status: 'SUSPENDED' },
      });
      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { identityId: 'user_1' }
      });
    });

    it('should reject suspending the last active owner', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'user_1',
        status: 'ACTIVE',
        role: 'OWNER'
      });
      mockPrismaService.organizationMember.count.mockResolvedValue(1);

      const freshDate = new Date();
      await expect(service.updateCollaboratorStatus('org_1', 'mem_1', 'admin_1', 'SUSPENDED', freshDate))
        .rejects.toThrow(BadRequestException);
    });

    it('should require recent auth for suspension', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'user_1',
        status: 'ACTIVE',
        role: 'MEMBER'
      });
      const staleDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes old

      await expect(service.updateCollaboratorStatus('org_1', 'mem_1', 'admin_1', 'SUSPENDED', staleDate))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('promoteCollaborator', () => {
    it('should promote an active member to ADMIN and log evidence', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'user_1',
        status: 'ACTIVE',
        role: 'MEMBER'
      });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      mockPrismaService.organizationMember.update.mockResolvedValue({ id: 'mem_1', role: 'ADMIN' });
      
      const result = await service.promoteCollaborator('org_1', 'mem_1', 'admin_1', 'reason', new Date());
      expect(result).toBeDefined();
    });

    it('should reject self-promotion', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
        identityId: 'admin_1',
        status: 'ACTIVE',
        role: 'MEMBER'
      });
      await expect(service.promoteCollaborator('org_1', 'mem_1', 'admin_1', 'reason', new Date()))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('proposeOwnershipTransfer', () => {
    it('should create proposal if current owner proposes to active admin', async () => {
      mockPrismaService.organizationMember.findUnique.mockImplementation(async ({ where }) => {
        if (where.organizationId_identityId) return { id: 'owner_1', role: 'OWNER', status: 'ACTIVE' };
        if (where.id === 'succ_1') return { id: 'succ_1', role: 'ADMIN', status: 'ACTIVE', organizationId: 'org_1' };
        return null;
      });
      mockPrismaService.ownershipTransferProposal.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      mockPrismaService.ownershipTransferProposal.create.mockResolvedValue({ id: 'prop_1' });
      
      const result = await service.proposeOwnershipTransfer('org_1', 'admin_1', 'succ_1', new Date());
      expect(result).toBeDefined();
    });
  });

  describe('acceptOwnershipTransfer', () => {
    it('should accept valid proposal and swap roles', async () => {
      mockPrismaService.organizationMember.findUnique.mockImplementation(async ({ where }) => {
        if (where.organizationId_identityId) return { id: 'succ_1', role: 'ADMIN', status: 'ACTIVE' };
        if (where.id === 'owner_1') return { id: 'owner_1', role: 'OWNER', status: 'ACTIVE' };
        return null;
      });
      mockPrismaService.ownershipTransferProposal.findMany.mockResolvedValue([
        { id: 'prop_1', successorId: 'succ_1', proposerId: 'owner_1', status: 'PENDING', expiresAt: new Date(Date.now() + 100000) }
      ]);
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      
      await service.acceptOwnershipTransfer('org_1', 'admin_1', new Date());
      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledTimes(2);
    });

    it('should reject if proposal is expired', async () => {
      mockPrismaService.organizationMember.findUnique.mockImplementation(async ({ where }) => {
        if (where.organizationId_identityId) return { id: 'succ_1', role: 'ADMIN', status: 'ACTIVE' };
        return null;
      });
      mockPrismaService.ownershipTransferProposal.findMany.mockResolvedValue([
        { id: 'prop_1', successorId: 'succ_1', proposerId: 'owner_1', status: 'PENDING', expiresAt: new Date(Date.now() - 100000) }
      ]);
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      
      await expect(service.acceptOwnershipTransfer('org_1', 'admin_1', new Date()))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject if non-designated successor attempts to accept', async () => {
      mockPrismaService.organizationMember.findUnique.mockImplementation(async ({ where }) => {
        if (where.organizationId_identityId) return { id: 'other_admin', role: 'ADMIN', status: 'ACTIVE' };
        return null;
      });
      mockPrismaService.ownershipTransferProposal.findMany.mockResolvedValue([
        { id: 'prop_1', successorId: 'succ_1', proposerId: 'owner_1', status: 'PENDING', expiresAt: new Date(Date.now() + 100000) }
      ]);
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      
      await expect(service.acceptOwnershipTransfer('org_1', 'admin_1', new Date()))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelOwnershipTransfer', () => {
    it('should reject if actor is not the owner', async () => {
      mockPrismaService.organizationMember.findUnique.mockImplementation(async ({ where }) => {
        if (where.organizationId_identityId) return { id: 'admin_1', role: 'ADMIN', status: 'ACTIVE' };
        return null;
      });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      
      await expect(service.cancelOwnershipTransfer('org_1', 'admin_1', new Date()))
        .rejects.toThrow(ForbiddenException);
    });

    it('should successfully cancel the proposal if actor is owner', async () => {
      mockPrismaService.organizationMember.findUnique.mockImplementation(async ({ where }) => {
        if (where.organizationId_identityId) return { id: 'owner_1', role: 'OWNER', status: 'ACTIVE' };
        return null;
      });
      mockPrismaService.ownershipTransferProposal.findMany.mockResolvedValue([
        { id: 'prop_1', successorId: 'succ_1', proposerId: 'owner_1', status: 'PENDING', expiresAt: new Date(Date.now() + 100000) }
      ]);
      mockPrismaService.ownershipTransferProposal.update.mockResolvedValue({ id: 'prop_1', status: 'CANCELLED' });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockPrismaService));
      
      const result = await service.cancelOwnershipTransfer('org_1', 'owner_1', new Date());
      expect(result.status).toBe('CANCELLED');
    });
  });
});

