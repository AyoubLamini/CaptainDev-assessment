---
title: 'Story 5.4: Suspension, Reactivation & Logical Removal'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 1
baseline_commit: '8247f98b25210efa7d72c330d975a3c7eb4400aa'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Organization Administrators currently lack a way to temporarily suspend or logically remove active collaborators without resorting to workarounds like role hacking, and there is no guarantee that sessions are immediately revoked upon access termination.

**Approach:** Introduce a `status` field (`OrganizationMemberStatus` enum: `ACTIVE`, `SUSPENDED`, `REMOVED`) to the `OrganizationMember` schema. Expose a `PATCH /organizations/:orgId/collaborators/:id/status` endpoint to allow administrators to suspend, reactivate, or logically remove members. These actions will enforce organizational constraints (e.g., retaining at least one active owner), strictly require recent re-authentication for suspensions and removals, immediately invalidate affected sessions server-side, and commit atomic evidence records.

## Boundaries & Constraints

**Always:**
- Verify the actor is an active Administrator of the target Organization.
- Require recent re-authentication (e.g., via `verifyRecentAuth`) when suspending or removing a collaborator.
- Ensure that an Organization always retains exactly one active owner and at least one active Administrator. Prevent suspending or removing the current owner or the last active Administrator.
- Immediately revoke all sessions (delete from `Session` table) for the target `identityId` when they are suspended or removed.
- Commit atomic evidence (`SUSPEND_COLLABORATOR`, `REACTIVATE_COLLABORATOR`, `REMOVE_COLLABORATOR`) alongside the mutation within the same transaction.

**Ask First:**
- If determining the active owner or active administrators requires a complex recursive query instead of a simple count/find.

**Never:**
- Do not hard-delete `OrganizationMember` records; use the `REMOVED` status for logical removal.
- Do not allow a member to suspend or remove themselves.
- Do not allow state changes for members already in the `REMOVED` status.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Suspend active member | Admin sets status `SUSPENDED`; recent auth valid | Status updated, sessions revoked, evidence committed. | N/A |
| Suspend with stale auth | Admin sets status `SUSPENDED`; session older than threshold | Rejected. | 403 Forbidden |
| Suspend only owner | Admin attempts to suspend the only active owner | Rejected. | 400 Bad Request |
| Reactivate member | Admin sets status `ACTIVE` for `SUSPENDED` member | Status updated, evidence committed. | N/A |
| Remove member | Admin sets status `REMOVED` | Status updated, sessions revoked, evidence committed. | N/A |
| Self-suspension | Admin attempts to suspend themselves | Rejected. | 403 Forbidden |

</frozen-after-approval>

## Code Map

