import { Test, TestingModule } from '@nestjs/testing';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PrismaService } from '../database/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { AuthService } from '../identity/auth.service';
import { vi } from 'vitest';
import { UnauthorizedException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('PlatformOrganizationsService', () => {
  let service: PlatformOrganizationsService;
  let prisma: any;
  let identityService: any;
  let authService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn((cb) => cb(prisma)),
      organization: {
        create: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Test', accessStatus: 'PROVISIONING', commercialStatus: 'ACTIVE' }),
        findMany: vi.fn().mockResolvedValue([{ id: 'org-1', name: 'Test' }]),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue({ id: 'org-1', accessStatus: 'ACTIVE' }),
        update: vi.fn().mockResolvedValue({ id: 'org-1', accessStatus: 'DISABLED' }),
      },
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({ id: 'membership-1' }),
      },
      evidence: {
        create: vi.fn(),
      },
    };

    identityService = {
      verifyPassword: vi.fn().mockResolvedValue(true),
    };

    authService = {
      revokeSessionsForOrganization: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformOrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IdentityService, useValue: identityService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<PlatformOrganizationsService>(PlatformOrganizationsService);
  });

  it('should provision organization and record evidence', async () => {
    await service.provisionOrganization({
      name: 'Test',
      commercialStatus: 'ACTIVE' as any,
      reason: 'Because',
    }, 'actor-1');

    expect(prisma.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'Test',
        accessStatus: 'PROVISIONING',
        commercialStatus: 'ACTIVE',
      },
    });

    expect(prisma.evidence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        actorId: 'actor-1',
        action: 'PROVISION_ORGANIZATION',
        reason: 'Because',
        after: {
          name: 'Test',
          accessStatus: 'PROVISIONING',
          commercialStatus: 'ACTIVE',
        }
      }),
    });
  });

  it('should paginate directory and filter SYSTEM', async () => {
    const result = await service.getDirectory(2, 5);
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
    expect(prisma.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { not: 'SYSTEM' } },
      skip: 5,
      take: 5,
    }));
  });

  describe('disableOrganization', () => {
    it('should throw UnauthorizedException if password validation fails', async () => {
      identityService.verifyPassword.mockResolvedValueOnce(false);
      await expect(service.disableOrganization('org-1', { reason: 'test', passwordConfirmation: 'wrong' }, 'actor-1'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if organization not found', async () => {
      prisma.organization.findUnique.mockResolvedValueOnce(null);
      await expect(service.disableOrganization('org-1', { reason: 'test', passwordConfirmation: 'right' }, 'actor-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already disabled', async () => {
      prisma.organization.findUnique.mockResolvedValueOnce({ id: 'org-1', accessStatus: 'DISABLED' });
      await expect(service.disableOrganization('org-1', { reason: 'test', passwordConfirmation: 'right' }, 'actor-1'))
        .rejects.toThrow(ConflictException);
    });

    it('should disable organization, revoke sessions and record evidence', async () => {
      const result = await service.disableOrganization('org-1', { reason: 'violates terms', passwordConfirmation: 'right' }, 'actor-1');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { accessStatus: 'DISABLED' },
      });

      expect(authService.revokeSessionsForOrganization).toHaveBeenCalledWith('org-1');

      expect(prisma.evidence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          actorId: 'actor-1',
          action: 'DISABLE_ORGANIZATION',
          reason: 'violates terms',
          before: { accessStatus: 'ACTIVE' },
          after: { accessStatus: 'DISABLED' },
        }),
      });

      expect(result.accessStatus).toBe('DISABLED');
    });
  });

  describe('performIntervention', () => {
    it('should throw UnauthorizedException if password validation fails', async () => {
      identityService.verifyPassword.mockResolvedValueOnce(false);
      await expect(service.performIntervention('org-1', { targetIdentityId: 'user-1', action: 'RESET_2FA', reason: 'locked out', passwordConfirmation: 'wrong' }, 'actor-1'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if target identity is not a member of the organization', async () => {
      prisma.organizationMember.findFirst.mockResolvedValueOnce(null);
      await expect(service.performIntervention('org-1', { targetIdentityId: 'user-1', action: 'RESET_2FA', reason: 'locked out', passwordConfirmation: 'right' }, 'actor-1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should perform intervention and record evidence if member is valid', async () => {
      await service.performIntervention('org-1', { targetIdentityId: 'user-1', action: 'RESET_2FA', reason: 'locked out', passwordConfirmation: 'right' }, 'actor-1');

      expect(prisma.evidence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          actorId: 'actor-1',
          action: 'PLATFORM_INTERVENTION',
          reason: 'locked out',
          after: {
            targetIdentityId: 'user-1',
            action: 'RESET_2FA',
          },
        }),
      });
    });
  });
});

