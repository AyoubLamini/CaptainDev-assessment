import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrgAdminGuard } from './org-admin.guard';
import { PrismaService } from '../../database/prisma.service';

describe('OrgAdminGuard', () => {
  let guard: OrgAdminGuard;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      executeAsPlatformAdmin: vi.fn(async (cb) => cb(mockPrismaService)),
      executeAsTenant: vi.fn(async (orgId, cb) => cb(mockPrismaService)),
      session: { findUnique: vi.fn() },
      organizationMember: { findUnique: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgAdminGuard,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    guard = module.get<OrgAdminGuard>(OrgAdminGuard);
  });

  const createMockContext = (req: any): ExecutionContext => ({
    switchToHttp: () => ({ getRequest: () => req }),
  } as any);

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw Unauthorized if no session cookie', async () => {
    const ctx = createMockContext({ cookies: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw Unauthorized if session is invalid', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue(null);
    const ctx = createMockContext({ cookies: { '__Host-session': 'invalid', 'nova_session': 'invalid' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequest if organizationId is missing', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), identityId: 'id_1', identity: {} });
    const ctx = createMockContext({ cookies: { '__Host-session': 'valid', 'nova_session': 'valid' }, headers: {}, params: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('should throw Forbidden if membership not found or not admin/owner', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), identityId: 'id_1', identity: {} });
    mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
    const ctx = createMockContext({ cookies: { '__Host-session': 'valid', 'nova_session': 'valid' }, headers: {}, params: { organizationId: 'org_1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);

    mockPrismaService.organizationMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE', organization: { accessStatus: 'ACTIVE' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw Forbidden if member is suspended', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), identityId: 'id_1', identity: {} });
    mockPrismaService.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'SUSPENDED', organization: { accessStatus: 'ACTIVE' } });
    const ctx = createMockContext({ cookies: { '__Host-session': 'valid', 'nova_session': 'valid' }, headers: {}, params: { organizationId: 'org_1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw Forbidden if organization is suspended', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), identityId: 'id_1', identity: {} });
    mockPrismaService.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', organization: { accessStatus: 'SUSPENDED' } });
    const ctx = createMockContext({ cookies: { '__Host-session': 'valid', 'nova_session': 'valid' }, headers: {}, params: { organizationId: 'org_1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw Forbidden if organization is disabled', async () => {
    mockPrismaService.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), identityId: 'id_1', identity: {} });
    mockPrismaService.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', organization: { accessStatus: 'DISABLED' } });
    const ctx = createMockContext({ cookies: { '__Host-session': 'valid', 'nova_session': 'valid' }, headers: {}, params: { organizationId: 'org_1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if member is active admin/owner', async () => {
    const mockReq = { cookies: { '__Host-session': 'valid', 'nova_session': 'valid' }, headers: {}, params: { organizationId: 'org_1' } };
    mockPrismaService.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 10000), identityId: 'id_1', identity: {} });
    mockPrismaService.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', organization: { accessStatus: 'ACTIVE' } });
    const ctx = createMockContext(mockReq);
    
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect((mockReq as any).identity).toBeDefined();
    expect((mockReq as any).session).toBeDefined();
    expect((mockReq as any).organizationId).toBe('org_1');
  });
});
