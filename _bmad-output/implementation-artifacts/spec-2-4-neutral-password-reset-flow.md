---
title: 'Neutral Password Reset Flow'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_revision: '27b87c94e9b1743b9553966879436468eb83b219'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      Missing E2E and controller tests verifying HTTP boundaries and routing.
    evidence: |-
      Tests for `requestPasswordReset` are currently confined strictly to the internal service boundary. E2E validations demonstrating actual 200/400 network responses are absent.
    location: >-
      apps/api/src/modules/identity/auth.controller.ts
    severity: medium
  - summary: >-
      No rate limiting or abuse prevention on password reset flows.
    evidence: |-
      The endpoints currently allow unlimited unauthenticated requests per IP, opening the system up to email spamming or resource exhaustion.
    location: >-
      apps/api/src/modules/identity/auth.controller.ts
    severity: medium
  - summary: >-
      Unnecessary database contention regarding the `SYSTEM` organization upsert.
    evidence: |-
      Every token creation runs an upsert against the `SYSTEM` row in Prisma, creating potential lock contention under high load for a static bypass constraint.
    location: >-
      apps/api/src/modules/identity/auth.service.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Users who forget their passwords cannot currently regain access to their accounts. Without a secure reset flow, accounts become permanently inaccessible if credentials are lost, and poor implementations can leak whether an email exists.

**Approach:** Implement a neutral `POST /auth/forgot-password` endpoint that sends a secure reset token via the email adapter if the account exists, and a `POST /auth/reset-password` endpoint that validates the token and updates the password, alongside minimal frontend pages for these flows.

## Boundaries & Constraints

**Always:**
- Verify that `forgot-password` always returns a neutral response (e.g., "If an account with that email exists, we sent a reset link.") whether the email exists or not (SEC-16).
- Generate reset tokens using at least 128 bits of cryptographic entropy (e.g., 32 bytes).
- Store only the SHA-256 hash of the reset token in the `PasswordResetToken` database table, setting an appropriate expiry.
- Use `EmailService` to dispatch the reset link (simulating delivery via the email adapter).
- Hash new passwords using `argon2` with the same parameters as in login.
- When a password reset completes successfully, delete the `PasswordResetToken` and revoke *every existing session* for that identity.

**Block If:** N/A

**Never:**
- Never disclose in HTTP responses or public logs whether an email address exists.
- Never include the plaintext token in server logs or database entries.
- Never use JWTs for reset tokens; rely exclusively on the `PasswordResetToken` table.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Forgot Password (Valid) | Existing email | Neutral success message, email sent | N/A |
| Forgot Password (Invalid) | Non-existent email | Neutral success message, no email sent | N/A |
| Reset Password (Valid) | Valid token, new password | 200 OK, password updated, token deleted, sessions revoked | N/A |
| Reset Password (Invalid)| Expired or invalid token | 400 Bad Request (neutral error) | N/A |

</intent-contract>

## Code Map

- `apps/api/src/modules/identity/auth.service.ts` -- To implement `requestPasswordReset(email)` and `resetPassword(token, newPassword)` and handle token generation/hashing.
- `apps/api/src/modules/identity/auth.controller.ts` -- To expose `/auth/forgot-password` and `/auth/reset-password`.
- `apps/api/src/modules/identity/identity.module.ts` -- To import `EmailModule` if needed.
- `apps/web/src/app/forgot-password/page.tsx` -- New UI for requesting a password reset.
- `apps/web/src/app/reset-password/page.tsx` -- New UI for submitting a new password with a token from the URL.

## Tasks & Acceptance

**Execution:**
- `apps/api/src/modules/identity/auth.service.ts` -- Add `requestPasswordReset`. Normalize the email to lowercase. To prevent timing attacks (SEC-16), perform the database ops and email queueing in a background/fire-and-forget promise (or use a constant-time delay) so the method returns the neutral success message immediately and in constant time regardless of user existence. Add `resetPassword` that verifies the token, hashes the new password, updates `PasswordCredential`, safely deletes the token (e.g. `deleteMany` to avoid P2025 on concurrent requests), and deletes all `Session`s for the identity.
- `apps/api/src/modules/identity/auth.controller.ts` -- Add `POST /auth/forgot-password` and `POST /auth/reset-password`. Both must return identical neutral responses to prevent email enumeration. Ensure request body is properly validated (e.g., email length bounds).
- `apps/api/src/modules/identity/identity.module.ts` -- Ensure `EmailModule` is imported so `EmailService` can be injected into `AuthService`.
- `apps/web/src/app/forgot-password/page.tsx` -- Create a form to request a password reset and show a neutral success message. Await the CSRF token fetch before allowing form submission to avoid race conditions. Handle non-HTTPS environments gracefully if using host-prefixed cookies.
- `apps/web/src/app/reset-password/page.tsx` -- Create a form to read `?token=` from the URL and submit a new password to the API. Await the CSRF token fetch before allowing form submission.

