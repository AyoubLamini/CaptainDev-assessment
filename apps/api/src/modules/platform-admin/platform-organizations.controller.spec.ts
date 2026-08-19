import { Test, TestingModule } from '@nestjs/testing';
import { PlatformOrganizationsController } from './platform-organizations.controller';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PlatformAdminGuard } from '../access-control/guards/platform-admin.guard';
import { PrismaService } from '../database/prisma.service';
import { vi } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('PlatformOrganizationsController & Guard', () => {
  let controller: PlatformOrganizationsController;
  let service: any;
  let guard: PlatformAdminGuard;
  let prisma: any;

  beforeEach(async () => {
    service = {
      provisionOrganization: vi.fn(),
      getDirectory: vi.fn(),
      disableOrganization: vi.fn(),
      performIntervention: vi.fn(),
    };

    prisma = {
      session: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformOrganizationsController],
      providers: [
        PlatformAdminGuard,
        { provide: PlatformOrganizationsService, useValue: service },
        { provide: PrismaService, useValue: prisma }
      ],
    }).compile();

    controller = module.get<PlatformOrganizationsController>(PlatformOrganizationsController);
    guard = module.get<PlatformAdminGuard>(PlatformAdminGuard);
  });

  describe('Guard Tests', () => {
    const createMockContext = (cookies: any = {}): ExecutionContext => {
      const req = { cookies } as any;
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as ExecutionContext;
    };

    it('should throw UnauthorizedException if no session cookie', async () => {
      const ctx = createMockContext();
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session is invalid', async () => {
      const ctx = createMockContext({ '__Host-session': 'invalid' });
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user is not platform admin', async () => {
      const ctx = createMockContext({ '__Host-session': 'valid' });
      prisma.session.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 10000),
        identity: { isPlatformAdmin: false },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should return true and attach identity if admin', async () => {
      const ctx = createMockContext({ '__Host-session': 'valid' });
      const identity = { isPlatformAdmin: true, id: 'admin-1' };
      prisma.session.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 10000),
        identity,
      });
      
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(ctx.switchToHttp().getRequest().identity).toEqual(identity);
    });
  });

  describe('Controller Tests', () => {
    it('should call provision', async () => {
      const dto = { name: 'Test', commercialStatus: 'ACTIVE' as any, reason: 'test' };
      const req = { identity: { id: 'admin-1' } } as any;
      await controller.provision(dto, req);
      expect(service.provisionOrganization).toHaveBeenCalledWith(dto, 'admin-1');
    });

    it('should call getDirectory', async () => {
      await controller.getDirectory(1, 10);
      expect(service.getDirectory).toHaveBeenCalledWith(1, 10);
    });

    it('should call disableOrganization', async () => {
      const dto = { reason: 'test', passwordConfirmation: 'pw' };
      const req = { identity: { id: 'admin-1' } } as any;
      await controller.disableOrganization('org-1', dto, req);
      expect(service.disableOrganization).toHaveBeenCalledWith('org-1', dto, 'admin-1');
    });

    it('should call performIntervention', async () => {
      const dto = { targetIdentityId: 'user', action: 'RESET', reason: 'test', passwordConfirmation: 'pw' };
      const req = { identity: { id: 'admin-1' } } as any;
      await controller.performIntervention('org-1', dto, req);
      expect(service.performIntervention).toHaveBeenCalledWith('org-1', dto, 'admin-1');
    });
  });
});

