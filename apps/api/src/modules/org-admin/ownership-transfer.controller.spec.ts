import { Test, TestingModule } from '@nestjs/testing';
import { OwnershipTransferController } from './ownership-transfer.controller';
import { CollaboratorService } from './collaborator.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';

describe('OwnershipTransferController', () => {
  let controller: OwnershipTransferController;
  let service: CollaboratorService;

  const mockCollaboratorService = {
    proposeOwnershipTransfer: vi.fn(),
    acceptOwnershipTransfer: vi.fn(),
    cancelOwnershipTransfer: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnershipTransferController],
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

    controller = module.get<OwnershipTransferController>(OwnershipTransferController);
    service = module.get<CollaboratorService>(CollaboratorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('proposeTransfer', () => {
    it('should call service and return created proposal', async () => {
      const mockReq = {
        identity: { id: 'owner_1' },
        session: { createdAt: new Date() },
      };
      const dto: any = { successorMemberId: 'mem_2' };
      
      mockCollaboratorService.proposeOwnershipTransfer.mockResolvedValue({ id: 'prop_1' });
      
      const result = await controller.proposeTransfer('org_1', dto, mockReq as any);
      
      expect(mockCollaboratorService.proposeOwnershipTransfer).toHaveBeenCalledWith(
        'org_1',
        'owner_1',
        'mem_2',
        mockReq.session.createdAt
      );
      expect(result).toEqual({ data: { id: 'prop_1' } });
    });
  });

  describe('acceptTransfer', () => {
    it('should call service and return accepted proposal', async () => {
      const mockReq = {
        identity: { id: 'admin_1' },
        session: { createdAt: new Date() },
      };
      
      mockCollaboratorService.acceptOwnershipTransfer.mockResolvedValue({ id: 'prop_1', status: 'ACCEPTED' });
      
      const result = await controller.acceptTransfer('org_1', mockReq as any);
      
      expect(mockCollaboratorService.acceptOwnershipTransfer).toHaveBeenCalledWith(
        'org_1',
        'admin_1',
        mockReq.session.createdAt
      );
      expect(result).toEqual({ data: { id: 'prop_1', status: 'ACCEPTED' } });
    });
  });

  describe('cancelTransfer', () => {
    it('should call service and return cancelled proposal', async () => {
      const mockReq = {
        identity: { id: 'owner_1' },
        session: { createdAt: new Date() },
      };
      
      mockCollaboratorService.cancelOwnershipTransfer.mockResolvedValue({ id: 'prop_1', status: 'CANCELLED' });
      
      const result = await controller.cancelTransfer('org_1', mockReq as any);
      
      expect(mockCollaboratorService.cancelOwnershipTransfer).toHaveBeenCalledWith(
        'org_1',
        'owner_1',
        mockReq.session.createdAt
      );
      expect(result).toEqual({ data: { id: 'prop_1', status: 'CANCELLED' } });
    });
  });
});
