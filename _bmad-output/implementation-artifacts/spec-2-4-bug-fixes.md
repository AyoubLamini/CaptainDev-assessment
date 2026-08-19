---
title: 'Fix 2-4: Password Reset Flow Bugs'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '45d2fe944cc2e8a8cf37e0aa2f373fad358cf525'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<frozen-after-approval>
## Intent

**Problem:** 
1. The aorgot-password flow does not actually send an email. This is because the dispatchEmail call runs asynchronously via setImmediate *inside* the Prisma transaction block, attempting to read the outbox record using the non-transactional 	his.prisma client before the transaction has committed.
2. The 
eset-password frontend form does not handle missing tokens gracefully. If the user navigates without a token, they can still fill out the form, but submission is blocked with "Invalid or missing reset token". It should hide the form entirely if no token is present.

**Approach:**
1. Refactor 
equestPasswordReset in auth.service.ts to capture the outboxId inside the transaction and schedule the dispatchEmail *after* the transaction successfully commits.
2. Update 
eset-password/page.tsx to immediately display an error (or hide the form) if ?token= is not present in the URL, preventing the user from interacting with a broken state.

## Boundaries & Constraints
- Retain the background execution of dispatchEmail to prevent timing attacks.
- Ensure the API responses remain neutral.
</frozen-after-approval>

## Code Map
- apps/api/src/modules/identity/auth.service.ts
  - In 
equestPasswordReset: Move setImmediate scheduling of dispatchEmail to after await this.prisma.(...).
- apps/web/src/app/reset-password/page.tsx
  - Check for 	oken existence immediately. If !token, return a user-friendly error UI instead of rendering the password inputs.

## Tasks & Acceptance

**Execution:**
- [x] Edit apps/api/src/modules/identity/auth.service.ts:
  - Extract the queueEmail result to a variable outside the transaction block.
  - After the transaction completes, trigger dispatchEmail within a setImmediate.
- [x] Edit apps/web/src/app/reset-password/page.tsx:
  - If !token, return early with an error message in the JSX (e.g., <div>Invalid or missing reset token in URL.</div>).

**Acceptance Criteria:**
- Given a valid email, when requesting a password reset, an email is actually dispatched via the adapter.
- Given a /reset-password URL without a token, the user sees an error message immediately and cannot attempt to submit the form.

## Review Triage Log
### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings: []

## Verification
- 
pm run tsc --workspace=@nova/api — Completed with 0 errors.
- 
pm run tsc --workspace=@nova/web — Completed with 0 errors.

## Auto Run Result
**Summary of implemented change:**
Fixed the uncommitted transaction issue for email dispatching and the missing token frontend behavior.
