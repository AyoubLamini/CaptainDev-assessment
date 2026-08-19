---
title: 'Story 3.4: Terminal Disablement & Narrowly-Scoped Platform Interventions'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
baseline_revision: '568b46bd13439a398a21c72fed942245ff4d369b'
---

<intent-contract>

## Intent

**Problem:** End-of-life customer tenants must be safely closed (terminal disablement), and Platform Administrators need to assist specific Organization users with reasoned interventions without bypassing tenant boundaries and exposing general business data.

**Approach:** Add two endpoints to the Platform Organizations controller: one for terminal disablement (`POST /platform/organizations/:id/disable`) and one for narrowly-scoped user interventions (`POST /platform/organizations/:id/intervention`). Ensure both actions require a reason, commit an evidence record, and that disablement immediately invalidates all active sessions for the organization's members.

## Boundaries & Constraints

**Always:**
- Verify recent authentication (e.g. by requiring password confirmation) before performing disablement or intervention.
- The intervention must operate only within the specified organization's boundary.
- Terminal disablement must transition the organization to `DISABLED` and revoke all active sessions for its members.
- Emit a minimized evidence footprint for every sensitive transition.

**Block If:**
- Platform Administrator authorization guard is missing or cannot be resolved.
- Recent authentication cannot be verified.

**Never:**
- Never provide global bypass access or grant cross-Organization data access to the Platform Administrator.
- Never resurrect a terminally disabled organization.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Terminal disablement | Valid Organization ID, reason, valid password | Organization state updated to DISABLED, sessions revoked, 200 OK | 404 Not Found, 403 Forbidden |
| Terminal disablement w/o recent auth | Valid ID, reason, invalid password | Action rejected, 401 Unauthorized | Require recent re-authentication |
| Platform intervention | Valid Organization ID, target identity, action, reason, valid password | Intervention executed within org boundary, 200 OK | 404 Not Found, 403 Forbidden |
| Intervention across orgs | Target identity not in Org | Action rejected, 403 Forbidden | Ensure boundary enforcement |

</intent-contract>

## Code Map

- `apps/api/src/modules/platform-admin/dto/disable-organization.dto.ts` -- DTO for disablement (needs `reason`, `passwordConfirmation`).
- `apps/api/src/modules/platform-admin/dto/platform-intervention.dto.ts` -- DTO for intervention (needs `targetIdentityId`, `action`, `reason`, `passwordConfirmation`).
- `apps/api/src/modules/platform-admin/platform-organizations.service.ts` -- Implement `disableOrganization` (revokes sessions, sets `DISABLED`, records evidence) and `performIntervention` (scoped execution, records evidence).
- `apps/api/src/modules/platform-admin/platform-organizations.controller.ts` -- Add `POST /:id/disable` and `POST /:id/intervention` endpoints, guarded by recent auth check.
- `apps/api/src/modules/identity/identity.service.ts` or `auth.service.ts` -- Provide method to verify password and revoke sessions for organization members.
- `apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts` -- Tests for edge cases and session revocation.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.spec.ts` -- Tests for endpoints.

## Tasks & Acceptance

**Execution:**
- `apps/api/src/modules/platform-admin/dto/disable-organization.dto.ts` -- Create DTO for disabling an organization (`reason`, `passwordConfirmation`).
- `apps/api/src/modules/platform-admin/dto/platform-intervention.dto.ts` -- Create DTO for interventions (`targetIdentityId`, `action`, `reason`, `passwordConfirmation`).
- `apps/api/src/modules/identity/identity.service.ts` -- Add method to verify an identity's password credential for re-authentication.
- `apps/api/src/modules/identity/auth.service.ts` -- Add method to delete sessions for all members of a given organization ID.
- `apps/api/src/modules/platform-admin/platform-organizations.service.ts` -- Implement `disableOrganization` (validates password, updates status to DISABLED, revokes sessions, commits evidence) and `performIntervention` (validates password, checks target membership, performs action, commits evidence).
- `apps/api/src/modules/platform-admin/platform-organizations.controller.ts` -- Expose the `POST /:id/disable` and `POST /:id/intervention` endpoints.
- `apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts` -- Write tests asserting session revocation and evidence generation.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.spec.ts` -- Write tests asserting auth failures for invalid passwords.

**Acceptance Criteria:**
- Given an Organization in any state, when a Platform Admin submits a terminal disablement with a reason and password, then the Organization transitions to `DISABLED`, all access is revoked immediately, and evidence is committed.
- Given a platform intervention scoped to one Organization, when processed, then it operates only within that single Organization's boundary and does not grant access to any other Organization's data.

## Spec Change Log

## Review Triage Log

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Verification

**Commands:**
- `npm run lint` -- expected: Passes without errors.
- `npm run build` -- expected: API builds successfully.
- `npm run test` -- expected: Test suites pass.

## Auto Run Result

Status: done
Summary: Terminal disablement and narrowly-scoped platform intervention endpoints have been implemented.
Files changed:
- `apps/api/src/modules/platform-admin/dto/disable-organization.dto.ts` -- Added disablement DTO.
- `apps/api/src/modules/platform-admin/dto/platform-intervention.dto.ts` -- Added intervention DTO.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.ts` -- Added POST `/:id/disable` and `/:id/intervention`.
- `apps/api/src/modules/platform-admin/platform-organizations.service.ts` -- Implemented business logic for both endpoints.
- `apps/api/src/modules/identity/identity.service.ts` -- Added password verification.
- `apps/api/src/modules/identity/auth.service.ts` -- Added session revocation method.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.spec.ts` -- Endpoint routing tests.
- `apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts` -- Added service business logic tests.
Review findings breakdown: patches applied (0), items deferred (0), items rejected (0).
Follow-up review recommended: false (0 patched issues, score: 0).
Verification performed: ran `npm run lint` (passed), `pnpm -r build` (passed), `npm run test` (passed).
Residual risks: none.
