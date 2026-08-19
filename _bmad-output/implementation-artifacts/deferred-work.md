# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-monorepo-skeleton-with-module-boundaries.md`
  summary: Add ESLint configuration and replace no-op lint scripts with real linting across all workspace packages.
  evidence: The spec prohibits @ts-ignore and eslint-disable-next-line in production code but no ESLint config exists to enforce this; lint scripts echo "lint: ok" unconditionally. Story 1.4 (CI pipeline) is the correct home for a verified, CI-enforced lint step.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-monorepo-skeleton-with-module-boundaries.md`
  summary: Add Prettier configuration file to the repository root.
  evidence: prettier is declared in root devDependencies but no .prettierrc or prettier.config.js exists; formatting is currently unconfigured and unenforceable. Story 1.4 (CI pipeline) should include a format-check step.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-monorepo-skeleton-with-module-boundaries.md`
  summary: Add NestJS e2e test verifying GET /health HTTP routing through the full NestJS bootstrap stack.
  evidence: The existing health-controller unit test calls controller.check() directly and does not exercise the @Get('/health') decorator or NestJS routing layer. A regression in NestJS route registration would go undetected. Story 1.4 (test harness) is the correct scope for e2e/integration test infrastructure.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-monorepo-skeleton-with-module-boundaries.md`
  summary: Enforce cross-module import boundaries with an ESLint rule (e.g. import/no-restricted-paths or eslint-plugin-boundaries).
  evidence: The spec requires that no module imports another's internal service file directly, but this is currently enforced only by convention. A developer mistake would not be caught by tsc or CI until Story 1.4's lint step is in place.

- source_spec: `C:\Users\ayoub\OneDrive\Desktop\CaptainDevSubmit\_bmad-output\implementation-artifacts\spec-1-2-database-schema-migrations-forced-postgresql-rls.md`
  summary: Add timestamps (createdAt) to the Evidence audit log and EmailOutbox models.
  evidence: Standard audit and outbox patterns require timestamps. The spec's minimal schema omitted them, but they are necessary for production observability.

- source_spec: `C:\Users\ayoub\OneDrive\Desktop\CaptainDevSubmit\_bmad-output\implementation-artifacts\spec-1-2-database-schema-migrations-forced-postgresql-rls.md`
  summary: Optimize EmailOutbox payload and add lifecycle fields (status, processedAt).
  evidence: The payload is typed as a String instead of Json, and it lacks state trackers for a reliable transactional outbox pattern.

- source_spec: `C:\Users\ayoub\OneDrive\Desktop\CaptainDevSubmit\_bmad-output\implementation-artifacts\spec-1-2-database-schema-migrations-forced-postgresql-rls.md`
  summary: Add explicit foreign key indexes (@@index) across Prisma schema models.
  evidence: Prisma generates FK constraints but doesn't auto-index them, which will cause full table scans on cascading deletes and reverse lookups.

- source_spec: `C:\Users\ayoub\OneDrive\Desktop\CaptainDevSubmit\_bmad-output\implementation-artifacts\spec-1-2-database-schema-migrations-forced-postgresql-rls.md`
  summary: Add updatedAt timestamps to core mutable models.
  evidence: Core models like Organization, Identity, Company, and BusinessScope are missing standard @updatedAt timestamp fields.

### DW-1: Missing E2E and controller tests verifying HTTP boundaries and routing.
origin: spec-deferred 8531a96d984f
location: apps/api/src/modules/identity/auth.controller.ts
source_spec: `spec-2-4-neutral-password-reset-flow.md`
severity: medium
reason: Tests for `requestPasswordReset` are currently confined strictly to the internal service boundary. E2E validations demonstrating actual 200/400 network responses are absent.
status: open

### DW-2: No rate limiting or abuse prevention on password reset flows.
origin: spec-deferred ce13482978e8
location: apps/api/src/modules/identity/auth.controller.ts
source_spec: `spec-2-4-neutral-password-reset-flow.md`
severity: medium
reason: The endpoints currently allow unlimited unauthenticated requests per IP, opening the system up to email spamming or resource exhaustion.
status: open

### DW-3: Unnecessary database contention regarding the `SYSTEM` organization upsert.
origin: spec-deferred e3fceb9420ff
location: apps/api/src/modules/identity/auth.service.ts
source_spec: `spec-2-4-neutral-password-reset-flow.md`
severity: low
reason: Every token creation runs an upsert against the `SYSTEM` row in Prisma, creating potential lock contention under high load for a static bypass constraint.
status: open

### DW-4: Mock-only verification of Platform Organizations database transactions.
origin: spec-deferred 4313e7c4b526
location: apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts
source_spec: `spec-3-1-organization-provisioning-platform-directory.md`
severity: medium
reason: The service tests mock the database integration entirely using vi.fn(). There are no assertions running against a real database instance to verify transaction boundaries and schema constraints.
status: open

### DW-5: The frontend wizard page (`scopes/new/page.tsx`) uses a hardcoded fallback UUID for `organizationId`.
origin: spec-deferred 0e0322959b7e
location: n/a
source_spec: `spec-4-2-guided-business-scope-creation-flow.md`
reason: The component is not connected to any Next.js layout session provider yet, and the codebase lacks standard session extraction contexts for this feature module. A full fix requires integrating dynamic session context.
status: open

### DW-6: The duplicate name normalization is rudimentary (only trimming) and is case-sensitive due to PostgreSQL defaults.
origin: spec-deferred 0cd50cf013dd
location: n/a
source_spec: `spec-4-2-guided-business-scope-creation-flow.md`
reason: Semantic duplicates with different casing will bypass the exact-string unique database constraint. The intent asked for "normalized name", but a case-insensitive constraint requires schema extensions (e.g. citext) out of scope.
status: open

### DW-7: The wizard lacks a Cancel button and disabling state during submission.
origin: spec-deferred 69d469403e4d
location: n/a
source_spec: `spec-4-2-guided-business-scope-creation-flow.md`
reason: This could lead to a poorer UX but does not break the feature intent.
status: open

- source_spec: `C:\Users\ayoub\OneDrive\Desktop\CaptainDevSubmit\_bmad-output\implementation-artifacts\spec-4-4-responsive-company-scope-administration-ui.md`
  summary: useSearchParams hook in scopes/new/page.tsx is not wrapped in a Suspense boundary.
  evidence: Review finding: causes Next.js to de-opt route to client-side rendering or fail the build depending on context.

- source_spec: `C:\Users\ayoub\OneDrive\Desktop\CaptainDevSubmit\_bmad-output\implementation-artifacts\spec-4-4-responsive-company-scope-administration-ui.md`
  summary: URL interpolation for company/scope paths does not use encodeURIComponent.
  evidence: Review finding: could result in malformed URLs if organizationId or companyId contains unsafe characters.
