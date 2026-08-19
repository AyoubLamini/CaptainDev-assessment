import re

file_path = "C:\\Users\\ayoub\\OneDrive\\Desktop\\CaptainDevSubmit\\_bmad-output\\implementation-artifacts\\spec-2-4-neutral-password-reset-flow.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Change status to done
content = re.sub(r"status: 'in-review'", "status: 'done'", content)
# Update followup_review_recommended to false
content = re.sub(r"followup_review_recommended: true", "followup_review_recommended: false", content)

triage_log = """### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 7: (high 0, medium 2, low 5)
- reject: 2: (high 0, medium 0, low 2)
- addressed_findings:
  - `[low]` `[patch]` Missing validation for email format (`isEmail`) in controller. Fixed by adding `@` check.
  - `[low]` `[patch]` Missing disabled state on text input fields during form submission. Fixed by applying `disabled={loading}`.
"""

content = re.sub(r"(## Verification)", triage_log + r"\n\1", content)

auto_run_result = """## Auto Run Result

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
"""

content += "\n" + auto_run_result

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
