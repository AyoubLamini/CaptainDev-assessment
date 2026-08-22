import { Test, TestingModule } from '@nestjs/testing';
import { BusinessScopeService } from './business-scope.service';
import { PrismaService } from '../database/prisma.service';
import { ConflictException } from '@nestjs/common';
import { Prisma, BusinessScopeType } from '@prisma/client';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('BusinessScopeService', () => {
  let service: BusinessScopeService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessScopeService,
        {
          provide: PrismaService,
          useValue: {
            executeAsPlatformAdmin: vi.fn().mockImplementation((cb) => cb(prisma)),
            executeAsTenant: vi.fn().mockImplementation((orgId, cb) => cb(prisma)),
            businessScope: {
              create: vi.fn(),
              findFirst: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BusinessScopeService>(BusinessScopeService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createScope', () => {
    const defaultParams = {
      organizationId: 'org-1',
      companyId: 'comp-1',
      type: BusinessScopeType.RESTAURANT,
      name: 'Main Restaurant',
      externalId: 'ext-123',
      location: 'NY',
      responsiblePerson: 'John',
      createdById: 'user-1',
    };

    it('should successfully create a scope', async () => {
      const createdScope = { id: 'scope-1', ...defaultParams };
      (prisma.businessScope.create as any).mockResolvedValue(createdScope);

      const result = await service.createScope(defaultParams);

      expect(result).toEqual(createdScope);
      expect(prisma.businessScope.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: defaultParams.organizationId,
          companyId: defaultParams.companyId,
          type: defaultParams.type,
          name: defaultParams.name,
          externalId: defaultParams.externalId,
          location: defaultParams.location,
          responsiblePerson: defaultParams.responsiblePerson,
          createdById: defaultParams.createdById,
          status: 'ACTIVE',
        }),
      });
    });
    
    it('should trim string inputs before passing to Prisma', async () => {
      const createdScope = { id: 'scope-1' };
      (prisma.businessScope.create as any).mockResolvedValue(createdScope);

      await service.createScope({
        ...defaultParams,
        name: '   Padded Name   ',
        externalId: '  ext  ',
      });

      expect(prisma.businessScope.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Padded Name',
          externalId: 'ext',
        }),
      });
    });

    it('should throw ConflictException on duplicate P2002', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.x.x',
        meta: { target: ['companyId', 'type', 'name', 'externalId'] },
      });

      (prisma.businessScope.create as any).mockRejectedValue(prismaError);
      
      const existingScope = { id: 'scope-duplicate' };
      (prisma.businessScope.findFirst as any).mockResolvedValue(existingScope);

      await expect(service.createScope(defaultParams)).rejects.toThrow(ConflictException);

      expect(prisma.businessScope.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: defaultParams.organizationId,
          companyId: defaultParams.companyId,
          type: defaultParams.type,
          name: defaultParams.name,
          externalId: defaultParams.externalId,
        },
      });
    });
    
    it('should throw ConflictException on duplicate P2002 using fallback empty string for missing externalId', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.x.x',
        meta: { target: ['companyId', 'type', 'name', 'externalId'] },
      });

      (prisma.businessScope.create as any).mockRejectedValue(prismaError);
      
      const existingScope = { id: 'scope-duplicate' };
      (prisma.businessScope.findFirst as any).mockResolvedValue(existingScope);

      const paramsWithoutExtId = { ...defaultParams };
      delete (paramsWithoutExtId as any).externalId;

      await expect(service.createScope(paramsWithoutExtId)).rejects.toThrow(ConflictException);

      expect(prisma.businessScope.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: defaultParams.organizationId,
          companyId: defaultParams.companyId,
          type: defaultParams.type,
          name: defaultParams.name,
          externalId: '',
        },
      });
    });
  });
});
