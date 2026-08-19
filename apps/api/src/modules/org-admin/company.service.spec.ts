import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../database/prisma.service';
import { CompanyStatus, BusinessScopeStatus } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              create: vi.fn(),
              findUnique: vi.fn(),
              update: vi.fn(),
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deactivateCompany', () => {
    it('should deactivate company if it has no active scopes', async () => {
      const mockCompany = {
        id: '1',
        organizationId: 'org1',
        scopes: [{ status: BusinessScopeStatus.INACTIVE }],
      };

      vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);
      vi.mocked(prisma.company.update).mockResolvedValue({ ...mockCompany, status: CompanyStatus.INACTIVE } as any);

      const result = await service.deactivateCompany('org1', '1');

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { organizationId_id: { organizationId: 'org1', id: '1' } },
        data: { status: CompanyStatus.INACTIVE },
      });
      expect(result.status).toBe(CompanyStatus.INACTIVE);
    });

    it('should throw ConflictException if company has active scopes', async () => {
      const mockCompany = {
        id: '1',
        organizationId: 'org1',
        scopes: [{ status: BusinessScopeStatus.ACTIVE }],
      };

      vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any);

      await expect(service.deactivateCompany('org1', '1')).rejects.toThrow(ConflictException);
      expect(prisma.company.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if company not found', async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue(null);

      await expect(service.deactivateCompany('org1', '1')).rejects.toThrow(NotFoundException);
    });
  });
});
