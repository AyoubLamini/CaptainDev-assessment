---
title: 'Monorepo Skeleton with Module Boundaries'
type: 'chore'
created: '2026-08-17'
status: 'done'
review_loop_iteration: 0
baseline_commit: '7c9eed9812be39b0e9f3b16f27c1890c08e3163b'
context:
  - docs/architecture/ARCHITECTURE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository contains no application code — no NestJS API, no Next.js web app, no shared packages, and no TypeScript configuration. Nothing in Epics 1–5 can be built until a consistent, runnable monorepo skeleton with explicit module boundaries is in place.

**Approach:** Initialize a pnpm workspace monorepo with a NestJS API (`apps/api`), a Next.js web app (`apps/web`), and a shared types package (`packages/types`). Configure strict TypeScript across all workspaces. Stub the six required NestJS feature modules with proper `@Module` declarations and no cross-module internal imports. Add a `GET /health` endpoint. Document all bootstrap commands in the root README.

## Boundaries & Constraints

**Always:**
- Strict TypeScript (`"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitReturns": true`) in every workspace; `pnpm -r tsc --noEmit` must pass with zero errors and zero `@ts-ignore`/`@ts-expect-error` suppressions.
- The six NestJS modules — Identity/Auth, Platform Administration, Organization Administration, Access Control, Transactional Email, Evidence — must each have their own `@Module()` class. Cross-module access goes through NestJS `exports`/`imports` only; no module imports another's internal service file directly.
- pnpm workspaces as the monorepo manager; pin Node.js to `>=22.0.0` in root `engines`.
- NestJS API `GET /health` must return `{ "status": "ok" }` with HTTP 200.
- No pre-built starter that bundles auth, database layers, or business logic. CLI scaffolding (`@nestjs/cli`, `create-next-app`) is fine if stripped to bare minimum with no demo/tutorial code retained.

**Ask First:**
- Any deviation from pnpm workspaces (e.g., turborepo, nx) — confirm before adding a build orchestrator layer.

**Never:**
- Database schema, Prisma setup, or any data-layer code (Story 1.2).
- Email adapter or Resend integration (Story 1.3).
- CI pipeline YAML (Story 1.4).
- Any authentication logic — module stubs only, no auth guards or session handling.
- Any `@ts-ignore`, `@ts-expect-error`, or `eslint-disable-next-line` in production source files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Health check | `GET /health` with no session | `{ "status": "ok" }` HTTP 200 | N/A |
| Type error introduced | `.ts` file in any workspace has a deliberate type error | `pnpm -r tsc --noEmit` exits non-zero, error line reported | N/A |
| Cross-module internal import | Module A imports Module B's internal service file directly | `tsc` or lint rule fails OR NestJS DI initialization throws at startup | N/A |

</frozen-after-approval>

## Code Map

*Greenfield — no existing application code. All paths below are to be created.*

- `package.json` (root) -- pnpm workspace root; `private: true`, `engines.node >=22`, shared dev-dep versions
- `pnpm-workspace.yaml` -- declares `apps/*` and `packages/*` as workspace members
- `tsconfig.base.json` -- base strict TS config extended by all workspace tsconfigs
- `apps/api/` -- NestJS application root
- `apps/api/src/main.ts` -- NestJS bootstrap entry; listens on `PORT` env (default 3001)
- `apps/api/src/app.module.ts` -- root AppModule; imports all six feature modules
- `apps/api/src/modules/identity/identity.module.ts` -- Identity & Auth module stub
- `apps/api/src/modules/platform-admin/platform-admin.module.ts` -- Platform Administration stub
- `apps/api/src/modules/org-admin/org-admin.module.ts` -- Organization Administration stub
- `apps/api/src/modules/access-control/access-control.module.ts` -- Access Control stub
- `apps/api/src/modules/email/email.module.ts` -- Transactional Email stub
- `apps/api/src/modules/evidence/evidence.module.ts` -- Evidence stub
- `apps/api/src/modules/health/health.controller.ts` -- `GET /health` returning `{ status: 'ok' }`
- `apps/web/` -- Next.js application root (App Router, TypeScript)
- `apps/web/src/app/page.tsx` -- root page placeholder
- `packages/types/` -- shared TypeScript types package; barrel export only
- `README.md` -- documents: install → start API → start web → typecheck → build

## Tasks & Acceptance

