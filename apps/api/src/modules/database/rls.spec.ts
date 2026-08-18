import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('Row Level Security (RLS) Configuration', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('every tenant-owned table must have RLS enabled and a policy defined', async () => {
    // Dynamically discover all tables with an organization_id column
    const tablesWithOrgId: any[] = await prisma.$queryRaw`
      SELECT table_name as tablename 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'organization_id';
    `;
    const expectedRlsTables = tablesWithOrgId.map(t => t.tablename);
    
    // Also include 'organization' table itself
    expectedRlsTables.push('organization');

    // We get all application tables
    const tables: any[] = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename NOT IN ('_prisma_migrations');
    `;

    // We check which ones have RLS enabled
    const rlsEnabled: any[] = await prisma.$queryRaw`
      SELECT relname 
      FROM pg_class 
      WHERE relrowsecurity = true;
    `;

    const rlsEnabledSet = new Set(rlsEnabled.map(r => r.relname));
    
    // Check policies (joining with pg_class to get table name)
    const policies: any[] = await prisma.$queryRaw`
      SELECT c.relname as tablename
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid;
    `;
    
    const policySet = new Set(policies.map(p => p.tablename));

    for (const table of expectedRlsTables) {
      // Must be present in pg_tables
      expect(tables.map(t => t.tablename)).toContain(table);
      
      // Must have ENABLE ROW LEVEL SECURITY
      expect(rlsEnabledSet.has(table)).toBe(true);

      // Must have a policy defined
      expect(policySet.has(table)).toBe(true);
    }
  });
});
