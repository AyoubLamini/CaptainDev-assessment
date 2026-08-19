---
title: 'Story 3.2: Initial-Owner Invitation & Organization Activation'
type: 'feature'
created: '2026-08-19'
status: 'in-progress'
review_loop_iteration: 1
baseline_revision: '372372a06eb1783fd8951b1355134f85f20ffd71'
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Platform Administrators can provision new Organizations, but there is no secure, evidence-backed mechanism to invite an initial owner, create their identity securely, and officially transition the Organization from PROVISIONING to ACTIVE.

**Approach:** Introduce an OrganizationInvitation model to securely store hashed invitation tokens and an OrganizationMember model to link users to Organizations. Implement a Platform Admin endpoint to generate a secure invitation and queue it for email delivery, and a public endpoint for users to accept the invitation, which atomically creates their identity, adds them as an administrator, and activates the Organization.

## Boundaries & Constraints

**Always:**
- Generate invitation secrets with at least 128 bits of entropy (e.g., 32 random bytes) and store only their cryptographic hashes (e.g., SHA-256) in the database.
- Set invitations to expire exactly 7 days from creation.
- Ensure the acceptance process (verifying token, consuming it, creating identity/membership, and activating the Organization) occurs within a single Serializable database transaction.
- Emit an Evidence record upon successful organization activation.
- Use the EmailOutbox for the initial-owner invitation email to guarantee reliable delivery.

**Block If:**

**Never:**
- Never store the plaintext invitation secret in the database or log it.
- Never allow an invitation to be consumed more than once (prevent race conditions via transaction).
- Never activate an Organization unless the initial membership is successfully created.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Platform Admin invites owner | POST /platform/organizations/:id/owner-invitation with valid email | 201 Created; generates token, saves hash and Outbox record | 400 Invalid email; 404 Org not found |
| User accepts invitation | POST /auth/invitations/accept with valid token & password | 200 OK; consumes invite, creates Identity, Member, activates Org | 400 Expired/Consumed/Invalid token; 409 Email in use |
| Concurrent acceptance | Two parallel requests to accept the same token | One request succeeds, the other fails | 400 Consumed token for the loser |

</intent-contract>

## Code Map

- apps/api/prisma/schema.prisma -- Needs OrganizationInvitation and OrganizationMember models. Update Organization and Identity with corresponding relations.
- apps/api/src/modules/platform-admin/dto/invite-owner.dto.ts -- New DTO for invitation email.
- apps/api/src/modules/auth/dto/accept-invitation.dto.ts -- New DTO for token and new password.
- apps/api/src/modules/platform-admin/platform-organizations.controller.ts -- Expose the invite endpoint.
- apps/api/src/modules/platform-admin/platform-organizations.service.ts -- Business logic for inviteInitialOwner.
- apps/api/src/modules/auth/invitation.controller.ts -- New controller for handling public invitation acceptance.
- apps/api/src/modules/auth/invitation.service.ts -- New service for token verification, consumption, and Identity creation.
- apps/api/src/modules/auth/auth.module.ts -- Register new controller and service.

## Tasks & Acceptance

**Execution:**
- apps/api/prisma/schema.prisma -- Add OrganizationInvitation (id, organizationId, email, tokenHash, expiresAt, consumedAt). Add OrganizationMember (id, organizationId, identityId, role). Add relation fields. Format and generate Prisma client. MUST add `@@unique([tokenHash])` or `@@index` to OrganizationInvitation for fast lookups.
- apps/api/src/modules/platform-admin/dto/invite-owner.dto.ts -- Create InviteOwnerDto requiring email. Add `@Transform(({ value }) => value?.toLowerCase().trim())` to email.
- apps/api/src/modules/auth/dto/accept-invitation.dto.ts -- Create AcceptInvitationDto requiring token and password. Add `@MaxLength(100)` to password to prevent DoS.
- apps/api/src/modules/platform-admin/platform-organizations.service.ts -- Implement inviteInitialOwner using crypto.randomBytes(32) to create a token, store its crypto.createHash('sha256'), and create an EmailOutbox record containing the plaintext token in the payload. Ensure transaction boundaries. MUST check that the organization's `accessStatus` is exactly `PROVISIONING` before generating the invitation, throwing `ConflictException` if not. Invalidate any prior pending invitations for this organization.
- apps/api/src/modules/platform-admin/platform-organizations.controller.ts -- Add POST /:id/owner-invitation bound to PlatformAdminGuard.
- apps/api/src/modules/auth/invitation.service.ts -- Implement acceptInvitation. MUST use `$transaction` with `isolationLevel: Prisma.TransactionIsolationLevel.Serializable` to guarantee concurrency protection. MUST perform `argon2.hash(dto.password)` OUTSIDE the database transaction to prevent holding connections. MUST verify the organization is in `PROVISIONING` state before activating it.
- apps/api/src/modules/auth/invitation.controller.ts -- Expose public POST /invitations/accept. Add to AuthModule. Add rate limiting if applicable, or ensure `@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))` is secure.
- apps/api/src/modules/auth/invitation.service.spec.ts -- Write test asserting atomicity and failure on expired/consumed tokens. MUST explicitly verify `findFirst` query parameters (`tokenHash`, `consumedAt`, `expiresAt`) are correct. MUST verify the `Serializable` isolation level is passed to the transaction, rather than creating a naive mock that returns `null` to bypass concurrency.
- apps/api/src/modules/auth/auth.module.ts -- Import `DatabaseModule` (or whatever provides PrismaService globally). Do NOT put `PrismaService` in the `providers` array directly.

