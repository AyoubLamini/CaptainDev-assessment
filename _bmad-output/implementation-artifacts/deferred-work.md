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
