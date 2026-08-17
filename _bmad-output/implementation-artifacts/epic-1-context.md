# Epic 1 Context: Project Foundation & Verified CI Pipeline

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A developer can clone the repository, run a documented setup sequence, apply Prisma migrations, seed synthetic data for two isolated Organizations, and get all CI checks green — with the monorepo skeleton, explicit NestJS module boundaries, forced PostgreSQL RLS, a constrained transactional email adapter, and a complete test harness in place. This epic establishes the non-negotiable structural and security invariants that every subsequent epic builds on; nothing downstream can be safely developed until these foundations are verified.

## Stories

- Story 1.1: Monorepo Skeleton with Module Boundaries
- Story 1.2: Database Schema, Migrations & Forced PostgreSQL RLS
- Story 1.3: Transactional Email Adapter
- Story 1.4: CI Pipeline, Test Harness & Synthetic Seed Data

## Requirements & Constraints

**Stack (non-negotiable):** strict TypeScript throughout; Next.js (web); NestJS (API); PostgreSQL as the authoritative store; Prisma for schema, migrations, and ordinary persistence; Resend behind the email adapter; Vitest (or equivalent) for unit/integration; Playwright (or equivalent) for E2E. No starter templates.

**Module boundaries are explicit and enforced:** Identity & Auth, Platform Administration, Organization Administration, Access Control, Transactional Email, Evidence. Modules must not import each other's internal services or bypass each other's authorization checks.

**Tenant isolation at the database layer:**
- Every tenant-owned table has RLS enabled and forced (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`).
- The runtime database role has no `BYPASSRLS` attribute and does not own protected tables.
- All tenant parent-child relationships use composite Organization-aware foreign keys (or an equally strong constraint) so cross-Organization references fail at the database boundary.
- Queries that execute without a transaction-local tenant context (`SET LOCAL app.current_org_id = ?`) must return zero rows — fail closed.

**Transactional email adapter:**
- Accepts only allowlisted, versioned template IDs with schema-validated variables.
- Rejects arbitrary senders, arbitrary markup, and untrusted link origins at call time, before any delivery attempt.
- Production mode: sends via Resend using a server-side API key and verified sender domain; persists a delivery record with a stable idempotency key to an outbox table.
- Test/CI mode: a deterministic recording adapter captures the rendered payload without sending any external request; tests assert on recipient, template ID, and interpolated variables.
- Retried calls for an already-delivered idempotency key must not produce a duplicate delivery.

**CI pipeline — all steps required in sequence:** lint → strict type check (`tsc --noEmit`, zero suppressions) → unit tests → integration tests (real PostgreSQL) → E2E tests → production build. Any single failure must cause pipeline failure.

**Synthetic seed data:** exactly two Organizations with distinct owners, companies, scopes, and memberships using non-sensitive synthetic data. Seed is idempotent on re-run.

**Documentation:** the root README must allow a reviewer to complete bootstrap → migrate → seed → start → test → build without undocumented prerequisites.

## Technical Decisions

**Monorepo layout:** a single repository housing the NestJS API, Next.js web app, and shared packages. `tsc --noEmit` must cover every workspace package with zero suppressed errors.

**Prisma + reviewed SQL migrations:** Prisma manages the schema and generates typed client access. RLS policies and `FORCE ROW LEVEL SECURITY` are applied in reviewed SQL migrations, not in Prisma schema DSL, since Prisma does not natively emit those statements.

**Transaction-local tenant context:** the application sets `SET LOCAL app.current_org_id = '<uuid>'` inside every database transaction that touches tenant-owned tables. RLS policies reference this setting. A helper must be provided (e.g., a Prisma middleware or NestJS interceptor) so every request uses it consistently.

**Outbox table:** the email adapter writes an outbox record in the same transaction as the business record. A dispatcher (synchronous post-commit or a polling worker) handles Resend delivery. This prevents losing committed invitations and enables idempotent retry without duplicate delivery. A dedicated queue process (Redis, BullMQ) is not required in this epic.

**Classification test:** a designated test must fail explicitly when a new tenant-owned table is added without an RLS policy. This is a guard rail, not just documentation.

**No speculative schema:** only entities required by Epic 1 stories and the flows described in the architecture (identities, password credentials, sessions, password-reset tokens, Organizations, email outbox, evidence stubs) should be modelled. No billing, AI, sector cockpit, or future-module tables.

## Cross-Story Dependencies

- Story 1.2 (RLS schema) must be complete before Story 1.4 integration tests can exercise cross-Organization negative assertions.
- Story 1.3 (email adapter) must expose its test recording interface before Story 1.4's CI harness can verify deterministic email assertions without external calls.
- Story 1.1 (monorepo + module boundaries) must be in place before Stories 1.2 and 1.3 can be implemented in their correct modules.
- Epic 2 (authentication) depends on the identity/credential tables from Story 1.2 and the email adapter from Story 1.3.
