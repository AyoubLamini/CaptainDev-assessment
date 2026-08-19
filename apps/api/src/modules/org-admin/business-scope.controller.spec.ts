import { Test, TestingModule } from '@nestjs/testing';
import { BusinessScopeController } from './business-scope.controller';
import { BusinessScopeService } from './business-scope.service';
import { BadRequestException } from '@nestjs/common';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { BusinessScopeType } from '@prisma/client';

describe('BusinessScopeController', () => {
  let controller: BusinessScopeController;
  let service: BusinessScopeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessScopeController],
      providers: [
        {
          provide: BusinessScopeService,
          useValue: {
            createScope: vi.fn().mockResolvedValue({ id: 'test-id' }),
          },
        },
      ],
    })
      .overrideGuard(OrgAdminGuard)
      .useValue({ canActivate: vi.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<BusinessScopeController>(BusinessScopeController);
    service = module.get<BusinessScopeService>(BusinessScopeService);
  });

  describe('createScope', () => {
    it('should throw BadRequestException if type is missing or invalid', async () => {
      const req = { identity: { id: 'user1' } } as any;

      await expect(
        controller.createScope('org1', 'c1', { name: 'Test' } as any, req)
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.createScope('org1', 'c1', { name: 'Test', type: 'INVALID' } as any, req)
      ).rejects.toThrow(BadRequestException);

      expect(service.createScope).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if name is missing or empty', async () => {
      const req = { identity: { id: 'user1' } } as any;

      await expect(
        controller.createScope('org1', 'c1', { type: 'RESTAURANT' } as any, req)
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.createScope('org1', 'c1', { type: 'RESTAURANT', name: '   ' } as any, req)
      ).rejects.toThrow(BadRequestException);

      expect(service.createScope).not.toHaveBeenCalled();
    });

    it('should successfully map parameters and call service', async () => {
      const req = { identity: { id: 'user1' } } as any;
      const result = await controller.createScope(
        'org1',
        'c1',
        { 
          type: BusinessScopeType.RESTAURANT, 
          name: 'Test Scope',
          externalId: 'ext-123',
          location: 'NY',
          id: 'ignored-id' // Should be ignored
        },
        req
      );

      expect(result).toEqual({ id: 'test-id' });
      expect(service.createScope).toHaveBeenCalledWith({
        organizationId: 'org1',
        companyId: 'c1',
        type: BusinessScopeType.RESTAURANT,
        name: 'Test Scope',
        externalId: 'ext-123',
        location: 'NY',
        createdById: 'user1',
      });
    });
  });
});
