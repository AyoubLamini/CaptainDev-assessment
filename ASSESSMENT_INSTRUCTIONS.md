# CaptainDev SaaS Technical Assessment

This repository contains the standalone brief and product, architecture, security, and UX contracts for a fictional SaaS product named **NOVA**. All names, organizations, and visual assets in this repository are synthetic assessment material.

## Suggested timing

There is no hard submission deadline. Because the role is intended to start by late August or early September, submitting by **Wednesday, 19 August 2026** is strongly encouraged so that reviews and interviews can be completed promptly.

## Read in this order

1. [ASSESSMENT.md](ASSESSMENT.md) — mission, scope, deliverables, quality gates, and submission protocol.
2. [Product requirements](docs/product/PRODUCT-REQUIREMENTS.md) — complete product context with explicit assessment markers.
3. [Assessment traceability](docs/product/ASSESSMENT-TRACEABILITY.md) — exact requirements, architecture decisions, and minimum verification applicable to the exercise.
4. [Assessment architecture](docs/architecture/ARCHITECTURE.md) — concise required implementation structure, mandatory invariants, and optional choices.
5. [Security invariants](docs/architecture/SECURITY-INVARIANTS.md) — blocking isolation and authorization rules.
6. [UX reference pack](docs/ux/README.md) — applicable mockups and interpretation rules.

The broader [target product architecture](docs/architecture/TARGET-ARCHITECTURE.md) is optional reference material. It is not an implementation checklist for the assessment.

## Getting started

You may choose the exact project bootstrap details while respecting the prescribed stack and architectural invariants. Document any deliberate deviation and its rationale.

Your implementation must expose documented commands for installation, database migration, local startup, unit tests, integration tests, end-to-end tests, linting/type checking, and production build.

The assessment requires real invitation and password-reset email through [Resend](https://resend.com/). Create a free Resend account, configure a verified sender or domain according to Resend's current requirements, and use a real mailbox you control for the end-to-end demonstration. Automated local and CI tests must use the deterministic adapter described by the architecture and must not send external email.

## AI-assisted workflow

This assessment is intentionally designed to be completed with an AI coding assistant. CaptainDev primarily uses Codex, but you may use Codex, Claude Code, Cursor, or any other coding agent you work effectively with.

The supplied PRD and architecture were prepared using the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) and remain the source of truth for the exercise. CaptainDev often uses BMAD's full planning and delivery workflow on security-sensitive projects. For a straightforward SaaS implementation, however, installing or running BMAD is **optional**: you may use a leaner development loop if it helps you deliver faster. If you do use BMAD, Dev Loop Automation is a reasonable way to avoid repeating planning ceremonies that have already been completed.

Whichever workflow you choose, work in small vertical slices: implement, run the relevant checks, inspect failures, correct them, and repeat. Document your main AI-assisted workflow and the important decisions you made.

AI use does not lower the delivery bar, but you are not expected to manually review every generated line. Instead, build a strong executable validation harness that gives the AI fast and trustworthy feedback: strict type and lint checks, focused unit tests, real-database integration tests, end-to-end journeys, negative security cases, deterministic fixtures, and repeatable CI. The harness must be reliable and sufficiently comprehensive to detect incorrect behavior and regressions while you iterate. You remain responsible for protecting secrets, investigating failures, validating the final behavior, and delivering a complete runnable submission. Document the main AI-assisted workflow, validation strategy, and known limitations in `SUBMISSION.md`; a raw prompt transcript is not required.

## Submission repository and demonstration

Create a **private GitHub repository** that you control for your implementation. Do not fork this assessment repository. Add the GitHub user [`mbouzian42`](https://github.com/mbouzian42) as a collaborator and ensure access is accepted and remains available throughout the review process so CaptainDev can review the source code and commit history.

At the end of the assessment, record a Loom video of no more than 10 minutes showing the platform running. Present the implemented modules and their main features, and demonstrate the principal functional journeys working end to end. In particular, show a real invitation arriving in a mailbox you control, open its link, activate the account, and show that the same invitation cannot be reused. Also show receipt and successful use of a real password-reset email. Security and failure-path properties that are not practical to demonstrate visually should be supported by automated test evidence instead. Use only synthetic identities and data. Add the Loom link to `SUBMISSION.md` and keep it accessible throughout the review process without requiring additional access.

## Reading order & Source precedence

1. `ASSESSMENT.md` (The source of truth for scope and requirements)
2. `docs/product/PRODUCT-REQUIREMENTS.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/architecture/SECURITY-INVARIANTS.md`

## Getting Started

**Prerequisites:** Node.js ≥ 22, pnpm ≥ 9.

```bash
# Install all workspace dependencies
pnpm install

# Start the NestJS API (http://localhost:3001)
pnpm --filter @nova/api start:dev

# Start the Next.js web app (http://localhost:3000)
pnpm --filter @nova/web dev

# Type-check all workspace packages
pnpm -r tsc --noEmit

# Build everything for production (API & Web)
pnpm run build

# Run unit tests
pnpm --filter @nova/api test
```

Health check: `GET http://localhost:3001/health` → `{"status":"ok"}`
