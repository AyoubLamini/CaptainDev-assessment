---
title: 'Story 5.3: Permission Presets & Explicit Grant Management'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 1
baseline_commit: '947d90c93d95c417ebdf2af4c30cf5bd07df090a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Organization Administrators currently lack a way to manage granular permissions for active collaborators, relying only on default roles without the ability to specify or preview explicit capability and scope grants.

**Approach:** Implement a Collaborator Management API to fetch and update an active member's profile and explicit grants (`grants` JSON). The UI will provide permission presets as client-side templates, compute effective access descending through the company/scope hierarchy, and highlight access reductions to prompt for explicit confirmation and recent re-authentication before saving.

## Boundaries & Constraints

**Always:**
- Verify the actor is an active Administrator of the target Organization.
- Validate incoming explicit grants server-side to reject unknown, inactive, platform-only, or cross-Organization capabilities and scopes.
- Require recent re-authentication when updating grants if the new grants reduce the collaborator's access.
- Ensure Organization-level scope grants descend to Companies and their scopes, and Company grants descend only to that Company's scopes; scope grants never ascend.

**Ask First:**
- If computing effective access requires complex recursive DB queries or major schema changes (prefer in-memory calculation in the service/UI based on retrieved hierarchy).

**Never:**
- Do not grant platform capabilities via Organization permission updates.
- Do not allow an Administrator to update their own explicit grants to bypass restrictions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid grant update | Admin updates member with valid `grants` | Grants JSON updated in DB; evidence committed. | N/A |
| Reduce access without recent auth | Grant update removes a capability/scope; session is older than threshold | Rejected. | 403 Forbidden with specific code for re-auth |
| Unknown/External scope | Grant references `scopeId` not in the Organization | Rejected during validation. | 400 Bad Request |
| Self grant update | Admin attempts to update their own grants | Rejected. | 403 Forbidden |

</frozen-after-approval>

## Code Map

