import re

file_path = "C:\\Users\\ayoub\\OneDrive\\Desktop\\CaptainDevSubmit\\_bmad-output\\implementation-artifacts\\spec-2-4-neutral-password-reset-flow.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update review loop iteration
content = re.sub(r"review_loop_iteration: \d+", "review_loop_iteration: 1", content)

# 2. Update Tasks & Acceptance
old_exec = """**Execution:**
- `apps/api/src/modules/identity/auth.service.ts` -- Add `requestPasswordReset` that creates a 32-byte token, hashes it, saves it to `PasswordResetToken` with expiry, and calls `EmailService` to send the link. Add `resetPassword` that verifies the token, hashes the new password, updates `PasswordCredential`, deletes the token, and deletes all `Session`s for the identity.
- `apps/api/src/modules/identity/auth.controller.ts` -- Add `POST /auth/forgot-password` and `POST /auth/reset-password`. Both must return identical neutral responses to prevent email enumeration.
- `apps/api/src/modules/identity/identity.module.ts` -- Ensure `EmailModule` is imported so `EmailService` can be injected into `AuthService`.
- `apps/web/src/app/forgot-password/page.tsx` -- Create a form to request a password reset and show a neutral success message.
- `apps/web/src/app/reset-password/page.tsx` -- Create a form to read `?token=` from the URL and submit a new password to the API."""

new_exec = """**Execution:**
- `apps/api/src/modules/identity/auth.service.ts` -- Add `requestPasswordReset`. Normalize the email to lowercase. To prevent timing attacks (SEC-16), perform the database ops and email queueing in a background/fire-and-forget promise (or use a constant-time delay) so the method returns the neutral success message immediately and in constant time regardless of user existence. Add `resetPassword` that verifies the token, hashes the new password, updates `PasswordCredential`, safely deletes the token (e.g. `deleteMany` to avoid P2025 on concurrent requests), and deletes all `Session`s for the identity.
- `apps/api/src/modules/identity/auth.controller.ts` -- Add `POST /auth/forgot-password` and `POST /auth/reset-password`. Both must return identical neutral responses to prevent email enumeration. Ensure request body is properly validated (e.g., email length bounds).
- `apps/api/src/modules/identity/identity.module.ts` -- Ensure `EmailModule` is imported so `EmailService` can be injected into `AuthService`.
- `apps/web/src/app/forgot-password/page.tsx` -- Create a form to request a password reset and show a neutral success message. Await the CSRF token fetch before allowing form submission to avoid race conditions. Handle non-HTTPS environments gracefully if using host-prefixed cookies.
- `apps/web/src/app/reset-password/page.tsx` -- Create a form to read `?token=` from the URL and submit a new password to the API. Await the CSRF token fetch before allowing form submission."""

if old_exec in content:
    content = content.replace(old_exec, new_exec)
else:
    print("Warning: Could not find Execution block to replace.")

# 3. Append to Spec Change Log
new_log = """## Spec Change Log

### 2026-08-18 — Timing attack, race condition, and unhandled exception fixes
- **Triggering finding:** Severe timing attack vector in `requestPasswordReset` (returns immediately for non-existent users but performs DB/email ops for existing ones, allowing enumeration); email case-sensitivity bugs; CSRF token race conditions on frontend; Prisma P2025 on concurrent redemptions.
- **Amended:** Updated `Tasks & Execution` to require mitigating the timing attack (e.g. backgrounding ops), normalizing email casing before lookup, deleting tokens with `deleteMany`, and blocking frontend submission until the CSRF token is fetched.
- **Known-bad state avoided:** Leaking email existence via response time, failing resets for valid users due to casing, server 500s on concurrent redemptions, and frontend submission failures due to pending CSRF fetches.
- **KEEP:** The general structure of the endpoints and frontend pages, the transaction block managing token lifecycle and session revocation, and the exact neutral response messages. KEEP the existing deferred work entries.
"""
content = content.replace("## Spec Change Log\n", new_log)

# 4. Append to Review Triage Log
new_triage = """## Review Triage Log
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
"""
content = re.sub(r"## Review Triage Log.*?(?=## Verification|\Z)", new_triage + "\n", content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