- `packages/database/prisma/schema.prisma` -- Add `enum OrganizationMemberStatus { ACTIVE SUSPENDED REMOVED }` and `status OrganizationMemberStatus @default(ACTIVE)` to `OrganizationMember`.
- `apps/api/src/common/constants.ts` -- Add `SUSPEND_COLLABORATOR`, `REACTIVATE_COLLABORATOR`, and `REMOVE_COLLABORATOR` to `EvidenceActions`.
- `apps/api/src/modules/org-admin/dto/update-collaborator-status.dto.ts` -- Create a DTO to validate the `status` enum payload.
- `apps/api/src/modules/access-control/guards/org-admin.guard.ts` -- UPDATE: Assert that the `membership.status` is `ACTIVE` to prevent suspended members from acquiring new sessions and bypassing the suspension.
- `apps/api/src/modules/org-admin/collaborator.controller.ts` -- Expose `PATCH /organizations/:orgId/collaborators/:id/status`.
- `apps/api/src/modules/org-admin/collaborator.service.ts` -- Implement `updateCollaboratorStatus`. Handle the logic for preventing self-modification, ensuring owner/admin constraints (NOTE: the roles in DB are `OWNER` and `ADMIN`, NOT `ADMINISTRATOR`), checking recent auth, updating status, invalidating sessions inline, and committing evidence. Also update existing endpoints to reject operations for suspended/removed members.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/database/prisma/schema.prisma` -- Add `OrganizationMemberStatus` enum and `status` field to `OrganizationMember`.
- [ ] `apps/api/src/common/constants.ts` -- Add new actions to `EvidenceActions`.
- [ ] `apps/api/src/modules/access-control/guards/org-admin.guard.ts` -- Update the guard to throw `ForbiddenException` if `membership.status !== 'ACTIVE'`.
- [ ] `apps/api/src/modules/org-admin/dto/update-collaborator-status.dto.ts` -- Create DTO for updating status.
- [ ] `apps/api/src/modules/org-admin/collaborator.service.ts` -- Implement `updateCollaboratorStatus` with boundary checks, session invalidation, and evidence creation in a transaction. Ensure `getCollaborator` and existing methods respect the new `status` field. Use correct role strings (`ADMIN` and `OWNER`).
- [ ] `apps/api/src/modules/org-admin/collaborator.controller.ts` -- Add endpoint for updating status, using `OrgAdminGuard` and injecting the session's `createdAt`.
- [ ] Write unit tests for `collaborator.controller.ts`, `collaborator.service.ts`, and `org-admin.guard.ts` covering recent auth, session revocation, and owner/admin count constraints.

**Acceptance Criteria:**
- Given an active collaborator, when an administrator suspends them, then their status is updated, their active sessions are immediately revoked, and an evidence record is committed.
- Given a suspended collaborator, when an administrator reactivates them, then their status is restored to active and an evidence record is committed.
- Given an active or suspended collaborator, when an administrator removes them, then their status becomes `REMOVED`, sessions are revoked, and they are preserved logically in the database.
- Given the current active owner or the last active administrator, when an administrator attempts to suspend or remove them, then the operation is rejected.
- Given a suspended member, when they attempt to access protected endpoints with a newly acquired session, then they are rejected by the guard.

## Spec Change Log
- Loop 1: The `OrgAdminGuard` was not checking member status, allowing a suspended member to just log in again and bypass the suspension. Also, the role strings for administrator checks were incorrect (`ADMINISTRATOR` instead of `ADMIN`), which silently bypassed the "last active admin" protection. We amended the Code Map and Tasks to explicitly update the guard and correct the role string. KEEP: The transaction structure, session revocation with `tx.session.deleteMany`, and evidence creation were correct and must survive re-derivation.

## Verification

**Commands:**
- `npm run test` -- expected: All existing and new unit tests pass, covering service logic (evidence creation, session revocation, constraints), controller, and DTO constraints.

## Suggested Review Order

**Schema & Core Types**

- Added MemberStatus enum for logical removal
  [`schema.prisma:24`](../../apps/api/prisma/schema.prisma#L24)

- Declared new audit log actions for suspension
  [`constants.ts:52`](../../apps/api/src/common/constants.ts#L52)

- Validate incoming status payloads strictly
  [`update-collaborator-status.dto.ts:5`](../../apps/api/src/modules/org-admin/dto/update-collaborator-status.dto.ts#L5)

**Access Control & Guards**

- Block suspended users from accessing organization routes
  [`org-admin.guard.ts:49`](../../apps/api/src/modules/access-control/guards/org-admin.guard.ts#L49)

- Correctly assert access for both owners and admins
  [`org-admin.guard.ts:45`](../../apps/api/src/modules/access-control/guards/org-admin.guard.ts#L45)

**Service Logic**

- Protect last active owner from suspension
  [`collaborator.service.ts:161`](../../apps/api/src/modules/org-admin/collaborator.service.ts#L161)

- Process status updates and clear sessions atomically
  [`collaborator.service.ts:175`](../../apps/api/src/modules/org-admin/collaborator.service.ts#L175)

- Reject queries for inactive or removed members
  [`collaborator.service.ts:31`](../../apps/api/src/modules/org-admin/collaborator.service.ts#L31)

**Endpoints**

- Expose atomic status mutations to admins
  [`collaborator.controller.ts:42`](../../apps/api/src/modules/org-admin/collaborator.controller.ts#L42)

**Tests**

- Verify exact constraints and session revocations
  [`collaborator.service.spec.ts:171`](../../apps/api/src/modules/org-admin/collaborator.service.spec.ts#L171)

- Ensure guard rejects suspended member sessions
  [`org-admin.guard.spec.ts:46`](../../apps/api/src/modules/access-control/guards/org-admin.guard.spec.ts#L46)
