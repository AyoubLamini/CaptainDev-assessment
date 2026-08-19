# Epic 5 Context: Collaborative Access Management

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic establishes safe and granular collaborative access management within an Organization. It enables Organization Administrators to manage the full collaborator lifecycle—invitations, profile assignments, explicit scope grants, suspensions, logical removals, and ownership transfers—ensuring that all permission changes take immediate effect server-side on open sessions and maintain strict tenant boundaries.

## Stories

- Story 5.1: Collaborator Invitation & Account Activation
- Story 5.2: Invitation Lifecycle Management (Resend, Revoke, Expiry)
- Story 5.3: Permission Presets & Explicit Grant Management
- Story 5.4: Suspension, Reactivation & Logical Removal
- Story 5.5: Administrator Promotion & Atomic Ownership Transfer

## Requirements & Constraints

- **Single Membership**: An identity has at most one Organization membership. Re-invitations reuse the existing record; invitations to addresses already active in another Organization fail neutrally.
- **Invitation Lifespan & Security**: Invitations use a single-use secret (≥128 bits entropy, hashed at rest), expire after 7 days (server time), and only one active invitation may exist per normalized email and Organization. Resending invalidates the prior token.
- **Acceptance Rules**: A new identity must set a compliant password atomically with acceptance. An existing identity must authenticate first, and its normalized email must match. Acceptance is atomic and concurrency-safe.
- **Explicit Grants**: Permission presets are editable starting points. Effective access is determined by explicit capability and scope grants. Organization grants descend to Companies and Business Scopes; Company grants descend only to their own scopes; scope-level grants never ascend. Unknown, inactive, platform-only, or cross-Organization capabilities fail closed.
- **Immediate Revocation**: Suspension, logical removal, or permission reduction must immediately revoke affected sessions server-side and block any stale in-flight mutations.
- **Reactivation & Removal**: Reactivation restores only currently valid grants without resurrecting previously revoked ones. Removal is purely logical to preserve attributable history.
- **Administrative Constraints**: An Organization must always retain exactly one active owner and at least one active Administrator. The current owner cannot be suspended or removed prior to a successful transfer.
- **Promotions & Ownership**: Promoting a User to Administrator requires recent authentication, a reason, and explicit confirmation. Ownership transfers require a proposal by the current owner and acceptance by another active Administrator. Acceptance must atomically verify proposer ownership, successor eligibility, proposal freshness, and cancellation inside a single transaction.

## Technical Decisions

- **Session Invalidation**: Tightly integrate access mutations with the session management layer to ensure immediate token revocation or rotation upon privilege reduction, suspension, or removal.
- **Transactional Email**: Use the established transactional email adapter with an allowlisted template for collaborator invitations. Apply an outbox or reliable dispatcher pattern to ensure invitations are delivered exactly once without losing committed records.
- **Concurrency Control**: Enforce explicit row locking or optimistic versioning during sensitive operations (e.g., invitation acceptance, ownership transfer) to prevent race conditions like duplicate acceptances or zero-administrator states.
- **Evidence Commits**: Sensitive administrative mutations (suspension, promotion, ownership changes) must commit atomic evidence records alongside the business state change.

## UX & Interaction Patterns

- **Separation of Concerns**: The UI must distinctly separate the user's profile (Administrator/User), account state, explicit grants, scope assignments, and the resulting calculated effective access.
- **Consequence-First Design**: For sensitive actions (reducing access, suspension, removal, promotion, ownership transfer), the UI must explicitly preview the consequences and require confirmation before submission.
- **Responsiveness & Accessibility**: The management interface, including the consequence-first suspension screen, must recompose gracefully down to 360 px viewport width without global horizontal scrolling, keeping all interactive controls accessible and preserving visible focus indicators.
- **State Communication**: Apply semantic status colors but always supplement meaning with text, iconography, or state labels. Show authoritative server outcomes (e.g., expired tokens, immediate access changes) using stable non-sensitive messages.

## Cross-Story Dependencies

- Relies on Epic 1's transactional email adapter for delivering invitation emails.
- Relies on Epic 2's session management foundation for immediate server-side session invalidation.
- Relies on Epic 4's Company and Business Scope entities to correctly associate and enforce explicit access grants.