- `apps/api/src/common/constants.ts` -- Add `UPDATE_COLLABORATOR_GRANTS` evidence action.
- `apps/api/src/modules/org-admin/dto/update-collaborator-grants.dto.ts` -- DTO to validate the structure of the `grants` JSON and verify it contains no platform-level properties.
- `apps/api/src/modules/org-admin/collaborator.controller.ts` -- Expose `GET /organizations/:orgId/collaborators/:id` and `PATCH /organizations/:orgId/collaborators/:id/grants`.
- `apps/api/src/modules/org-admin/collaborator.service.ts` -- Business logic to validate scope boundaries against the DB, detect access reduction, verify recent authentication, and commit the grant update with evidence.
- `apps/api/src/modules/access-control/guards/recent-auth.guard.ts` -- (New or updated) Guard to enforce that the current session was created recently (e.g. last 15 minutes) for sensitive operations.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/common/constants.ts` -- Add `UPDATE_COLLABORATOR_GRANTS` to `EvidenceActions`.
- [x] `apps/api/src/modules/access-control/guards/recent-auth.guard.ts` -- Implement guard/decorator to enforce session freshness for sensitive operations. Ensure it handles `session.createdAt` safely (e.g. parsing it as a Date) to prevent TypeErrors. Apply it cleanly to the route or use it as a robust helper.
- [x] `apps/api/src/modules/org-admin/dto/update-collaborator-grants.dto.ts` -- Create DTO to validate grants payload (ensuring no platform capabilities). Ensure string elements have `@IsNotEmpty()`.
- [x] `apps/api/src/modules/org-admin/collaborator.service.ts` -- Implement `getCollaborator` and `updateCollaboratorGrants`, ensuring scope boundary validation (handling duplicate valid IDs correctly), access reduction detection (safely comparing JSON shapes), recent auth checks, and checking if the target member is active. Ensure the `evidence.create` is correctly formatted in the transaction.
- [x] `apps/api/src/modules/org-admin/collaborator.controller.ts` -- Add endpoints and protect them with `OrgAdminGuard`. Ensure safe typing and decoupled HTTP responses.
- [x] `apps/api/src/modules/org-admin/org-admin.module.ts` -- Register new controller and service.
- [x] Write unit tests for `collaborator.controller.ts`, `UpdateCollaboratorGrantsDto`'s constraints, and `collaborator.service.ts` covering validation, cross-org scopes, evidence creation, and recent auth.

**Acceptance Criteria:**
- Given I select a permission preset for a collaborator, when the preset is applied, then it resolves to a visible versioned list of explicit grants that I can adjust before saving, and the UI clearly separates profile, account state, explicit grants, scope assignments, and calculated effective access.
- Given I preview a permission change that reduces a collaborator's access, when the preview is displayed, then the UI highlights which capabilities and scopes will be removed.
- Given I submit a grant update, when the update is processed, then unknown, inactive, platform-only, or cross-Organization capabilities and scopes are rejected server-side, and Organization-level scope grants descend to Companies and their scopes; Company grants descend only to that Company's scopes; scope grants never ascend.
- Given a grant update that reduces a collaborator's access, when submitted without recent re-authentication, then the server requires re-authentication before committing.

## Spec Change Log
- Loop 1: Verification command `npm run test:e2e` is invalid as the harness does not exist. The reviewer subagents also caught several edge cases (string parsing of `session.createdAt`, duplicate scope validation rejection, missing active member check, weak evidence tests). We amended the tasks to enforce robust JSON parsing, use Sets for scope duplication validation, and strictly require unit tests for the controller and DTO instead of relying on nonexistent E2E tests. KEEP: The unit tests for the service edge cases (rejection of self-grants, cross-org scopes, recent auth, transaction safety) were excellent and must survive re-derivation.

## Design Notes

- **Effective Access Calculation**: The backend strictly validates that referenced scopes belong to the Organization. The interpretation of "descending" grants (Org -> Company -> Scope) can be handled by the Access Control logic during authorization, but for UI display, the API should return the raw explicit grants.
- **Recent Auth**: We need a way to verify the session's `createdAt` is within a recent window (e.g., 15 minutes). If the service detects an access reduction, it checks the session age and throws `RECENT_AUTH_REQUIRED` if stale.

## Verification

**Commands:**
- `npm run test` -- expected: All existing and new unit tests pass, comprehensively covering the service (including evidence creation), controller, and DTO constraints.

## Suggested Review Order

**API Entry Points & Validation**

- DTO strictly validates incoming explicit grants, enforcing unique arrays and rejecting platform capabilities.
  [`update-collaborator-grants.dto.ts:33`](../../apps/api/src/modules/org-admin/dto/update-collaborator-grants.dto.ts#L33)

- Controller exposes endpoints under OrgAdminGuard with decoupled HTTP responses and safe request typing.
  [`collaborator.controller.ts:21`](../../apps/api/src/modules/org-admin/collaborator.controller.ts#L21)

- Guard exposes request.session downstream for the dynamic recent-auth freshness check.
  [`org-admin.guard.ts:34`](../../apps/api/src/modules/access-control/guards/org-admin.guard.ts#L34)

**Core Business Logic & Cross-Org Isolation**

- Detects explicit access reductions to strictly conditionally require recent authentication.
  [`collaborator.service.ts:109`](../../apps/api/src/modules/org-admin/collaborator.service.ts#L109)

- Implements boundary validation for scopes using sets, ensuring active status and organizational boundaries.
  [`collaborator.service.ts:60`](../../apps/api/src/modules/org-admin/collaborator.service.ts#L60)

- Robustly calculates session age handling Date parsing safely, protecting against clock-skew negatives.
  [`recent-auth.guard.ts:23`](../../apps/api/src/modules/access-control/guards/recent-auth.guard.ts#L23)

**Tests & Infrastructure**

- Comprehensive controller edge cases handling safely typed auth contexts.
  [`collaborator.controller.spec.ts:31`](../../apps/api/src/modules/org-admin/collaborator.controller.spec.ts#L31)

- Service unit tests verify rejection of cross-org scopes and stale sessions correctly.
  [`collaborator.service.spec.ts:60`](../../apps/api/src/modules/org-admin/collaborator.service.spec.ts#L60)

