---
title: 'Database Schema, Migrations & Forced PostgreSQL RLS'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 2
baseline_commit: 'afd757fba1d1985f8aff347503c5157c6e64ad85'
context:
  - docs/architecture/ARCHITECTURE.md
  - docs/architecture/TARGET-ARCHITECTURE.md
  - docs/architecture/SECURITY-INVARIANTS.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The platform currently lacks a database schema and persistence layer. To support Epic 1’s negative isolation tests and cross-organization assertions, we need the initial schema for foundations with strict row-level security (RLS) policies enforced. 

**Approach:** Initialize Prisma inside `apps/api`. Define the minimal entities required by Epic 1 (Organization, Identity, PasswordCredential, Session, PasswordResetToken, Company, BusinessScope, EmailOutbox, Evidence). Create initial SQL migrations that establish these tables, enable RLS, force RLS recursively on all tenant-owned tables, and remove `BYPASSRLS` privileges from the typical runtime user. Create a NestJS `DatabaseModule` exporting a `PrismaService` equipped with a mechanism to set `SET LOCAL app.current_org_id` context. Finally, write a classification test that explicitly fails if a tenant-owned table is added without RLS.

## Boundaries & Constraints

**Always:**
- Use Prisma inside `apps/api/prisma`.
- EVERY tenant-owned table must have `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- `organization_id` must be part of composite tenant keys for hierarchy (e.g., `Company`'s primary key should include `organization_id` so children like `BusinessScope` use a composite foreign key referencing it).
- The runtime database role must NOT own the tables and MUST NOT have `BYPASSRLS`. 
- Generate SQL migrations where Prisma fails to emit RLS (which is virtually all RLS features).

**Ask First:**
- Alternative approaches to connection pooling or using a custom Prisma transaction API if the middleware/extension mechanism becomes overly complex.

**Never:**
- No speculative entities (no AI, no KPI, no subscriptions, no random future tables).
- Do not store plaintext passwords anywhere in the schema definition (use `password_hash`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Query without Tenant Context | Query on RLS table without `SET LOCAL app.current_org_id` | Zero rows returned (Fail Closed) | N/A |
| Insert with Mismatched FK | Child insert uses parent `organization_id` from different org | Database rejects due to composite FK | N/A |
| Missing RLS Policy | Test introspects schema to find table without RLS | Test fails automatically | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/package.json` -- Declare Prisma and @prisma/client dependencies.
- `apps/api/prisma/schema.prisma` -- Minimal schema required for Epics 1, 3, 4, 5 (Organization, Identity, Session, PasswordResetToken, Company, BusinessScope, EmailOutbox, Evidence).
- `apps/api/prisma/migrations/.../migration.sql` -- RLS additions and constraints execution.
- `apps/api/src/modules/database/database.module.ts` -- NestJS Database module.
- `apps/api/src/modules/database/prisma.service.ts` -- PrismaClient extension/provider handling `$connect`, `$disconnect`, and `SET LOCAL app.current_org_id` wrappers.
- `apps/api/src/modules/database/rls.spec.ts` -- The designated classification test for missing RLS policies.
- `apps/api/src/modules/database/rls.integration.spec.ts` -- Integration test that executes queries to verify RLS filtering behavior and transaction context.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/package.json` -- Add `prisma` (dev) and `@prisma/client`. Add `migrate` scripts.
- [x] `apps/api/prisma/schema.prisma` -- Model the required foundations. Guarantee composite constraints (`@@id([organizationId, id])`) for tenant hierarchy where applicable.
- [x] `apps/api/prisma/migrations/` -- Run `prisma migrate dev --create-only` and append `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and policy definitions. Do not create an empty `schema.sql` file.
- [x] `apps/api/src/modules/database/database.module.ts` -- Provide and export PrismaService.
- [x] `apps/api/src/modules/database/prisma.service.ts` -- Provide `executeAsTenant` wrapper that issues `SET LOCAL app.current_org_id = ?` prior to evaluating queries inside `$transaction`. Do NOT include a throwing/broken `withTenant` method.
- [x] `apps/api/src/modules/database/rls.spec.ts` -- Query PostgreSQL `pg_tables` and `pg_policy` to verify every application table has an RLS policy; fail the test if any exist without one.
- [x] `apps/api/src/modules/database/rls.integration.spec.ts` -- Write an integration test asserting that `executeAsTenant` correctly isolates rows. Insert rows for two orgs and query them to verify isolation.

