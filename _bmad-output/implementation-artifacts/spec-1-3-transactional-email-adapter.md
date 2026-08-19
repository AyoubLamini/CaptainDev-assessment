---
title: 'Transactional Email Adapter'
type: 'feature'
created: '2026-08-18'
status: done
baseline_revision: 'ac9cbfb1e4b84b566fed94b3273bc9ff6652e496'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - docs/architecture/ARCHITECTURE.md
  - docs/architecture/SECURITY-INVARIANTS.md
warnings: []
deferred: []
operator_actions:
  - 'Start local database and run pnpm --filter @nova/api migrate to generate and apply the migration for EmailOutbox updates.'
  - 'Configure RESEND_API_KEY environment variable for the production adapter.'
---

<intent-contract>

## Intent

**Problem:** The platform requires a reliable and secure way to send transactional emails (like invitations and password resets) that guarantees no data loss and allows deterministic assertion in CI without triggering real email deliveries.

**Approach:** Implement a NestJS `EmailModule` that exposes an `EmailService`. The service must use an `EmailAdapter` interface with two implementations: a `ResendAdapter` for production and a `RecordingAdapter` for CI/testing. The service must persist an `EmailOutbox` record within the same transaction as the business action. It must strictly validate template IDs and payload variables, rejecting arbitrary senders and untrusted links before delivery.

## Boundaries & Constraints

**Always:**
- Persist an `EmailOutbox` record in the exact same transaction as the business record.
- Use the `RecordingAdapter` in CI and testing to capture rendered payloads without external network calls.
- Enforce strongly typed and allowlisted template IDs.
- Validate all template variables using Zod or a strict schema before queuing.
- Implement idempotency checks: retrying a successfully delivered email outbox record must not produce duplicate deliveries.

**Block If:**
- N/A

**Never:**
- Never accept arbitrary HTML markup from callers.
- Never accept arbitrary sender addresses; the sender domain must be verified and fixed.
- Never dispatch emails synchronously *before* the business transaction commits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Production Delivery | Valid template ID and variables, committed transaction | Email sent via Resend, outbox marked as sent | Outbox remains pending for retry on network failure |
| CI/Test Environment | Valid template ID and variables | Payload recorded in memory for test assertions | N/A |
| Invalid Template Variables | Missing or malformed variables | Rejected before outbox insertion | Throws validation error |
| Idempotent Retry | Attempt to send already delivered outbox record | Skipped, no duplicate email sent | N/A |

</intent-contract>

## Code Map

- `apps/api/src/modules/email/email.module.ts` -- Module definition, provides the `EmailService` and appropriate `EmailAdapter` based on environment.
- `apps/api/src/modules/email/email.service.ts` -- Core service coordinating validation, outbox persistence, and adapter dispatch.
- `apps/api/src/modules/email/adapters/email.adapter.interface.ts` -- Interface defining the adapter contract.
- `apps/api/src/modules/email/adapters/resend.adapter.ts` -- Production adapter using Resend API.
- `apps/api/src/modules/email/adapters/recording.adapter.ts` -- Deterministic test adapter for CI.
- `apps/api/src/modules/email/schemas/templates.ts` -- Zod schemas defining allowed template IDs and their expected variables.
- `apps/api/prisma/schema.prisma` -- Modify `EmailOutbox` if necessary to support idempotency (e.g. `deliveredAt` timestamp).

## Tasks & Acceptance

**Execution:**
- `apps/api/src/modules/email/adapters/email.adapter.interface.ts` -- Create interface for email dispatch.
- `apps/api/src/modules/email/adapters/resend.adapter.ts` -- Implement Resend API call with server-side API key.
- `apps/api/src/modules/email/adapters/recording.adapter.ts` -- Implement in-memory recording of sent payloads.
- `apps/api/src/modules/email/schemas/templates.ts` -- Define Zod schemas for templates (e.g., `Invitation`, `PasswordReset`).
- `apps/api/src/modules/email/email.service.ts` -- Implement method to validate payload, write to `EmailOutbox` (using transaction client), and dispatch. Ensure idempotent retries.
- `apps/api/src/modules/email/email.module.ts` -- Register providers and export `EmailService`. Conditionally provide Resend or Recording adapter based on `NODE_ENV`.
- `apps/api/package.json` -- Add `resend` and `zod` dependencies if not already present.
- `apps/api/src/modules/email/email.service.spec.ts` -- Write unit tests to assert validation, outbox creation, and recording adapter integration.
- `apps/api/prisma/schema.prisma` -- If needed, update `EmailOutbox` schema and create a migration to track delivery status for idempotency.
- **IMPORTANT INSTRUCTION TO IMPLEMENTER:** If this story's acceptance criteria include actions only a HUMAN can perform outside the repo (buy a domain, publish a DNS record, grant an API key, click through a vendor console): complete every part an agent CAN do, commit it, then finalize the spec frontmatter to `status: awaiting-operator` and enumerate what is owed under an `operator_actions:` key — a YAML list of strings, one imperative instruction each, non-empty. Never use the `blocked` status for this.

**Acceptance Criteria:**
- Given a valid template request in a test environment, when dispatched, then the outbox record is created and the recording adapter captures the payload without external calls.
- Given an invalid template payload, when requested, then a validation error is thrown before transaction commit.
- Given an outbox record that was already delivered, when retried, then the adapter is not called again.

## Spec Change Log

## Review Triage Log

## Design Notes

Use a generic transaction client parameter to allow the email service to run within an existing Prisma transaction.
```typescript
async sendEmail(tx: Prisma.TransactionClient, to: string, template: keyof typeof templates, payload: any) {
  // 1. Validate payload
  // 2. Persist to EmailOutbox via `tx`
  // 3. Dispatch via adapter (or schedule for post-commit dispatch)
}
```

## Verification

**Commands:**
- `pnpm --filter @nova/api vitest run apps/api/src/modules/email/email.service.spec.ts` -- expected: All unit tests pass, verifying validation and recording adapter behavior.
## Auto Run Result

Status: awaiting-operator

_Appended by the bmad-loop orchestrator (missing-marker repair, #224): the session finalized this spec's frontmatter without its `## Auto Run Result` marker, so the orchestrator synthesized the result from the frontmatter and appended this section._

Synthesized by the bmad-loop orchestrator from frontmatter status `awaiting-operator` for story `1-3-transactional-email-adapter` (session finalized the spec without appending its marker).

## Operator Confirmation

Confirmed 2026-08-18: the external actions this story owed were carried out.

- Start local database and run pnpm --filter @nova/api migrate to generate and apply the migration for EmailOutbox updates.
- Configure RESEND_API_KEY environment variable for the production adapter.

_Appended by the bmad-loop orchestrator (`bmad-loop confirm`, #335): a human confirmed these external actions out of band, and the story was advanced from `awaiting-operator` to `done`._
