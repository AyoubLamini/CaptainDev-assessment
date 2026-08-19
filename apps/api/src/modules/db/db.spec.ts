import { PrismaClient } from '@prisma/client';

describe('Database Security Invariants', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('SEC-03: all tenant-owned tables must have RLS enabled and policies defined', async () => {
    // Query pg_tables to check rowsecurity
    const tables: Array<{ tablename: string; rowsecurity: boolean }> = await prisma.$queryRaw`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
    `;

    // Shared tables that do not belong to a specific tenant
    const sharedTables = [
      '_prisma_migrations',
      'organization',
      'identity',
      'password_credential',
      'session',
      'password_reset_token',
    ];

    for (const table of tables) {
      if (sharedTables.includes(table.tablename)) {
        continue; // Skip shared tables
      }

      // Check if rowsecurity is enabled
      expect(table.rowsecurity).toBe(true);

      // Check if there's at least one policy for this table
      const policies: Array<{ policyname: string }> = await prisma.$queryRaw`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${table.tablename}
      `;

      expect(policies.length).toBeGreaterThan(0);
    }
  });
});