**Acceptance Criteria:**
- Given a fresh PostgreSQL instance, when migrating, all tables are created with proper composite FKs.
- Given a tenant-owned table, when querying it without `SET LOCAL app.current_org_id`, then zero rows are returned.
- Given a test analyzing `pg_policy`, when a new table is added without RLS, then the test fails.
- Given a child row insert, when it references an `organization_id` differing from the parent's `organization_id`, then the database rejects it.

## Spec Change Log

- **Iteration 2**: Code rejected in review due to bad_spec findings. 
  - Triggering finding: RLS isolation behavior and transaction context were unverified by automated tests.
  - Amended: Added `rls.integration.spec.ts` task to verify RLS filtering logic and `executeAsTenant` behavior dynamically.
  - Triggering finding: Dead/throwing `withTenant` code was present due to ambiguous spec notes.
  - Amended: Removed the ambiguous design notes about `withTenant` and instructed the removal of the dead `withTenant` method.
  - Triggering finding: `schema.sql` was created empty.
  - Amended: Added instruction not to create empty SQL files.
  - Known-bad state avoided: Untested RLS boundaries and dead/throwing code in `PrismaService`.
  - KEEP instructions: 
    - KEEP the Prisma schema definitions (Organization, Identity, PasswordCredential, Session, PasswordResetToken, Company, BusinessScope, Evidence, EmailOutbox) and composite primary keys/foreign keys exactly as implemented.
    - KEEP the RLS policies in the migration SQL (`ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, `tenant_isolation` policy) for Organization, Company, BusinessScope, Evidence.
    - KEEP the `executeAsTenant` transaction wrapper implementation in `PrismaService`.
    - KEEP the `rls.spec.ts` metadata test that checks `pg_tables` and `pg_policy` to ensure all tenant tables have RLS enabled.

## Design Notes

Use Prisma Client explicit transaction blocks to pass down the RLS context.
For example, to enforce composite FKs in Prisma:
```prisma
model Company {
  id             String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  scopes         BusinessScope[]
  
  @@id([organizationId, id])
}

model BusinessScope {
  id             String
  organizationId String
  companyId      String
  company        Company @relation(fields: [organizationId, companyId], references: [organizationId, id])
  
  @@id([organizationId, id])
}
```

## Verification

**Commands:**
- `pnpm --filter @nova/api prisma migrate dev` -- expected: Migrates database successfully.
- `pnpm --filter @nova/api vitest run apps/api/src/modules/database/rls.spec.ts` -- expected: Test passes successfully asserting all tables use RLS.
- `pnpm --filter @nova/api vitest run apps/api/src/modules/database/rls.integration.spec.ts` -- expected: Test passes successfully verifying RLS execution and data isolation.

## Suggested Review Order

**Schema and RLS Policies**

- Defines minimal entities required by Epic 1 and sets up composite keys for tenant isolation
  [`schema.prisma:1`](../../apps/api/prisma/schema.prisma#L1)

- Enables RLS on all tenant-owned tables and enforces strict filtering policies
  [`migration.sql:110`](../../apps/api/prisma/migrations/20260818000000_init_rls/migration.sql#L110)

**Application Integration**

- Securely injects `current_org_id` context into Prisma transactions using `set_config`
  [`prisma.service.ts:18`](../../apps/api/src/modules/database/prisma.service.ts#L18)

- Configures and exports Prisma globally for dependency injection
  [`database.module.ts:5`](../../apps/api/src/modules/database/database.module.ts#L5)

**Verification (Tests)**

- Integration test validating query fail-close mechanics under RLS context
  [`rls.integration.spec.ts:16`](../../apps/api/src/modules/database/rls.integration.spec.ts#L16)

- Dynamic schema verification preventing uncaught omissions of RLS constraints on new tenant tables
  [`rls.spec.ts:18`](../../apps/api/src/modules/database/rls.spec.ts#L18)

- Configures Prisma Client and Prisma CLI dependencies
  [`package.json:11`](../../apps/api/package.json#L11)
