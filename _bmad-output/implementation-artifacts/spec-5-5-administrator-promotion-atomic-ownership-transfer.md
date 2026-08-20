---
title: 'Story 5.5: Administrator Promotion & Atomic Ownership Transfer'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'ddfc2936abdaed994641a8e4791e81480be43708'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The system lacks safe, audited mechanisms for promoting standard users to administrators and transferring organization ownership. Without a strict, transactional two-step transfer process, ownership could be lost or inadvertently assigned to inactive/unwilling members.

**Approach:** Implement atomic collaborator promotion endpoints that require recent authentication and a provided reason. Introduce a two-step ownership transfer flow using a new `OwnershipTransferProposal` model, allowing the current owner to propose a transfer and a designated active Administrator to accept it within a single atomic transaction.

## Boundaries & Constraints

**Always:**
- Require recent re-authentication (`verifyRecentAuth`) when promoting a member or proposing/accepting an ownership transfer.
- Ensure the actor promoting a user is an active Administrator.
- Ensure only the current active `OWNER` can propose an ownership transfer.
- Ensure only the designated successor (who must be an active `ADMIN`) can accept the transfer.
- Acceptances must be atomic: verify proposer is still owner, successor is still active admin, proposal is not expired or cancelled, and swap roles (proposer becomes `ADMIN`, successor becomes `OWNER`), all within a single transaction.
- Commit atomic evidence records for promotions, proposals, and transfer acceptances.

**Ask First:**
- If the expiration duration for ownership transfer proposals needs to be different from a default of 7 days.

**Never:**
- Do not allow a user to promote themselves.
- Do not allow transferring ownership to a non-administrator or a suspended/removed member.
- Do not allow multiple active transfer proposals for the same organization at the same time.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Promote to Admin | Admin promotes User; recent auth valid | Role updated to `ADMIN`, evidence committed. | N/A |
| Promote to Admin (stale auth) | Admin promotes User; session older than threshold | Rejected. | 403 Forbidden |
| Propose Transfer | Owner proposes transfer to active Admin | Proposal created, evidence committed. | N/A |
| Propose Transfer (not owner) | Admin tries to propose transfer | Rejected. | 403 Forbidden |
| Accept Transfer | Designated Admin accepts valid proposal | Roles swapped, proposal consumed, evidence committed. | N/A |
| Accept Transfer (expired) | Designated Admin accepts expired proposal | Rejected. | 400 Bad Request |
| Accept Transfer (not designated) | Another Admin tries to accept | Rejected. | 403 Forbidden |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- Add `OwnershipTransferProposal` model with fields `id`, `organizationId`, `proposerId`, `successorId`, `status` (PENDING, ACCEPTED, CANCELLED, EXPIRED), `expiresAt`, `createdAt`, `updatedAt`. Add relation to `Organization` and `Identity`/`OrganizationMember`. **CRITICAL:** Ensure the `OwnershipTransferProposalStatus` enum is mapped with `@@map("ownership_transfer_proposal_status")` and the model with `@@map("ownership_transfer_proposal")`.
- `apps/api/src/common/constants.ts` -- Add `PROMOTE_COLLABORATOR`, `PROPOSE_OWNERSHIP_TRANSFER`, `ACCEPT_OWNERSHIP_TRANSFER`, `CANCEL_OWNERSHIP_TRANSFER` to `EvidenceActions`.
- `apps/api/src/modules/org-admin/dto/promote-collaborator.dto.ts` -- DTO for promotion containing `reason`.
- `apps/api/src/modules/org-admin/dto/propose-transfer.dto.ts` -- DTO for proposing ownership transfer containing `successorMemberId`.
- `apps/api/src/modules/org-admin/collaborator.controller.ts` -- Add `POST /organizations/:orgId/collaborators/:id/promote`. **CRITICAL:** Do NOT change the base `@Controller` path. For the ownership transfer endpoints (`POST /organizations/:orgId/ownership-transfer`, etc.), define them in this controller by explicitly overriding the route path in the decorator (e.g., `@Post('/organizations/:organizationId/ownership-transfer')`), OR create a new controller entirely. Do not break existing `collaborator` routes.
- `apps/api/src/modules/org-admin/collaborator.service.ts` -- Implement `promoteCollaborator` with recent auth check. Implement `proposeOwnershipTransfer`, `acceptOwnershipTransfer`, and `cancelOwnershipTransfer` ensuring transactional safety and constraints. **CRITICAL:** Always fetch dependent records *inside* the `$transaction` to prevent race conditions. When checking for existing active proposals, ensure you only look for `PENDING` proposals where `expiresAt > new Date()`. If a proposal is expired during `acceptOwnershipTransfer`, do NOT update it to `EXPIRED` and throw an error in the same transaction (it will rollback). Just throw the `BadRequestException` immediately. 

## Tasks & Acceptance

