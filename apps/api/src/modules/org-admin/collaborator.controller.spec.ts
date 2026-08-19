import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorService } from './collaborator.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';

describe('CollaboratorController', () => {
  let controller: CollaboratorController;
  let service: CollaboratorService;

  const mockCollaboratorService = {
    getCollaborator: vi.fn(),
    updateCollaboratorGrants: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaboratorController],
      providers: [
        {
          provide: CollaboratorService,
          useValue: mockCollaboratorService,
        },
      ],
    })
      .overrideGuard(OrgAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CollaboratorController>(CollaboratorController);
    service = module.get<CollaboratorService>(CollaboratorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCollaborator', () => {
    it('should return a collaborator', async () => {
      mockCollaboratorService.getCollaborator.mockResolvedValue({ id: 'mem_1' });
      const result = await controller.getCollaborator('org_1', 'mem_1');
      expect(result).toEqual({ data: { id: 'mem_1' } });
      expect(mockCollaboratorService.getCollaborator).toHaveBeenCalledWith('org_1', 'mem_1');
    });
  });

  describe('updateGrants', () => {
    it('should call service and return updated data', async () => {
      const mockReq = {
        identity: { id: 'admin_1' },
        session: { createdAt: new Date() },
      };
      const dto: any = { grants: { capabilities: [], scopes: [] } };
      
      mockCollaboratorService.updateCollaboratorGrants.mockResolvedValue({ id: 'mem_1', grants: dto.grants });
      
      const result = await controller.updateGrants('org_1', 'mem_1', dto, mockReq as any);
      
      expect(mockCollaboratorService.updateCollaboratorGrants).toHaveBeenCalledWith(
        'org_1',
        'mem_1',
        'admin_1',
        dto,
        mockReq.session.createdAt
      );
      expect(result).toEqual({ data: { id: 'mem_1', grants: dto.grants } });
    });
  });

  describe('updateStatus', () => {
    it('should call service and return updated data', async () => {
      const mockReq = {
        identity: { id: 'admin_1' },
        session: { createdAt: new Date() },
      };
      const dto: any = { status: 'SUSPENDED' };
      
      mockCollaboratorService.updateCollaboratorStatus = vi.fn().mockResolvedValue({ id: 'mem_1', status: 'SUSPENDED' });
      
      const result = await controller.updateStatus('org_1', 'mem_1', dto, mockReq as any);
      
      expect(mockCollaboratorService.updateCollaboratorStatus).toHaveBeenCalledWith(
        'org_1',
        'mem_1',
        'admin_1',
        'SUSPENDED',
        mockReq.session.createdAt
      );
      expect(result).toEqual({ data: { id: 'mem_1', status: 'SUSPENDED' } });
    });
  });
});