**Acceptance Criteria:**
- Given a Platform Administrator, when they invite an initial owner, then the system generates a secure token hash, stores it, and creates an outbox email record with the plaintext token.
- Given a valid unconsumed invitation token, when accepted with a password, then the system atomically creates the user identity, assigns them to the Organization as an admin, activates the Organization, and consumes the token.
- Given a consumed or expired invitation token, when accepted, then the system rejects the request without modifying any state.

## Spec Change Log

### 2026-08-19 — Review Loopback 1

- **Triggering finding:** The implementation failed to configure the Prisma transaction with `Serializable` isolation level (direct deviation from intent), performed expensive `argon2.hash` inside the database transaction, failed to assert the organization state is `PROVISIONING` before sending invitations or activating, and missed essential index/unique constraints on the token hash.
- **Amended:** Added explicit database constraints, performance rules, state checks, and test-verification criteria into the `## Tasks & Acceptance` execution plan to prevent recurrence.
- **Known-bad state avoided:**
  - Using default `Read Committed` `$transaction` and relying on sequential code logic for concurrency protection.
  - Doing CPU-bound password hashing inside an open database transaction.
  - Blindly sending invitations or activating organizations regardless of their current `accessStatus`.
  - Creating `OrganizationInvitation` without an index on `tokenHash`.
  - Mocking transaction concurrency in tests instead of verifying the isolation level or correct parameters.
- **KEEP instructions:**
  - The `AcceptInvitationDto` and `InviteOwnerDto` schemas and structures are good, just add `@MaxLength` and transform for emails.
  - The Prisma schema relationships are correct. Keep the same model definitions but add the required indexes.
  - The Controller routes and REST shapes are correct.
  - Keep the `Evidence` action `ACTIVATE_ORGANIZATION`.

## Review Triage Log

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 14: (high 7, medium 7, low 0)
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` Missing Serializable isolation level for concurrency
  - `[high]` `[bad_spec]` argon2.hash inside transaction causes connection pool exhaustion
  - `[high]` `[bad_spec]` Unconditionally activating organization without checking PROVISIONING state
  - `[high]` `[bad_spec]` Sending invitation for non-PROVISIONING organization
  - `[high]` `[bad_spec]` Missing @MaxLength for password causes DoS risk
  - `[high]` `[bad_spec]` Missing plaintext token assertion in email outbox payload test
  - `[high]` `[bad_spec]` Missing coverage for "Organization not found" path
  - `[medium]` `[bad_spec]` Missing index/unique constraint on tokenHash
  - `[medium]` `[bad_spec]` AuthModule provides duplicate PrismaService instance
  - `[medium]` `[bad_spec]` Creating multiple active invitations without invalidating prior ones
  - `[medium]` `[bad_spec]` Missing whitelist: true on validation pipe
  - `[medium]` `[bad_spec]` Missing lowercase trim transformation for email input
  - `[medium]` `[bad_spec]` Mocking concurrency in test rather than checking transaction level
  - `[medium]` `[bad_spec]` Missing query argument validation for invitation token lookup

## Verification

**Commands:**
- npm run lint -- expected: Passes without errors.
- npm run build -- expected: API builds successfully.
- npm run test -- expected: Unit tests for invitation logic pass and ensure proper transaction use.
