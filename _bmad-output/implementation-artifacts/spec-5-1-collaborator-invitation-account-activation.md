---
title: 'Story 5.1: Collaborator Invitation & Account Activation'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c67b34bcc07d4910abb730a47c5aff233e3a2761'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Organization Administrators currently have no way to invite other people to join their Organization as collaborators, meaning they are the only ones who can access and manage it.

**Approach:** Build the collaborator invitation flow. This allows Organization Administrators to send invitations with an intended role and initial explicit grants. The recipient receives a single-use, 7-day email link to securely activate their account by setting a password (if new) or logging in (if existing), which atomically provisions their membership and access.

## Boundaries & Constraints

**Always:**
- Ensure the authenticated inviter is an active Administrator of the Organization.
- Invitations must use a single-use secret with ≥128 bits of entropy, stored as a hash.
- Expiration must be exactly 7 days from creation, checked against server time.
- Only one active invitation may exist per normalized email per Organization; resending invalidates the prior one.
- Acceptance must be atomic: password creation/verification, token consumption, and membership creation must occur in a single transaction.
- New identities must provide a password meeting the strict Argon2id and length/complexity requirements.
- Use the established transactional email adapter with the `collaborator-invitation` template.

**Ask First:**
- If implementing explicit capability/scope grant validation logic requires major changes to existing authorization middleware.
- If introducing new tables for explicit grants vs using JSON/JSONB on the member model.

**Never:**
- Do not grant access if the invitation is expired, already consumed, or if the token is unknown.
- Do not create cross-Organization links. If an email has a membership in another Organization, acceptance must fail neutrally.
- Do not store the invitation secret in plaintext or reversible encoding.
- Do not allow concurrent acceptances of the same invitation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Send invitation to new email | Admin sends invite to `new@example.com` | Token generated, hashed, saved. Email queued via outbox. | HTTP 201 Created |
| Send invitation to existing member | Admin sends invite to existing member | Neutral success response (to prevent enumeration), but no email sent. | HTTP 201 Created |
| Resend invitation | Admin sends invite to pending email | Old token invalidated/deleted, new token generated and email queued. | HTTP 201 Created |
| Accept invite (new user) | Valid token, new password | Identity created, password hashed, member created with role/grants. | HTTP 200 OK |
| Accept invite (existing user) | Valid token, valid login | Authenticated, member created with role/grants. | HTTP 200 OK |
| Accept invite (expired) | Expired token | Neutral failure message. No member created. | HTTP 400 Bad Request |
| Accept invite (wrong email) | Existing user with wrong email | Neutral failure message. No member created. | HTTP 400 Bad Request |
| Concurrent acceptance | Two requests with same token | First succeeds, second gets a neutral failure. | HTTP 400 Bad Request |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- Need to update `OrganizationInvitation` to store `role` (String) and `grants` (Json). Update `OrganizationMember` to store `grants` (Json) if explicit grants aren't fully modeled yet.
- `apps/api/src/modules/org-admin/collaborator-invitation.controller.ts` -- New controller for sending and managing collaborator invitations.
- `apps/api/src/modules/org-admin/collaborator-invitation.service.ts` -- Service logic for sending, resending, and validating invitations. Uses `EmailService`.
- `apps/api/src/modules/auth/invitation.controller.ts` -- Existing controller handling initial-owner invitations. Add endpoints for collaborator invitation acceptance.
- `apps/api/src/modules/auth/invitation.service.ts` -- Update logic to handle collaborator invitation acceptance (creating identity if new, setting password, creating member with role/grants).

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma` -- Add `role` and `grants` columns to `OrganizationInvitation` and `OrganizationMember`. Create migration.
- [x] `apps/api/src/modules/org-admin/collaborator-invitation.controller.ts` -- Implement POST endpoint to invite a collaborator.
- [x] `apps/api/src/modules/org-admin/collaborator-invitation.service.ts` -- Implement logic to securely generate token, hash it, store it, and queue the email. Handle resend logic (invalidation of old tokens).
- [x] `apps/api/src/modules/auth/invitation.controller.ts` -- Implement POST endpoint for collaborator acceptance.
- [x] `apps/api/src/modules/auth/invitation.service.ts` -- Implement atomic acceptance logic (validate token, check expiration, create/verify identity, hash password, create member, consume token).

**Acceptance Criteria:**
- Given an Admin submits a collaborator invitation, when processed, then a hashed token is stored, an email is queued via the outbox, and only one active invitation exists for that email.
- Given a valid invitation link for a new user, when they submit a compliant password, then their identity is created, password hashed, member created with grants, and they can log in.
- Given a valid invitation link for an existing user, when they authenticate and accept, then their member record is created with grants if their email matches.
- Given an email that already has an active membership in another Organization, when acceptance is attempted, then it fails neutrally without cross-linking.

## Spec Change Log

## Verification

**Commands:**
- `npm run test:e2e` -- expected: All E2E tests, including new negative tests for invitation concurrency, expiry, and unauthorized access, pass.
- `npx prisma migrate dev` -- expected: Schema changes apply successfully to the database.

## Suggested Review Order

**Database Schema**

- Added role and grants to OrganizationInvitation and OrganizationMember
  [`schema.prisma:172`](../../apps/api/prisma/schema.prisma#L172)

**Invitation Creation**

- New service queuing the invitation email and invalidating pending tokens
  [`collaborator-invitation.service.ts:13`](../../apps/api/src/modules/org-admin/collaborator-invitation.service.ts#L13)

- New controller endpoint to send collaborator invitations
  [`collaborator-invitation.controller.ts:10`](../../apps/api/src/modules/org-admin/collaborator-invitation.controller.ts#L10)

- DTO defining the invitation payload
  [`invite-collaborator.dto.ts:3`](../../apps/api/src/modules/org-admin/dto/invite-collaborator.dto.ts#L3)

**Invitation Acceptance**

- The core acceptance logic: hashing, member creation, and token consumption
  [`invitation.service.ts:98`](../../apps/api/src/modules/auth/invitation.service.ts#L98)

- New endpoint to accept the collaborator invitation
  [`invitation.controller.ts:14`](../../apps/api/src/modules/auth/invitation.controller.ts#L14)

**Peripherals**

- Added new evidence action constants
  [`constants.ts:7`](../../apps/api/src/common/constants.ts#L7)

- Registered new controllers and services
  [`org-admin.module.ts:16`](../../apps/api/src/modules/org-admin/org-admin.module.ts#L16)