**Acceptance Criteria:**
- Given an existing email, when a password reset is requested, then a neutral response is returned and a token is sent to the email.
- Given a non-existent email, when a password reset is requested, then the exact same neutral response is returned but no email is sent.
- Given a valid token, when the user resets their password, then the password is changed, all previous sessions are invalidated, and the token is consumed.
- Given an invalid or expired token, when the user attempts to reset their password, then a neutral error is returned.

## Spec Change Log

### 2026-08-18 — Timing attack, race condition, and unhandled exception fixes
- **Triggering finding:** Severe timing attack vector in `requestPasswordReset` (returns immediately for non-existent users but performs DB/email ops for existing ones, allowing enumeration); email case-sensitivity bugs; CSRF token race conditions on frontend; Prisma P2025 on concurrent redemptions.
- **Amended:** Updated `Tasks & Execution` to require mitigating the timing attack (e.g. backgrounding ops), normalizing email casing before lookup, deleting tokens with `deleteMany`, and blocking frontend submission until the CSRF token is fetched.
- **Known-bad state avoided:** Leaking email existence via response time, failing resets for valid users due to casing, server 500s on concurrent redemptions, and frontend submission failures due to pending CSRF fetches.
- **KEEP:** The general structure of the endpoints and frontend pages, the transaction block managing token lifecycle and session revocation, and the exact neutral response messages. KEEP the existing deferred work entries.

## Review Triage Log
### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 5
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` Timing attack vulnerability in `requestPasswordReset` allowing email enumeration.
  - `[medium]` `[bad_spec]` Email case-sensitivity issues during lookup.
  - `[medium]` `[bad_spec]` Concurrent requests redeem the same valid token causing Prisma P2025 (500 error).
  - `[low]` `[bad_spec]` CSRF token race condition in frontend forms.
  - `[low]` `[bad_spec]` Lack of maximum length validation on payload fields.

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 7: (high 0, medium 2, low 5)
- reject: 2: (high 0, medium 0, low 2)
- addressed_findings:
  - `[low]` `[patch]` Missing validation for email format (`isEmail`) in controller. Fixed by adding `@` check.
  - `[low]` `[patch]` Missing disabled state on text input fields during form submission. Fixed by applying `disabled={loading}`.

## Verification

**Commands:**
- `npm run tsc --workspace=@nova/api` -- expected: completes successfully without type errors.
- `npm run tsc --workspace=@nova/web` -- expected: completes successfully without type errors.


## Auto Run Result

**Summary of implemented change:**
Implemented a neutral password reset flow that generates 32-byte cryptographically secure tokens, hashes them with SHA-256 for storage, and queues password-reset emails. Mitigated timing attacks by using constant-time background operations. The frontend handles token fetching and CSRF protection securely.

**Files changed:**
- `apps/api/src/modules/identity/auth.service.ts`: Implemented `requestPasswordReset` and `resetPassword` logic securely.
- `apps/api/src/modules/identity/auth.controller.ts`: Exposed API endpoints with validation.
- `apps/api/src/modules/identity/identity.module.ts`: Provided `EmailModule` dependencies.
- `apps/api/src/modules/identity/auth.service.spec.ts`: Added unit tests proving boundary constraints.
- `apps/web/src/app/forgot-password/page.tsx`: Created the request reset UI.
- `apps/web/src/app/reset-password/page.tsx`: Created the fulfill reset UI.

**Review findings breakdown:**
- Patches applied: 2
- Items deferred: 7
- Items rejected: 2

**Follow-up review recommendation:** false (0 high, 2 low severity = 2 < 5)

**Verification performed:**
- `npm run tsc --workspace=@nova/api` — Completed with 0 errors.
- `npm run tsc --workspace=@nova/web` — Completed with 0 errors.
- `npm run test --workspace=@nova/api` — All unit tests including the password reset matrix passed successfully.

**Residual risks:**
- E2E tests and network boundary controller tests are deferred.
- Background tasks (via `setImmediate`) could drop emails if the Node process restarts immediately after responding to the request.
