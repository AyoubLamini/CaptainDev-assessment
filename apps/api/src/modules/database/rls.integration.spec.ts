import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('RLS Integration', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup bypassing RLS
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE organization CASCADE`);
    await prisma.$disconnect();
  });

  it('should isolate rows between tenants using executeAsTenant', async () => {
    // Create two distinct organizations generating IDs locally
    const org1Id = 'org1-' + Math.random().toString(36).substring(7);
    const org2Id = 'org2-' + Math.random().toString(36).substring(7);

    // Insert data into both using executeAsTenant to satisfy RLS
    await prisma.executeAsTenant(org1Id, async (tx) => {
      await tx.organization.create({ data: { id: org1Id } });
      await tx.company.create({ data: { id: 'comp1', organizationId: org1Id } });
    });

    await prisma.executeAsTenant(org2Id, async (tx) => {
      await tx.organization.create({ data: { id: org2Id } });
      await tx.company.create({ data: { id: 'comp2', organizationId: org2Id } });
    });

    // Assert using tenant context 1
    await prisma.executeAsTenant(org1Id, async (tx) => {
      const companies = await tx.company.findMany();
      expect(companies).toHaveLength(1);
      expect(companies[0].id).toBe('comp1');
    });

    // Assert using tenant context 2
    await prisma.executeAsTenant(org2Id, async (tx) => {
      const companies = await tx.company.findMany();
      expect(companies).toHaveLength(1);
      expect(companies[0].id).toBe('comp2');
    });

    // Assert failing closed (without context)
    const allCompanies = await prisma.company.findMany();
    expect(allCompanies).toHaveLength(0); // Standard client has no context, RLS should block reading
  });
});
