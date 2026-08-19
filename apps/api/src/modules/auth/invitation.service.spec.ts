import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../database/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { OrganizationAccessStatus, Prisma } from '@prisma/client';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acceptInvitation', () => {
    const validDto = {
      token: 'valid_token',
      password: 'StrongPassword123!',
    };

    const tokenHash = crypto.createHash('sha256').update(validDto.token).digest('hex');

    it('should successfully accept an invitation, activate org, and consume token', async () => {
      const mockTx = {
        organizationInvitation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'invitation_id',
            organizationId: 'org_id',
            email: 'test@example.com',
            organization: { accessStatus: OrganizationAccessStatus.PROVISIONING },
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        identity: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'identity_id' }),
        },
        passwordCredential: {
          create: vi.fn().mockResolvedValue({}),
        },
        organizationMember: {
          create: vi.fn().mockResolvedValue({}),
        },
        organization: {
          update: vi.fn().mockResolvedValue({}),
        },
        evidence: {
          create: vi.fn().mockResolvedValue({}),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback, options) => {
        expect(options).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return callback(mockTx as any);
      });

      const result = await service.acceptInvitation(validDto);

      expect(result).toEqual({ success: true });
      expect(argon2.hash).toHaveBeenCalledWith(validDto.password);

      expect(mockTx.organizationInvitation.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash,
          consumedAt: null,
          expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
        },
        include: { organization: true },
      });

      expect(mockTx.identity.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockTx.identity.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com' },
      });
      expect(mockTx.passwordCredential.create).toHaveBeenCalledWith({
        data: { identityId: 'identity_id', passwordHash: 'hashed_password' },
      });
      expect(mockTx.organizationMember.create).toHaveBeenCalledWith({
        data: { organizationId: 'org_id', identityId: 'identity_id', role: 'ADMIN' },
      });
      expect(mockTx.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_id' },
        data: { accessStatus: OrganizationAccessStatus.ACTIVE },
      });
      expect(mockTx.organizationInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation_id' },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException if token is expired, consumed, or invalid', async () => {
      const mockTx = {
        organizationInvitation: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback, options) => {
        return callback(mockTx as any);
      });

      await expect(service.acceptInvitation(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if organization is not PROVISIONING', async () => {
      const mockTx = {
        organizationInvitation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'invitation_id',
            organizationId: 'org_id',
            email: 'test@example.com',
            organization: { accessStatus: OrganizationAccessStatus.ACTIVE },
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback, options) => {
        return callback(mockTx as any);
      });

      await expect(service.acceptInvitation(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email is already in use', async () => {
      const mockTx = {
        organizationInvitation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'invitation_id',
            organizationId: 'org_id',
            email: 'test@example.com',
            organization: { accessStatus: OrganizationAccessStatus.PROVISIONING },
          }),
        },
        identity: {
          findUnique: vi.fn().mockResolvedValue({ id: 'existing_identity' }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback, options) => {
        return callback(mockTx as any);
      });

      await expect(service.acceptInvitation(validDto)).rejects.toThrow(ConflictException);
    });
  });
});
