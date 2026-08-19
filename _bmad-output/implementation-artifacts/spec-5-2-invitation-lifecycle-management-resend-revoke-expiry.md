---
title: 'Story 5.2: Invitation Lifecycle Management (Resend, Revoke, Expiry)'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '935cd4488072044fa865508174a3c5b369db9839'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Organization Administrators currently cannot view pending invitations, correct mistakes by resending them, or revoke them to prevent unauthorized access.

**Approach:** Implement endpoints to list, resend, and revoke invitations for an Organization. Ensure that the system invalidates old tokens upon resending or revoking, and that expired or revoked tokens are rejected neutrally.

## Boundaries & Constraints

**Always:**
- Verify the actor is an active Administrator of the Organization.
- Exposing the invitation list must NEVER include raw tokens or hashes.
- Revoking an invitation must immediately invalidate the token.
- Resending an invitation must issue a new token with a fresh 7-day expiry and invalidate the old one.
- Expired/revoked token acceptances must fail atomically without creating memberships.

**Ask First:**
- If implementing listing requires complex pagination. (We can just use simple arrays or basic pagination).

**Never:**
- Do not expose \	okenHash\ or any secret material in the list endpoint.
- Do not allow resending/revoking already consumed invitations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List invitations | Admin requests list | Returns invitations (ID, email, state, role, expiresAt). No tokens. | N/A |
| Resend invitation | Valid pending invitation ID | Old token consumed, new invite created, email queued. | HTTP 404 if not found or consumed |
| Revoke invitation | Valid pending invitation ID | Invitation marked consumed/revoked. | HTTP 404 if not found or consumed |

</frozen-after-approval>

## Code Map

- \pps/api/src/common/constants.ts\ -- Add \RESEND_INVITATION\ and \REVOKE_INVITATION\ to \EvidenceActions\.
- \pps/api/src/modules/org-admin/collaborator-invitation.controller.ts\ -- Add \GET /\, \POST /:id/resend\, \POST /:id/revoke\ routes.
- \pps/api/src/modules/org-admin/collaborator-invitation.service.ts\ -- Implement logic for listing, resending, revoking. Ensure old tokens are invalidated (\consumedAt\).
- \pps/api/src/modules/auth/invitation.service.ts\ -- Verify that the existing acceptance logic already rejects expired/consumed tokens safely.

## Tasks & Acceptance

**Execution:**
- [x] \pps/api/src/common/constants.ts\ -- Add \RESEND_INVITATION\ and \REVOKE_INVITATION\ evidence actions.
- [x] \pps/api/src/modules/org-admin/collaborator-invitation.service.ts\ -- Add \listInvitations\, \esendInvitation\, and \evokeInvitation\ methods.
- [x] \pps/api/src/modules/org-admin/collaborator-invitation.controller.ts\ -- Add \GET /\, \POST /:invitationId/resend\, and \POST /:invitationId/revoke\ endpoints mapped to the new service methods.

**Acceptance Criteria:**
- Given an active invitation, when I resend it, then the previous secret is invalidated, a new secret and fresh 7-day expiry are issued, and only one active invitation remains for that email + Organization.
- Given an active invitation, when I revoke it, then the invitation is immediately invalidated and any subsequent acceptance attempt returns a neutral failure.
- Given an invitation that has passed its 7-day expiry, when acceptance is attempted using the original link, then \server_now >= expires_at\ is evaluated server-side and the attempt fails atomically with no membership created.
- Given I request the invitation list for my Organization, when the response is returned, then only invitations belonging to my Organization are shown with their current state - no tokens or hashes are exposed.

## Spec Change Log

## Design Notes

No complex design needed. Revocation and invalidation can simply be handled by setting \consumedAt\ to the current time, mimicking token consumption, to invalidate pending tokens.

## Verification

**Commands:**
- \
pm run test:e2e\ -- expected: All E2E tests, including new negative tests for invitation concurrency, expiry, and unauthorized access, pass.





## Suggested Review Order

**Invitation Lifecycle Management endpoints**

- Controller routing for list, resend, and revoke actions with standard OK statuses
  [collaborator-invitation.controller.ts:19](../../apps/api/src/modules/org-admin/collaborator-invitation.controller.ts#L19)

- Service implementation for listInvitations determining current state via computed logic
  [collaborator-invitation.service.ts:107](../../apps/api/src/modules/org-admin/collaborator-invitation.service.ts#L107)

- Service implementation for resendInvitation invaliding old tokens and generating new ones
  [collaborator-invitation.service.ts:123](../../apps/api/src/modules/org-admin/collaborator-invitation.service.ts#L123)

- Service implementation for revokeInvitation immediately expiring pending requests
  [collaborator-invitation.service.ts:189](../../apps/api/src/modules/org-admin/collaborator-invitation.service.ts#L189)

**Supporting Types & Tests**

- Constants addition mapping new lifecycle actions to organization evidence log records
  [constants.ts:10](../../apps/api/src/common/constants.ts#L10)

- Unit test verification covering list, resend, and revoke cases and mocking related services
  [collaborator-invitation.service.spec.ts:47](../../apps/api/src/modules/org-admin/collaborator-invitation.service.spec.ts#L47)

