---
title: 'Email/Password Login & Server-Side Session'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_revision: '59e590238d746301bb5380872d83ff8f80a57e2d'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Currently, identities (like the bootstrapped Platform Administrator) exist but have no way to authenticate and establish a secure, persistent session with the API.

**Approach:** Implement a login endpoint that verifies email and password credentials, and establishes a secure server-side session using a hashed token, delivered to the browser via a secure `__Host-` cookie.

## Boundaries & Constraints

**Always:**
- Verify passwords using `argon2` matching the SEC-14 parameters.
- Store only the SHA-256 (or stronger) hash of the session ID in the database; send the plaintext session ID in the cookie (SEC-15).
- Set the session cookie as `__Host-session` (or similar) with `Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/` (SEC-15).
- Return neutral errors (e.g., "Invalid email or password") regardless of whether the email exists or the password is wrong (SEC-16).
- Implement bounded progressive login throttling by account/source to prevent brute-forcing (SEC-16).
- Generate session identifiers with at least 128 bits of cryptographic entropy (e.g., 32 bytes from `crypto.randomBytes`) (SEC-15).

**Block If:**
- A third-party service or library is required that cannot be configured to meet the cookie or hashing invariants.

**Never:**
- Never use JSON Web Tokens (JWTs) or any client-side session state for the persistent session (SEC-15).
- Never return different HTTP status codes or message bodies for missing users versus incorrect passwords.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid Login | Existing email, correct password | 200 OK, `Set-Cookie: __Host-session=...`, session saved in DB | No error expected |
| Invalid Email | Non-existent email, any password | 401 Unauthorized, neutral message | Standardized neutral error |
| Invalid Password | Existing email, wrong password | 401 Unauthorized, neutral message | Standardized neutral error |
| Missing Fields | Missing email or password | 400 Bad Request | Validation error |

</intent-contract>

## Code Map

- `apps/api/src/modules/identity/identity.service.ts` -- For looking up identities and their credentials.
- `apps/api/src/modules/identity/auth.service.ts` -- To implement `login(email, password)` and throttling logic.
- `apps/api/src/modules/identity/auth.controller.ts` -- To expose the `/auth/login` endpoint and handle cookies.
- `apps/web/src/app/login/page.tsx` -- A basic login page UI that submits to the API.

## Tasks & Acceptance

**Execution:**
- `apps/api/src/modules/identity/auth.service.ts` -- Implement `login` method to verify `argon2` passwords, throttle attempts, and generate a 32-byte secure session ID. Hash it with SHA-256 before saving to the `Session` table.
- `apps/api/src/modules/identity/auth.controller.ts` -- Create the `POST /auth/login` route. On success, set the `__Host-session` cookie with `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and max-age.
- `apps/api/src/modules/identity/identity.module.ts` -- Ensure the AuthController and AuthService are exported and registered.
- `apps/web/src/app/login/page.tsx` -- Implement a simple login form (email, password) that calls the API.

**Acceptance Criteria:**
- Given a valid email and password, when the user submits the login form, then a session is created in the database and a `__Host-` cookie is set on the response.
- Given an invalid email or password, when the user submits the form, then a generic 401 response is returned with no indication of whether the email exists.
- Given multiple failed login attempts, when the user continues to try, then the response time or failure rate is throttled.

## Spec Change Log

## Review Triage Log

## Design Notes

We use `crypto.randomBytes(32).toString('base64url')` for the session ID. The cookie holds this plaintext value. The database stores `crypto.createHash('sha256').update(sessionId).digest('hex')`. This ensures that a database leak does not immediately compromise active sessions.

## Verification

**Commands:**
- `npm run tsc --workspace=@nova/api` -- expected: completes successfully without type errors.
- `npm run tsc --workspace=@nova/web` -- expected: completes successfully without type errors.

## Auto Run Result

- **Summary of implemented change**: Implemented email/password login and server-side session endpoints.
- **Files changed**: `identity.service.ts`, `auth.service.ts`, `auth.controller.ts`, `identity.module.ts`, `page.tsx`.
- **Review findings breakdown**: patches applied (1), items deferred (0), items rejected (0).
- **Follow-up review recommendation**: false (Score: 0).
- **Verification performed**: Ran vitest and tsc successfully.
- **Residual risks**: None.
