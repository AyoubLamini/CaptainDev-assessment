import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../database/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: {
            executeAsTenant: vi.fn().mockImplementation((orgId, cb) => cb(prisma)),
            $transaction: vi.fn().mockImplementation((promises) => Promise.all(promises)),
            company: {
              findMany: vi.fn(),
              count: vi.fn(),
            },
            businessScope: {
              findMany: vi.fn(),
              count: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Valid Search: Returns matching Companies and Scopes within Org', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ id: 'c1', name: 'Matched Company' }] as any);
    vi.mocked(prisma.company.count).mockResolvedValue(1);
    vi.mocked(prisma.businessScope.findMany).mockResolvedValue([{ id: 's1', name: 'Matched Scope' }] as any);
    vi.mocked(prisma.businessScope.count).mockResolvedValue(1);

    const result = await service.search('org1', null, 'Match');

    expect(result.companies.data).toHaveLength(1);
    expect(result.scopes.data).toHaveLength(1);
    
    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org1',
        name: { contains: 'Match', mode: 'insensitive' },
      },
      skip: 0,
      take: 20,
    });
    expect(prisma.businessScope.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org1',
        OR: [
          { name: { contains: 'Match', mode: 'insensitive' } },
          { externalId: { contains: 'Match', mode: 'insensitive' } }
        ]
      },
      skip: 0,
      take: 20,
    });
  });

  it('Empty Query: Returns empty results or all authorized records', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ id: 'c1' }, { id: 'c2' }] as any);
    vi.mocked(prisma.company.count).mockResolvedValue(2);
    vi.mocked(prisma.businessScope.findMany).mockResolvedValue([{ id: 's1' }] as any);
    vi.mocked(prisma.businessScope.count).mockResolvedValue(1);

    const result = await service.search('org1', null, '');
    expect(result.companies.totalCount).toBe(2);

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org1' },
      skip: 0,
      take: 20,
    });
  });

  it('Cross-Org Attack: Searching for a known name in another Org returns empty results / no count leakage', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.company.count).mockResolvedValue(0);
    vi.mocked(prisma.businessScope.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.businessScope.count).mockResolvedValue(0);

    const result = await service.search('org1', null, 'OtherOrgSecret');
    expect(result.companies.totalCount).toBe(0);

    expect(prisma.company.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: 'org1',
      })
    }));
  });
});