**Execution:**
- [ ] `apps/api/prisma/schema.prisma` -- Add `OwnershipTransferProposal` model with proper `@@map` directives.
- [ ] `apps/api/src/common/constants.ts` -- Add new actions to `EvidenceActions`.
- [ ] `apps/api/src/modules/org-admin/dto/promote-collaborator.dto.ts` -- Create DTO.
- [ ] `apps/api/src/modules/org-admin/dto/propose-transfer.dto.ts` -- Create DTO.
- [ ] `apps/api/src/modules/org-admin/collaborator.service.ts` -- Implement promotion and ownership transfer methods with robust validation, recent auth checks, and atomic transactions. Fetch all records inside the transaction. Ignore expired pending proposals when creating a new one.
- [ ] `apps/api/src/modules/org-admin/collaborator.controller.ts` -- Add corresponding endpoints using `OrgAdminGuard`, ensuring existing routes are not broken by changing the controller prefix.
- [ ] Write unit tests for new methods in `collaborator.service.ts` and `collaborator.controller.ts` covering role constraints, recent auth, atomicity, **and negative edge cases (e.g., self-promotion, stale auth, expired proposals, invalid roles)**. Include controller tests.

**Acceptance Criteria:**
- Given an active User, when an active Administrator promotes them with a reason and recent auth, then their role becomes `ADMIN` and an evidence record is logged.
- Given the active Owner, when they propose an ownership transfer to an active Admin, then a pending proposal is created.
- Given a pending proposal, when the designated successor accepts it with recent auth, then roles are swapped atomically and the proposal is consumed.
- Given a pending proposal, when a non-designated user tries to accept it, then the action is rejected.

## Spec Change Log
- Loop 1: The implementation modified the base controller path, breaking existing routes. It also introduced a transaction rollback bug by trying to save an `EXPIRED` status while simultaneously throwing an error in a Prisma transaction. Concurrency was flawed as records were fetched outside the transaction, and `PENDING` proposals were permanently blocking new ones if they expired. **Amended:** Explicitly mandated keeping the base `@Controller` path intact, fetching records *inside* the transaction, ignoring expired proposals in uniqueness checks, and not mixing state updates with thrown errors in the same transaction. Added missing negative test requirements to Tasks.
- Loop 2 (Review Patches): The second implementation properly resolved most issues but left minor code duplication, a race condition in `promoteCollaborator` (fetch outside tx), raw SQL instead of a Prisma migration, and missed tests for unauthorized acceptance and cancellation. These were triaged as patches and automatically fixed without further loopbacks.

## Deferred Work
- Missing Input Bounds: The `PromoteCollaboratorDto` and `ProposeTransferDto` classes lack safety boundaries (such as `@MaxLength()` for the `reason` field).
- Hardcoded Cancellation Reason: `cancelOwnershipTransfer` hardcodes the reason in the Evidence record rather than allowing the acting owner to supply a justification via a DTO payload.
- Data Leakage in Responses: The new controller endpoints return the raw Prisma data models, bypassing serialization.
- Missing API Documentation: The new endpoints lack standard NestJS OpenAPI/Swagger decorators.

## Verification

**Commands:**
- `npm run test` -- expected: All unit tests pass, especially validating constraints for ownership transfer and promotion.

## Suggested Review Order

**Schema & Core State**

- Defines OwnershipTransferProposal model and proposal status enum with relations.
  [schema.prisma:207](../../apps/api/prisma/schema.prisma#L207)

- Adds database-level RLS isolation for the new table and existing tables.
  [migration.sql:5](../../apps/api/prisma/migrations/20260819999999_add_ownership_transfer/migration.sql#L5)

**Business Logic: Ownership Transfer**

- Creates transfer proposal ensuring actor is current active owner.
  [collaborator.service.ts:510](../../apps/api/src/modules/org-admin/collaborator.service.ts#L510)

- Atomically accepts proposal, swaps roles, and verifies bounds.
  [collaborator.service.ts:583](../../apps/api/src/modules/org-admin/collaborator.service.ts#L583)

- Authorizes active owner to manually cancel an in-flight transfer.
  [collaborator.service.ts:660](../../apps/api/src/modules/org-admin/collaborator.service.ts#L660)

**Business Logic: Promotion**

- Promotes a standard user to administrator after verifying boundaries.
  [collaborator.service.ts:214](../../apps/api/src/modules/org-admin/collaborator.service.ts#L214)

**API Layer**

- Exposes atomic transfer routes under the new ownership-transfer path.
  [ownership-transfer.controller.ts:11](../../apps/api/src/modules/org-admin/ownership-transfer.controller.ts#L11)

- Extends existing collaborator controller with the promote endpoint safely.
  [collaborator.controller.ts:28](../../apps/api/src/modules/org-admin/collaborator.controller.ts#L28)

**Supporting Data & Tests**

- Extends Evidence action constants for promotion and transfer traceability.
  [constants.ts:16](../../apps/api/src/common/constants.ts#L16)

- Validates rejection of stale proposals and unauthorized accepts.
  [collaborator.service.spec.ts:335](../../apps/api/src/modules/org-admin/collaborator.service.spec.ts#L335)
