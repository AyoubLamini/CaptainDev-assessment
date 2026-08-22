import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorInvitationService } from './collaborator-invitation.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CollaboratorInvitationService', () => {
  let service: CollaboratorInvitationService;
  let prisma: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn((cb) => cb(prisma)),
      executeAsPlatformAdmin: vi.fn((cb) => cb(prisma)),
      executeAsTenant: vi.fn((orgId, cb) => cb(prisma)),
      organization: { findUnique: vi.fn() },
      identity: { findUnique: vi.fn() },
      organizationMember: { findUnique: vi.fn() },
      organizationInvitation: {
        updateMany: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      evidence: { create: vi.fn() },
    };

    emailService = {
      queueEmail: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorInvitationService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<CollaboratorInvitationService>(CollaboratorInvitationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listInvitations', () => {
    it('should list invitations', async () => {
      prisma.organizationInvitation.findMany.mockResolvedValue([
        { id: '1', email: 'test@example.com', role: 'ADMIN', consumedAt: null, expiresAt: new Date(Date.now() + 100000), createdAt: new Date() }
      ]);
      const res = await service.listInvitations('org1');
      expect(res).toHaveLength(1);
      expect(res[0]?.state).toBe('PENDING');
    });
  });

  describe('resendInvitation', () => {
    it('should resend an invitation', async () => {
      prisma.organizationInvitation.findFirst.mockResolvedValue({
        id: 'inv1', email: 'test@example.com', role: 'ADMIN', organizationId: 'org1',
        organization: { name: 'Org 1' }
      });
      prisma.organizationInvitation.create.mockResolvedValue({ id: 'new-inv' });

      const res = await service.resendInvitation('user1', 'org1', 'inv1');
      expect(res.success).toBe(true);
      expect(prisma.organizationInvitation.update).toHaveBeenCalled();
      expect(prisma.organizationInvitation.create).toHaveBeenCalled();
      expect(emailService.queueEmail).toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      prisma.organizationInvitation.findFirst.mockResolvedValue(null);
      await expect(service.resendInvitation('user1', 'org1', 'inv1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke an invitation', async () => {
      prisma.organizationInvitation.findFirst.mockResolvedValue({
        id: 'inv1', email: 'test@example.com', organizationId: 'org1',
      });
      const res = await service.revokeInvitation('user1', 'org1', 'inv1');
      expect(res.success).toBe(true);
      expect(prisma.organizationInvitation.update).toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      prisma.organizationInvitation.findFirst.mockResolvedValue(null);
      await expect(service.revokeInvitation('user1', 'org1', 'inv1')).rejects.toThrow(NotFoundException);
    });
  });
});

