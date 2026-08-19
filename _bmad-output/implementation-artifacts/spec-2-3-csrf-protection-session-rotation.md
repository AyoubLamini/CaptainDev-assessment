---
title: 'CSRF Protection & Session Rotation'
type: 'feature'
created: '2026-08-18'
status: 'blocked'
baseline_revision: '7135639f4eb268753477ba48e021984b4f7d7e9c'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The system relies on cookies for authentication but lacks explicit CSRF defenses for state-mutating requests, failing SEC-15. Additionally, the application does not rotate sessions upon re-login, which leaves it vulnerable to session fixation, and there is no logout mechanism to properly revoke active sessions server-side.

**Approach:** Implement the Double Submit Cookie pattern for CSRF protection by requiring an `x-csrf-token` header that matches a `__Host-csrf` cookie for all unsafe HTTP methods, enforced via a global NestJS guard. Introduce session rotation to invalidate existing sessions during a new login attempt, and add a `POST /auth/logout` endpoint to explicitly terminate sessions server-side.

## Boundaries & Constraints

**Always:**
- Use `cookie-parser` to safely read incoming cookies on the server.
- Verify that `req.cookies['__Host-csrf']` and `req.headers['x-csrf-token']` match exactly for `POST`, `PUT`, `PATCH`, and `DELETE` requests.
- Generate CSRF tokens with at least 128 bits of entropy (e.g., 32 random bytes).
- Issue the `__Host-csrf` cookie without `httpOnly` so the browser can read it, but include `Secure`, `SameSite=Strict`, and `Path=/` (omit the `Secure` flag and `__Host-` prefix in `NODE_ENV=test` or `development` to allow HTTP testing).
- Rotate (invalidate in the database) the old session if a user logs in while already possessing a valid `__Host-session` cookie.
- Logout must remove the session hash from the database before clearing both the session and CSRF cookies.

**Block If:** N/A

**Never:**
- Never apply the CSRF guard to safe methods like `GET`, `HEAD`, or `OPTIONS`.
- Never store the CSRF token in the database; validation relies entirely on comparing the cookie and the header.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid CSRF Request | Unsafe request with matching `__Host-csrf` cookie and `x-csrf-token` header | Request proceeds | N/A |
| Missing/Mismatched CSRF | Unsafe request with missing or mismatched CSRF token | 403 Forbidden | Return neutral 403 error |
| Session Rotation | `POST /auth/login` with existing valid session cookie and valid credentials | Old session revoked only on successful auth, new session and CSRF cookies issued | N/A |
| Logout | `POST /auth/logout` with valid session cookie | Session revoked, cookies cleared | N/A |

</intent-contract>

## Code Map

- `apps/api/package.json` -- To add `cookie-parser` dependency.
- `apps/api/src/main.ts` -- To initialize `cookie-parser` middleware.
- `apps/api/src/common/guards/csrf.guard.ts` -- To implement the CSRF validation logic.
- `apps/api/src/app.module.ts` -- To register the global CSRF guard.
- `apps/api/src/modules/identity/auth.controller.ts` -- To add `/auth/csrf` and `/auth/logout` endpoints, and update login to handle rotation.
- `apps/api/src/modules/identity/auth.service.ts` -- To implement `logout(sessionId)` that revokes the session.
- `apps/web/src/app/login/page.tsx` -- To fetch the CSRF token before login and send it in the header.

## Tasks & Acceptance

**Execution:**
- `apps/api/package.json` -- Add `cookie-parser` and `@types/cookie-parser` dependencies in dependencies/devDependencies.
- `apps/api/src/main.ts` -- Apply `cookieParser()` middleware to the NestJS application instance so that `req.cookies` is populated.
- `apps/api/src/common/guards/csrf.guard.ts` -- Create a guard that checks `req.method`. If it's an unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`), read `req.cookies['__Host-csrf']` and compare it against `req.headers['x-csrf-token']`. Throw `ForbiddenException('Invalid CSRF token')` if missing or mismatched.
- `apps/api/src/app.module.ts` -- Register `CsrfGuard` via `APP_GUARD` to protect all endpoints globally.
- `apps/api/src/modules/identity/auth.service.ts` -- Add a `logout(sessionId: string)` method that computes the SHA-256 hash of the session ID and deletes it from the `Session` table.
- `apps/api/src/modules/identity/auth.controller.ts` -- Add `GET /auth/csrf` to generate a 32-byte CSRF token and set it in a `__Host-csrf` cookie. Update `POST /auth/login` to read an existing `__Host-session` cookie; if present, call `authService.logout(sessionId)`. After generating the new session, also generate and set a new `__Host-csrf` cookie. Add `POST /auth/logout` to call `authService.logout(sessionId)` and use `res.clearCookie` for both session and CSRF cookies.
- `apps/web/src/app/login/page.tsx` -- On component mount or before submit, fetch `GET /auth/csrf` with `credentials: 'include'`. Then extract the `__Host-csrf` cookie value, and include it in the `x-csrf-token` header during the `POST /auth/login` request.

**Acceptance Criteria:**
- Given an active session, when an unsafe request is sent without a matching CSRF header and cookie, then the server rejects it with a 403 Forbidden.
- Given an existing logged-in user, when they log in again, their old session is removed from the database and a new one is issued.
- Given an active session, when the user requests logout, then the session is deleted from the database and the client cookies are cleared.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run tsc --workspace=@nova/api` -- expected: completes successfully without type errors.
- `npm run tsc --workspace=@nova/web` -- expected: completes successfully without type errors.

## Auto Run Result

Status: blocked
Blocking condition: matrix test audit failed