**Execution:**
- [x] `pnpm-workspace.yaml` -- create; declare `packages: ['apps/*', 'packages/*']`
- [x] `package.json` (root) -- create; `private: true`, `engines: { node: ">=22.0.0" }`, workspace scripts (`typecheck`, `lint`), shared devDependencies (typescript, eslint, prettier)
- [x] `tsconfig.base.json` -- create; `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`; no `paths` here (per-package tsconfig adds those)
- [x] `apps/api/` -- scaffold NestJS app; `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`; `tsconfig.json` extends `../../tsconfig.base.json`; remove any demo controller/service generated by CLI
- [x] `apps/api/src/modules/` -- create all six `*.module.ts` stubs with `@Module({ imports: [], controllers: [], providers: [], exports: [] })` and empty exported class; no cross-module imports between stubs
- [x] `apps/api/src/modules/health/health.controller.ts` -- implement `@Controller() class HealthController { @Get('/health') check() { return { status: 'ok' }; } }`; register in AppModule
- [x] `apps/api/src/app.module.ts` -- root `@Module` importing all six feature modules and HealthController
- [x] `apps/api/src/main.ts` -- `NestFactory.create(AppModule)` then `app.listen(process.env.PORT ?? 3001)`
- [x] `apps/web/` -- scaffold Next.js app (`create-next-app` with `--typescript --app --no-tailwind --no-eslint-config-next`); strip demo/tutorial pages; `tsconfig.json` extends `../../tsconfig.base.json`
- [x] `packages/types/src/index.ts` -- create empty barrel (`export {};`); add `tsconfig.json` extending base; add `package.json` with `name: "@nova/types"`, `main: "./src/index.ts"`
- [x] `README.md` -- add "Getting Started" section documenting: `pnpm install`, `pnpm --filter @nova/api start:dev`, `pnpm --filter @nova/web dev`, `pnpm -r tsc --noEmit`, `pnpm --filter @nova/api build`, `pnpm --filter @nova/web build`
- [x] `apps/api/src/modules/health/health.controller.spec.ts` -- unit test for HealthController covering I/O matrix health-check row; vitest added to API devDependencies

**Acceptance Criteria:**
- Given a clean clone, when I run `pnpm install` followed by `pnpm --filter @nova/api start:dev`, then the NestJS API starts without errors and logs its port.
- Given the running API, when I send `GET /health`, then the response body is `{"status":"ok"}` with HTTP 200.
- Given a clean install, when I run `pnpm --filter @nova/web build`, then the Next.js production build succeeds with no TypeScript errors.
- Given strict TypeScript is configured, when I run `pnpm -r tsc --noEmit` with no intentional errors, then it exits 0 with no errors across all workspace packages.
- Given a deliberate type error is added to any `.ts` file, when I run `pnpm -r tsc --noEmit`, then it exits non-zero and identifies the error.
- Given the API module layout, when I inspect `apps/api/src/modules/`, then six directories exist: `identity`, `platform-admin`, `org-admin`, `access-control`, `email`, `evidence` — each with its own `*.module.ts`.

## Verification

**Commands:**
- `pnpm install` -- expected: all workspace packages install, no unresolved peer deps
- `pnpm --filter @nova/api start:dev` then `curl http://localhost:3001/health` -- expected: `{"status":"ok"}` with 200
- `pnpm --filter @nova/web build` -- expected: exits 0, production build artifacts in `.next/`
- `pnpm -r tsc --noEmit` -- expected: exits 0, zero errors across all packages

## Suggested Review Order

**Monorepo structure & TypeScript baseline**

- Workspace members declaration; pnpm is the only monorepo manager.
  [`pnpm-workspace.yaml:1`](../../pnpm-workspace.yaml#L1)

- Base strict TS config inherited by all packages; strictness options are additive here.
  [`tsconfig.base.json:1`](../../tsconfig.base.json#L1)

- Root package.json: pinned Node engine, pnpm packageManager field, cross-workspace scripts.
  [`package.json:1`](../../package.json#L1)

**NestJS API entry point & health endpoint**

- Bootstrap: port parsed safely from env; `.catch()` surfaces startup failures.
  [`main.ts:6`](../../apps/api/src/main.ts#L6)

- Root AppModule wires all six feature modules and registers HealthController directly.
  [`app.module.ts:10`](../../apps/api/src/app.module.ts#L10)

- HealthController: sole route, returns literal `{ status: 'ok' }`; no auth guard.
  [`health.controller.ts:4`](../../apps/api/src/modules/health/health.controller.ts#L4)

**Feature module stubs**

- Representative stub: explicit empty arrays on every @Module field; no cross-module imports.
  [`identity.module.ts:1`](../../apps/api/src/modules/identity/identity.module.ts#L1)

**Next.js web app**

- App Router root layout: `JSX` imported from `react` (React 19 dropped global namespace).
  [`layout.tsx:1`](../../apps/web/src/app/layout.tsx#L1)

- Web tsconfig: extends base, adds bundler moduleResolution and Next.js plugin.
  [`web/tsconfig.json:1`](../../apps/web/tsconfig.json#L1)

- `outputFileTracingRoot` set to silence Next.js lockfile-detection warning in monorepo.
  [`next.config.ts:4`](../../apps/web/next.config.ts#L4)

**Tests & peripheral config**

- Health controller unit test: covers I/O matrix row 1; vitest globals enabled.
  [`health.controller.spec.ts:1`](../../apps/api/src/modules/health/health.controller.spec.ts#L1)

- API tsconfig: `experimentalDecorators` + `emitDecoratorMetadata` required for NestJS DI.
  [`api/tsconfig.json:1`](../../apps/api/tsconfig.json#L1)

- Getting Started commands in README including test invocation.
  [`README.md:57`](../../README.md#L57)

