---
title: 'CI Pipeline, Test Harness & Synthetic Seed Data'
type: 'feature'
created: '2026-08-18'
status: done
baseline_revision: 'cfe6fde83d13ef5f57025ecba72e13fd4faa1cfa'
review_loop_iteration: 0
operator_actions:
  - 'Supply a DATABASE_URL environment variable pointing to a real PostgreSQL instance to allow integration tests and seeding to run locally.'
followup_review_recommended: false
context:
  - docs/architecture/ARCHITECTURE.md
  - docs/architecture/SECURITY-INVARIANTS.md
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The project lacks a unified CI pipeline, end-to-end testing harness, and synthetic seed data, making it impossible to systematically verify structural invariants (like RLS) or confidently merge future features.

**Approach:** Implement a GitHub Actions CI pipeline that enforces a strict sequence of validation steps (lint, typecheck, unit, integration, E2E, build). Establish a Playwright E2E test harness for the Next.js app and API. Develop an idempotent Prisma seed script to populate two isolated Organizations with synthetic data for development and testing.

## Boundaries & Constraints

**Always:**
- Run the CI pipeline steps in exact sequence: lint → strict type check (`tsc --noEmit` with zero suppressions) → unit tests → integration tests (using real PostgreSQL) → E2E tests → production build.
- Fail the pipeline immediately on any single step failure.
- Ensure the Prisma seed script idempotently creates exactly two distinct Organizations with distinct owners, companies, scopes, and memberships.
- Ensure the seed uses only non-sensitive synthetic data.
- Include a designated test (unit or integration) that explicitly fails if a tenant-owned table lacks an RLS policy.
- Configure Playwright (or equivalent) for E2E tests.

**Block If:**
- N/A

**Never:**
- Never suppress TypeScript errors to bypass type check failures.
- Never use a mock database for integration tests; they must run against a real PostgreSQL instance to verify RLS and constraints.
- Never write credentials or sensitive data into the seed script.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prisma Seeding (first run) | Empty database | Two Organizations created with associated entities | Seed script exits successfully |
| Prisma Seeding (subsequent run) | Database already seeded | No duplicate Organizations created (idempotent) | Seed script exits successfully |
| CI Pipeline Success | All checks pass | Pipeline completes successfully | N/A |
| CI Pipeline Failure | Any check fails (e.g. `tsc` error) | Pipeline halts at the failed step and fails | Failure reported in CI UI |

</intent-contract>

## Code Map

- `.github/workflows/ci.yml` -- CI pipeline definition.
- `apps/api/prisma/seed.ts` -- Idempotent seed script to generate synthetic data.
- `apps/api/package.json` -- Configuration for prisma seed command and testing scripts.
- `apps/web/package.json` -- Configuration for e2e testing scripts.
- `package.json` -- Root scripts for running tests and CI tasks across the monorepo.

## Tasks & Acceptance

**Execution:**
- `.github/workflows/ci.yml` -- Create GitHub Actions workflow to run lint, typecheck, unit, integration, E2E, and build steps sequentially with a Postgres service container.
- `apps/api/prisma/seed.ts` -- Implement the idempotent seed logic using Prisma client to create two distinct Organizations, users, and related entities.
- `apps/api/package.json` -- Add `prisma.seed` config to run the seed script via `ts-node`.
- `apps/web/playwright.config.ts` -- Initialize Playwright configuration for E2E testing against the Next.js app.
- `apps/web/package.json` -- Add `playwright` dependencies and test scripts.
- `apps/api/src/modules/db/db.spec.ts` -- Write a test to explicitly reflect on the database schema to ensure all tenant tables have RLS enabled (as required by Epic 1 context).
- **IMPORTANT INSTRUCTION TO IMPLEMENTER:** If this story's acceptance criteria include actions only a HUMAN can perform outside the repo (buy a domain, publish a DNS record, grant an API key, click through a vendor console): complete every part an agent CAN do, commit it, then finalize the spec frontmatter to `status: awaiting-operator` and enumerate what is owed under an `operator_actions:` key — a YAML list of strings, one imperative instruction each, non-empty. Never use the `blocked` status for this.

**Acceptance Criteria:**
- Given a clean clone, when a developer runs the setup sequence and `prisma db seed`, then two isolated Organizations and related data are created idempotently.
- Given a PR with a TypeScript error, when the CI pipeline runs, then the `tsc` step fails and the pipeline halts.
- Given a tenant-owned table without RLS, when integration tests run, then the classification test fails explicitly.

## Spec Change Log

## Review Triage Log

## Design Notes

The RLS verification test should query `pg_tables` and `pg_policies` to verify that every table (except known shared ones like `_prisma_migrations` or identity tables if applicable) has RLS enabled (`rowsecurity = true`).

## Verification

**Commands:**
- `pnpm -r tsc --noEmit` -- expected: Exits cleanly without type errors.
- `pnpm -r test` -- expected: Unit and integration tests pass, including the RLS check.
- `pnpm --filter @nova/api prisma db seed` -- expected: Runs without errors and is idempotent on repeat execution.

## Auto Run Result

Status: awaiting-operator

## Operator Confirmation

Confirmed 2026-08-18: the external actions this story owed were carried out.

- Supply a DATABASE_URL environment variable pointing to a real PostgreSQL instance to allow integration tests and seeding to run locally.

_Appended by the bmad-loop orchestrator (`bmad-loop confirm`, #335): a human confirmed these external actions out of band, and the story was advanced from `awaiting-operator` to `done`._
