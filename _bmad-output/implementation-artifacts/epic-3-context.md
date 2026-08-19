# Epic 3 Context: Platform Administration & Organization Lifecycle

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic enables Platform Administrators to manage the lifecycle of customer Organizations—provisioning them, handling commercial statuses (`DEMO`, `PILOT`, `ACTIVE`), enabling an atomic initial-owner invitation flow that activates the Organization, and terminally disabling tenants. It ensures administrative operations occur strictly through evidenced, narrow interventions without granting general cross-tenant business data access or relying on database-level bypasses.

## Stories

- Story 3.1: Organization Provisioning & Platform Directory
- Story 3.2: Initial-Owner Invitation & Organization Activation
- Story 3.3: Commercial Status & Access Status Management
- Story 3.4: Terminal Disablement & Narrowly-Scoped Platform Interventions

## Requirements & Constraints

- Organizations are isolated through forced PostgreSQL Row-Level Security (RLS) on all tenant-owned tables; the server must derive the authoritative Organization, and no operation can allow cross-Organization data leakage.
- Lifecycle state transitions (provisioning, active, suspended, disabled) must be evidenced (actor, server time, reason, minimized before/after state) and concurrency-safe (atomic multi-record changes via row locking or optimistic versioning).
- Commercial status and access status are independent dimensions; updating one must never implicitly affect the other.
- The initial-owner invitation requires an email delivered via Resend using a server-side API key and an allowlisted transactional template, with the secret generated at ≥128 bits entropy, stored only as a hash, having a 7-day expiry, and constrained to single-use.
- Invitation acceptance atomically activates the Organization, sets the initial administrator membership, and consumes the invitation within a single transaction. Concurrent acceptance attempts must result in exactly one successful membership.
- Suspensions and terminal disablements require recent re-authentication and explicit confirmation. Suspending or disabling an Organization immediately invalidates all active sessions for its members and revokes access.
- Platform Administration UI should display a minimized directory that hides sensitive business and financial data.

## Technical Decisions

- The Platform Administration and Organization Administration boundaries must be explicitly maintained within the NestJS API; modules must own their controllers/services/repositories and not import internal services from other modules directly.
- The runtime identity has no `BYPASSRLS` privileges; platform interventions must occur through properly constrained, evidenced mechanisms rather than global access.
- The transactional email adapter must implement the outbox pattern when necessary to guarantee reliable delivery without duplicates.
- All sensitive transitions require explicit confirmation and must record stable, non-sensitive error states or outcomes for users.

## UX & Interaction Patterns

- Operations with destructive or broad access consequences (e.g., suspension, terminal disablement) must use a "consequence-first" UI pattern: explain the impact before presenting the final confirmation control.
- Unauthorized actions must be hidden from the UI, but this hiding is not the security mechanism; the server always enforces access decisions.
- The platform directory layout for administrators must remain minimized, ensuring only support-safe identity and lifecycle metadata are exposed.

## Continuity Decisions

- **Story 3.2**: The initial-owner invitation must be implemented as a separate endpoint `POST /platform/organizations/:id/owner-invitation` that takes an email address, keeping it decoupled from the organization provisioning endpoint implemented in Story 3.1.
