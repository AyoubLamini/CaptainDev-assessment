---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - docs/product/PRODUCT-REQUIREMENTS.md
  - docs/architecture/ARCHITECTURE.md
  - docs/architecture/SECURITY-INVARIANTS.md
  - ASSESSMENT.md
  - docs/ux/README.md
---

# CaptainDevAssessment - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CaptainDevAssessment, decomposing the requirements from the PRD, UX Design references, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-001: NOVA is a web SaaS with authoritative server-side persistence. Saved data survives an authorized logout/login and another browser session.
FR-002: Every API, row, relation, search, cache key, file, job, export, evidence item, and generated output is isolated by Organization and effective access. The server derives the authoritative Organization.
FR-003: NOVA provides first-party email/password authentication and server-side least privilege. Authentication establishes an internal identity; authorization then uses only the two Organization profiles plus explicit capabilities and scopes. UI hiding is never authorization.
FR-004: A Platform Administrator can create, inspect, activate, suspend, reactivate, and terminally disable an Organization through evidenced lifecycle transitions.
FR-005: A Platform Administrator may perform narrow, reasoned user interventions inside one selected Organization without gaining general access to its business data.
FR-006: Commercial status (DEMO, PILOT, ACTIVE) and access status are independent, visible, concurrency-safe dimensions.
FR-009: One Organization owns one or more Companies, each with Business Scopes. A customer identity belongs to one Organization and can access only explicitly authorized Companies and scopes.
FR-026: Critical web journeys work from 360 px upward across mobile, tablet, and desktop without a native application or global horizontal scrolling.
FR-089: An Organization Administrator manages invitation, explicit permissions/scopes, suspension, reactivation, logical removal, Administrator promotion, and atomic ownership transfer without granting platform capabilities.
FR-096: A Business Scope retains Company, type, name, optional external identifier, relevant location, operational status, responsible person, and sector-specific counterpart when applicable. Counts are derived; provenance is server-generated.
FR-114: Portfolio and Company/scope surfaces search by authorized Organization, Company, scope name, or identifier and preserve unambiguous selected context without leaking inaccessible results or counts.
FR-115: Business Scope creation is a numbered guided flow with duplicate detection before persistence, backward correction, final Organization/Company review, and explicit confirmation.
FR-116: Permission presets are editable starting points; UI separates profile, state, explicit grants, scope assignments, and calculated effective access and previews sensitive access changes.

### NonFunctional Requirements

NFR-001: Zero cross-Organization leakage is tolerated across every protected read, write, relation, search, cache, job, file, export, evidence item, AI request, and administration path.
NFR-002: First-party authentication, password verification, server-side sessions, authorization, least privilege, recent-auth checks, throttling, and invalidation are server-enforced and fail closed.
NFR-003: Production-style traffic uses TLS; no secret, credential, invitation token, or real customer data is committed, documented, or logged.
NFR-005: Development and test use isolated configuration and synthetic non-sensitive data; no production access is required.
NFR-006: Errors, important transitions, latency, and availability produce structured, minimized, timestamped, correlation-friendly operational signals.
NFR-010: Support current Chrome, Edge, Firefox, and Safari behavior across 360–767, 768–1199, and 1200+ px families without global horizontal scrolling.
NFR-011: Critical journeys are keyboard-usable with visible focus, clear labels/errors, non-color-only meaning, and text/table alternatives for important charts. Aim for WCAG 2.2 AA behavior without claiming certification.
NFR-015: Delivery includes essential technical documentation, repeatable setup/migration/deployment procedures, final verification, and correction of blocking defects.
NFR-017: Canonical domain data is independent of manual, import, or future connector channels; provider-specific behavior remains inside adapters and no real connector is required.
NFR-018: Required invitation and password-reset emails are sent through Resend using a server-side API key, a verified sender, and allowlisted versioned templates; automated tests remain deterministic through the same outbound port.

### Additional Requirements

- Stack: strict TypeScript, Next.js (web), NestJS (API), PostgreSQL + Prisma, Resend — no starter template; greenfield monorepo.
- Module boundaries must be explicit: Identity & Auth, Platform Administration, Organization Administration, Access Control, Transactional Email, Evidence.
- Forced PostgreSQL Row-Level Security (RLS) on all tenant-owned tables; runtime identity has no BYPASSRLS or table ownership.
- Composite Organization-aware foreign keys for all tenant parent-child relationships (SEC-04).
- Argon2id password hashing (m≥19456 KiB, t=2, p=1); passwords ≥15 Unicode characters, ≤64 allowed, no composition rule, checked against weak-password blocklist.
- Session identifiers: ≥128 bits entropy, stored as hashes server-side, carried only in `__Host-` cookie (Secure, HttpOnly, SameSite=Strict, Path=/); rotate on login/password-change/reset/elevation; revoke on logout/expiry/reset/suspension/removal.
- CSRF protection on all unsafe cookie-authenticated requests.
- Invitation secrets: ≥128 bits entropy, stored as hash, single-use, 7-day expiry, revocable, atomic acceptance.
- Password-reset tokens: high-entropy, single-use, 30-minute expiry, stored as hash, atomic invalidation on use.
- Three required Resend transactional email templates: initial-owner invitation, collaborator invitation, password reset. Adapter accepts only allowlisted templates, validates schema, rejects arbitrary senders/markup/origins.
- Login/invitation/recovery responses are neutral (no identity enumeration) and throttled by account + source.
- Platform Administrator bootstrap via secure one-time mechanism (not public registration).
- All sensitive transitions require recent authentication, reason, explicit confirmation, server time, actor, and minimized before/after evidence.
- Atomic multi-record lifecycle changes; concurrency handled with row locking or optimistic versioning.
- Outbox pattern required when needed to guarantee email delivery without duplicates.
- Deterministic synthetic seed fixtures for at least 2 Organizations.
- CI pipeline: linting, strict type checking, unit tests, integration tests, E2E tests, production build.
- Executable negative isolation tests covering the full list in SECURITY-INVARIANTS.md and ASSESSMENT.md.
- SUBMISSION.md with module boundaries, deviations, trade-offs, limitations, and Loom link.
- Loom video (≤10 min): running platform, real invitation email receipt, account activation, invitation replay refusal, real password-reset email, completion of reset journey.

### UX Design Requirements

UX-DR1: Apply a dark application shell with semantic status colors (green/amber/red); meanings must also be conveyed through text, iconography, or state labels — never color alone.
UX-DR2: Always show explicit current Organization, Company, and Business Scope context in the UI; never allow ambiguous or implicit tenant context.
UX-DR3: Unauthorized actions must be hidden from the UI — but UI hiding is never the authorization mechanism; server enforces all access decisions.
UX-DR4: Consequence-first UX for sensitive actions (suspension, removal, promotion, ownership transfer): explain consequences before confirmation, require explicit confirmation.
UX-DR5: Show authoritative server outcomes for all mutations, including conflict states (duplicate detection), access-changed states, and error states with stable non-sensitive codes.
UX-DR6: Minimized Organization directory/detail layout for Platform Administration (ref: platform-organization-directory-reference.png).
UX-DR7: Company/scope hierarchy with search, selection, and administration UI; server-side search/filter revealing only authorized records (ref: companies-and-scopes-desktop.png).
UX-DR8: Guided Business Scope creation with context confirmation, duplicate-aware review, and backward correction (ref: create-business-scope-desktop.png).
UX-DR9: Collaborator management UI: states (pending/active/suspended/removed), permission presets, explicit grants, scope assignments, effective access preview, and sensitive-action confirmations (ref: users-and-permissions-desktop.png).
UX-DR10: Consequence-first mobile suspension confirmation screen; responsive recomposition from 360 px without removing functionality (ref: user-suspension-mobile-reference.png).
UX-DR11: Responsive layout adapts across 360–767 px (mobile), 768–1199 px (tablet), 1200+ px (desktop) without global horizontal scrolling.
UX-DR12: All critical journeys keyboard-usable with visible focus indicators, clear labels and error messages; text/label alternatives for status icons and state indicators.

### FR Coverage Map

| FR | Epic | Notes |
|---|---|---|
| FR-001 | Epic 1 + Epic 2 | Schema/persistence in Epic 1; session persistence in Epic 2 |
| FR-002 | Epic 1 + Epic 3 | RLS schema in Epic 1; Org-level enforcement validated in Epic 3 |
| FR-003 | Epic 2 | First-party auth, least privilege |
| FR-004 | Epic 3 | Full Organization lifecycle management |
| FR-005 | Epic 3 | Narrow evidenced user interventions |
| FR-006 | Epic 3 | Independent commercial + access status |
| FR-009 | Epic 4 | Company/Scope structure, single-Org membership |
| FR-026 | Epics 2–5 | Responsive UI applied in every epic |
| FR-089 | Epic 5 | Full collaborator lifecycle |
| FR-096 | Epic 4 | Business Scope data model |
| FR-114 | Epic 4 | Authorized-only server-side search |
| FR-115 | Epic 4 | Guided, duplicate-aware Scope creation |
| FR-116 | Epic 5 | Editable presets → explicit grants |
| All NFRs | Epic 1 | Invariants established in foundation; enforced throughout |

## Epic List

### Epic 1: Project Foundation & Verified CI Pipeline
A developer can clone the repo, run a single setup sequence, apply migrations, seed synthetic data for two Organizations, and get all tests green in CI — with the monorepo skeleton, module boundaries, forced PostgreSQL RLS, transactional email adapter, and test harness in place.
**FRs covered:** FR-001, FR-002 (schema/RLS skeleton), NFR-003, NFR-005, NFR-006, NFR-015, NFR-017, NFR-018 (adapter layer)

### Epic 2: Secure Authentication & Session Management
A Platform Administrator can log in with a bootstrapped account, receive a persistent server-side session, and complete a neutral password-reset flow — with every blocking auth security invariant in place (Argon2id hashing, `__Host-` session cookie, CSRF protection, login throttling, session rotation on sensitive events).
**FRs covered:** FR-001, FR-003, FR-026, NFR-001, NFR-002, NFR-010, NFR-011

### Epic 3: Platform Administration & Organization Lifecycle
A Platform Administrator can provision Organizations, send initial-owner invitations that atomically activate the Organization on acceptance, manage commercial and access status independently, inspect the minimized platform directory, perform narrowly-scoped evidenced user interventions, and terminally disable an Organization — all without a tenant bypass.
**FRs covered:** FR-002, FR-004, FR-005, FR-006, NFR-018 (initial-owner invitation email)

### Epic 4: Organization Structure — Companies & Business Scopes
An Organization Administrator can create, edit, and deactivate Companies (blocked while active scopes exist), create Business Scopes through the numbered guided flow with duplicate detection and final review, and search across their authorized Companies and Scopes without leaking other Organizations' data.
**FRs covered:** FR-009, FR-026, FR-096, FR-114, FR-115

### Epic 5: Collaborative Access Management
An Organization Administrator can invite collaborators using permission presets that resolve to explicit grants, manage their full lifecycle (accept, resend, revoke, suspend, reactivate, remove), promote an active User to Administrator, and propose/accept an atomic ownership transfer — with every access change taking immediate server-side effect on open sessions.
**FRs covered:** FR-026, FR-089, FR-116, NFR-018 (collaborator invitation email)

---

## Epic 1: Project Foundation & Verified CI Pipeline

A developer can clone, configure, migrate, seed, and run all tests with documented commands — with the monorepo skeleton, module boundaries, forced PostgreSQL RLS, transactional email adapter, and test harness in place.

### Story 1.1: Monorepo Skeleton with Module Boundaries

As a developer,
I want a runnable monorepo with a NestJS API, a Next.js web app, shared packages, and strict TypeScript configured throughout,
So that the project has a consistent foundation with explicit module boundaries that prevent unauthorized cross-cutting access.

**Acceptance Criteria:**

**Given** a clean clone of the repository
**When** I run the documented bootstrap command
**Then** the NestJS API starts without errors and returns a health check response
**And** the Next.js web app builds and serves successfully

**Given** the monorepo structure
**When** I inspect the API module layout
**Then** I can identify distinct modules for: Identity/Auth, Platform Administration, Organization Administration, Access Control, Transactional Email, and Evidence
**And** each module owns its own controllers, services, and repositories without importing another module's internal services directly

**Given** strict TypeScript is configured
**When** I introduce a type error in any workspace package
**Then** `tsc --noEmit` fails and reports the error with zero suppressed warnings

### Story 1.2: Database Schema, Migrations & Forced PostgreSQL RLS

As a developer,
I want a Prisma schema covering all required entities with reviewed SQL migrations that enforce PostgreSQL Row-Level Security on every tenant-owned table,
So that tenant isolation is guaranteed at the database layer and cannot be bypassed by application bugs.

**Acceptance Criteria:**

**Given** a fresh PostgreSQL instance
**When** I run the documented migration command
**Then** all tables are created with correct columns, nullable constraints, and foreign key relations
**And** every tenant-owned table has RLS enabled and forced (`ALTER TABLE … ENABLE ROW LEVEL SECURITY; ALTER TABLE … FORCE ROW LEVEL SECURITY`)
**And** the runtime database role has no `BYPASSRLS` attribute and does not own protected tables

**Given** a transaction-local tenant context is set (e.g. `SET LOCAL app.current_org_id = ?`)
**When** a query runs against a tenant-owned table without setting the tenant context first
**Then** the query returns zero rows, demonstrating fail-closed RLS behavior

**Given** a child row insert is attempted with a parent `organization_id` from a different Organization
**When** the insert executes
**Then** the database rejects it at the constraint level (composite Organization-aware FK or equivalent)

**Given** the test suite
**When** a new tenant-owned table is added without an RLS policy
**Then** a designated classification test fails explicitly

### Story 1.3: Transactional Email Adapter

As a developer,
I want a server-side transactional email adapter that uses Resend in production and a deterministic recording adapter in tests, accepting only allowlisted versioned templates,
So that email delivery is reliable, no real emails are sent during CI, and the adapter cannot be used to send arbitrary content.

**Acceptance Criteria:**

**Given** the email adapter is called with an allowlisted template ID and schema-validated variables
**When** in production mode
**Then** the adapter sends via Resend using the configured server-side API key and verified sender domain
**And** it persists a delivery record with a stable idempotency key to the outbox table

**Given** the email adapter is called with an allowlisted template ID
**When** in test/CI mode
**Then** the deterministic adapter records the rendered payload without sending any external request
**And** tests can assert on recipient, template ID, and interpolated variables

**Given** the adapter receives an unknown template ID, an arbitrary sender, untrusted link origin, or unvalidated markup
**When** the call is processed
**Then** the adapter rejects with a typed error before any delivery attempt

**Given** the adapter is retried for a previously delivered idempotency key
**When** the retry executes
**Then** no duplicate delivery occurs and the existing delivery record is returned

### Story 1.4: CI Pipeline, Test Harness & Synthetic Seed Data

As a developer,
I want a CI pipeline that runs linting, strict type checks, unit tests, integration tests against a real PostgreSQL instance, E2E tests, and a production build — plus deterministic synthetic seed data for two isolated Organizations,
So that every commit is automatically verified and the project can be validated from a clean clone.

**Acceptance Criteria:**

**Given** a push to the main branch
**When** CI runs
**Then** it executes in sequence: lint → type check → unit tests → integration tests → E2E tests → production build
**And** any single failure causes the pipeline to report failure

**Given** the integration test suite
**When** run against a real PostgreSQL instance
**Then** negative cross-Organization tests pass: read, write, search, and count across two Organizations return no cross-tenant data
**And** a reused pool connection with alternating tenant contexts produces no leakage

**Given** the seed command is run
**When** applied to a clean database
**Then** exactly two Organizations are created with distinct owners, companies, scopes, and memberships using synthetic non-sensitive data
**And** re-running the seed is idempotent

**Given** the root README
**When** a reviewer follows the documented commands in order (bootstrap → migrate → seed → start → test → build)
**Then** each step completes without undocumented prerequisites or manual intervention

---

## Epic 2: Secure Authentication & Session Management

A Platform Administrator can log in with a bootstrapped account, receive a persistent server-side session, and complete a neutral password-reset flow — with every blocking auth security invariant in place.

### Story 2.1: Platform Administrator Secure Bootstrap

As a Platform Administrator,
I want to be created through a secure one-time server-side bootstrap mechanism,
So that the platform has exactly one initial trusted operator identity without exposing a public registration endpoint.

**Acceptance Criteria:**

**Given** a clean database with no Platform Administrator
**When** I run the documented bootstrap command with a compliant password
**Then** exactly one Platform Administrator identity is created with an Argon2id-hashed credential (m≥19456 KiB, t=2, p=1, unique library-generated salt)
**And** re-running bootstrap on an already-bootstrapped database is a no-op or returns a clear error without creating a duplicate

**Given** the application is running
**When** I attempt to reach a login endpoint without any bootstrap having run
**Then** the response is a neutral failure with no stack trace or identity disclosure

**Given** the bootstrap creates a Platform Administrator
**When** I inspect the stored credential
**Then** the password is stored only as an Argon2id hash — no plaintext, no reversible encoding, no SHA-family hash is present

### Story 2.2: Email/Password Login & Server-Side Session

As a Platform Administrator,
I want to log in with my email and password and receive a persistent server-side session,
So that I can authenticate once and continue working across page navigations and browser restarts.

**Acceptance Criteria:**

**Given** valid credentials
**When** I submit the login form
**Then** the server creates a session, stores only its hash server-side, and sets a `__Host-` cookie with `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`
**And** the session identifier is never written to `localStorage`, `sessionStorage`, or any browser-accessible storage

**Given** an active session
**When** I close and reopen the browser and revisit the app
**Then** the session is still valid and I remain authenticated

**Given** I log out
**When** the logout request completes
**Then** the session is revoked server-side and the cookie is cleared
**And** reusing the old session cookie returns a 401

**Given** incorrect credentials are submitted
**When** the login form is processed
**Then** the response is neutral (does not reveal whether the email exists, is disabled, or is locked)
**And** repeated failed attempts trigger progressive delay throttling by account and by source IP without enabling permanent denial of service

### Story 2.3: CSRF Protection & Session Rotation

As a Platform Administrator,
I want all state-changing requests to require a CSRF proof in addition to the session cookie, and my session to rotate after sensitive events,
So that forged cross-site requests are rejected and compromised session tokens cannot be replayed after privilege changes.

**Acceptance Criteria:**

**Given** an authenticated session
**When** I submit a POST/PUT/PATCH/DELETE request without the required CSRF proof
**Then** the server returns 403 and the action is not executed

**Given** an authenticated session
**When** I submit a state-changing request with the correct CSRF proof
**Then** the request is processed normally

**Given** a login, password change, or privilege elevation event
**When** the event completes
**Then** the session token is rotated (new identifier issued, old one invalidated server-side)

**Given** a session that has exceeded its expiry duration
**When** any authenticated request is made
**Then** the server refuses the request and the cookie is cleared

### Story 2.4: Neutral Password Reset Flow

As any authenticated identity,
I want to request a password reset and complete it via a single-use link delivered by email,
So that I can regain access without disclosing whether my account exists to an observer.

**Acceptance Criteria:**

**Given** a password-reset request for any email address
**When** the request is submitted
**Then** the HTTP response is identical regardless of whether the email is registered, unregistered, or suspended
**And** if the email belongs to a registered identity, a reset token (≥128 bits entropy, stored only as hash, 30-minute expiry) is created and delivered via the transactional email adapter

**Given** a valid unused reset token within its expiry window
**When** I submit a compliant new password (≥15 Unicode characters, not on the weak-password blocklist)
**Then** the password is updated with a new Argon2id hash, all existing sessions for that identity are revoked immediately, and the token is consumed

**Given** an expired, already-used, or unknown reset token
**When** I attempt to complete the reset
**Then** the response is a neutral failure and no password change occurs

**Given** a completed password reset
**When** the former session cookie is presented
**Then** the server returns 401

---

## Epic 3: Platform Administration & Organization Lifecycle

A Platform Administrator can provision Organizations, send initial-owner invitations that atomically activate the Organization on acceptance, manage commercial and access status independently, inspect the minimized platform directory, perform narrowly-scoped evidenced user interventions, and terminally disable an Organization — without a tenant bypass.

### Story 3.1: Organization Provisioning & Platform Directory

As a Platform Administrator,
I want to create an Organization in `PROVISIONING` state and view a paginated platform directory of Organizations with minimized metadata,
So that I can set up new customer tenants and monitor the platform without accessing their business data.

**Acceptance Criteria:**

**Given** I am authenticated as a Platform Administrator
**When** I submit a valid Organization creation request
**Then** the Organization is created in `PROVISIONING` state with no customer access granted
**And** the response contains only support-safe identity and lifecycle metadata

**Given** the platform directory is requested
**When** the response is returned
**Then** it is server-paginated and exposes only: Organization ID, name, lifecycle state, commercial status, owner contact email, and synchronization metadata
**And** no business data, financial data, or cross-Organization details are included

**Given** I am not authenticated as a Platform Administrator
**When** I call any platform directory or provisioning endpoint
**Then** the server returns a neutral 401/403 with no data leakage

### Story 3.2: Initial-Owner Invitation & Organization Activation

As a Platform Administrator,
I want to send an initial-owner invitation to an email address for a provisioned Organization,
So that the invited person can atomically create their Administrator account and activate the Organization in one step.

**Acceptance Criteria:**

**Given** a `PROVISIONING` Organization and a target email
**When** I send the initial-owner invitation
**Then** an invitation record is created with a secret of ≥128 bits entropy stored only as a hash, a 7-day server-time expiry, and a single-use constraint
**And** the invitation email is delivered via the allowlisted transactional template with only minimum identity and action context

**Given** a valid unused invitation link is followed
**When** the recipient sets a compliant password and submits acceptance
**Then** the owner Administrator membership is created atomically, the Organization transitions to `ACTIVE`, and the invitation is consumed — all in one transaction
**And** the Organization now has exactly one active owner and at least one active Administrator

**Given** an expired, already-consumed, or unknown invitation token
**When** acceptance is attempted
**Then** the response is a neutral failure, no membership is created, and the Organization state is unchanged

**Given** two concurrent acceptance requests for the same invitation
**When** both are processed simultaneously
**Then** exactly one membership and one activation occur; the second attempt receives a neutral failure

### Story 3.3: Commercial Status & Access Status Management

As a Platform Administrator,
I want to manage an Organization's commercial status (`DEMO`, `PILOT`, `ACTIVE`) and access status independently,
So that commercial changes never implicitly affect operational access and vice versa.

**Acceptance Criteria:**

**Given** an `ACTIVE` Organization
**When** I change its commercial status to `DEMO`
**Then** the commercial status is updated with committed evidence (actor, server time, reason, before/after)
**And** the access status remains unchanged

**Given** an `ACTIVE` Organization
**When** I suspend it with a required reason and after recent re-authentication
**Then** the access status transitions to `SUSPENDED`, all active sessions for that Organization's members are invalidated immediately, and evidence commits atomically with the suspension
**And** the commercial status remains unchanged

**Given** a `SUSPENDED` Organization
**When** I reactivate it
**Then** the access status returns to `ACTIVE` and only currently valid access is restored (no previously revoked grants are resurrected)

**Given** a status-change request submitted without a reason or without passing the recent-authentication check
**When** it is processed
**Then** the server rejects it before committing any change

### Story 3.4: Terminal Disablement & Narrowly-Scoped Platform Interventions

As a Platform Administrator,
I want to terminally disable an Organization and perform narrowly-scoped, reasoned, evidenced user interventions within one Organization,
So that end-of-life tenants are safely closed and I can assist a specific Organization's users without gaining general business-data access.

**Acceptance Criteria:**

**Given** an Organization in any lifecycle state
**When** I submit a terminal disablement with a required reason and explicit confirmation
**Then** the Organization transitions to `DISABLED`, all access is immediately revoked, and evidence is committed atomically — with no reactivation path

**Given** I initiate a platform intervention scoped to one Organization
**When** the intervention is processed
**Then** it operates only within that single Organization's boundary and does not grant access to any other Organization's data

**Given** a narrowly-scoped intervention is completed
**When** I inspect the evidence log
**Then** the record contains: actor, target Organization, target identity, action, server time, reason, and minimized before/after state — with no sensitive business data included

**Given** a platform intervention that would require access beyond the declared narrow scope
**When** the operation is attempted
**Then** the server rejects it with an authorization error

---

## Epic 4: Organization Structure — Companies & Business Scopes

An Organization Administrator can create and manage Companies and Business Scopes, use the guided scope creation flow with duplicate detection and final review, and search across authorized Companies and Scopes without leaking other Organizations' data.

### Story 4.1: Company Management (Create, Edit, Deactivate)

As an Organization Administrator,
I want to create, edit, and deactivate Companies within my Organization,
So that I can structure the legal and operating entities my team works with, with a safe guard preventing accidental deactivation of a Company that still has active scopes.

**Acceptance Criteria:**

**Given** I am an authenticated Organization Administrator
**When** I submit a valid Company creation request
**Then** the Company is created under my Organization with `ACTIVE` status
**And** the `organization_id` is resolved by the server from the authenticated session — never from browser input

**Given** I edit a Company's name or details
**When** the update is submitted
**Then** only that Company's record is updated and the change is reflected immediately

**Given** I attempt to deactivate a Company that has one or more active Business Scopes
**When** the deactivation request is processed
**Then** the server rejects it, returns the list of blocking active scopes, and suggests a safe next action — no cascade deactivation occurs

**Given** I deactivate a Company with no active Business Scopes
**When** the deactivation completes
**Then** the Company transitions to `INACTIVE` and is no longer returned in active-company searches

**Given** an attempt to create or modify a Company with an `organization_id` belonging to a different Organization
**When** the request is processed
**Then** the server rejects it at the constraint level (composite Organization-aware FK)

### Story 4.2: Guided Business Scope Creation Flow

As an Organization Administrator,
I want to create a Business Scope through a numbered, duplicate-aware guided flow with a final context review and explicit confirmation,
So that scopes are created correctly the first time and duplicates are caught before any data is persisted.

**Acceptance Criteria:**

**Given** I initiate Business Scope creation
**When** I progress through the guided steps
**Then** the flow is numbered (e.g. Step 1 of N), I can navigate backward to correct earlier inputs, and no data is persisted until I reach the final confirmation step

**Given** I reach the final review step
**When** the step is displayed
**Then** it shows the full Organization and Company context alongside all scope details for explicit confirmation before submission

**Given** I submit a scope whose Company + type + normalized name + external identifier (when provided) match an existing scope
**When** duplicate detection runs
**Then** the server rejects the creation before persisting, returns details of the matching scope, and the guided flow remains open for correction
**And** concurrent submissions cannot bypass duplicate detection to create two identical scopes

**Given** a successfully confirmed scope creation
**When** the submission completes
**Then** the Business Scope is persisted with: Company reference, type (`RESTAURANT`, `PROPERTY_DEVELOPMENT`, `CONSTRUCTION`, or `EVENT`), name, optional external identifier, location, operational status, and responsible person
**And** provenance fields (created-by actor, server-generated timestamp) are set server-side

### Story 4.3: Authorized Company & Scope Search

As an Organization Administrator or User,
I want to search for Companies and Business Scopes by name or identifier,
So that I can quickly find entities I am authorized to access without seeing results from other Organizations or unauthorized scopes.

**Acceptance Criteria:**

**Given** I submit a search query
**When** the results are returned
**Then** only Companies and Scopes within my Organization and within my authorized grants are included
**And** pagination counts also reflect only authorized records (no count leakage)

**Given** two Organizations have identically named Companies
**When** I search by that name
**Then** only my Organization's Company appears in my results

**Given** I am a User with access to only two specific scopes
**When** I search for all scopes
**Then** only those two scopes are returned — others are neither listed nor counted

**Given** a search request with a forged `organization_id` in path, query, or body
**When** the server processes it
**Then** it uses the server-resolved Organization from the authenticated session, ignoring the forged value

**Given** the active Organization/Company/Scope context
**When** I navigate between search results and detail views
**Then** the current context remains explicit and unambiguous at all times

### Story 4.4: Responsive Company & Scope Administration UI

As an Organization Administrator,
I want the Company and Business Scope administration surfaces to work correctly across mobile (360 px+), tablet, and desktop breakpoints,
So that I can manage my Organization's structure from any device without losing functionality.

**Acceptance Criteria:**

**Given** the Company/Scope list and detail views
**When** rendered at 360 px viewport width
**Then** all content recomposes without global horizontal scrolling and all interactive controls remain accessible and tappable

**Given** the guided Business Scope creation flow
**When** rendered on mobile (360–767 px)
**Then** each step is fully usable: inputs, backward navigation, and the final confirmation are all reachable without horizontal scrolling

**Given** the Company/Scope administration UI
**When** navigated using only a keyboard
**Then** all interactive elements receive visible focus indicators, form fields have clear labels, and error messages are programmatically associated with their inputs
**And** status indicators (active/inactive, scope type) convey meaning through text or label — not color alone

**Given** authoritative server outcomes (duplicate error, blocking-scope error, not-found)
**When** displayed in the UI
**Then** each shows a stable non-sensitive message with enough context to understand the problem and a clear next action

---

## Epic 5: Collaborative Access Management

An Organization Administrator can invite collaborators using permission presets that resolve to explicit grants, manage their full lifecycle (accept, resend, revoke, suspend, reactivate, remove), promote an active User to Administrator, and propose/accept an atomic ownership transfer — with every access change taking immediate server-side effect on open sessions.

### Story 5.1: Collaborator Invitation & Account Activation

As an Organization Administrator,
I want to invite a new collaborator by email with an initial `User` profile and explicit capability/scope grants,
So that they receive a single-use invitation link and can activate their account by setting a password.

**Acceptance Criteria:**

**Given** I submit a collaborator invitation with a target email, profile, and optional explicit grants
**When** the invitation is created
**Then** it has a ≥128 bits entropy secret stored only as a hash, a 7-day server-time expiry, and only one active invitation per normalized email + Organization is permitted
**And** the collaborator invitation email is delivered via the allowlisted transactional template

**Given** a valid invitation link is followed by a new identity
**When** the recipient sets a compliant password and submits acceptance
**Then** their membership is created atomically with the consumed invitation, capabilities and scopes are computed from the accepted grants, and they can immediately log in

**Given** a valid invitation link is followed by an existing identity with a matching normalized email
**When** acceptance is submitted
**Then** they must authenticate first; on success the membership is created and grants applied

**Given** an email that already has an active membership in another Organization
**When** acceptance is attempted
**Then** it fails neutrally — no membership is created and no cross-Organization link is formed

**Given** two concurrent acceptance requests for the same invitation
**When** both are processed simultaneously
**Then** exactly one membership is created; the second receives a neutral failure

### Story 5.2: Invitation Lifecycle Management (Resend, Revoke, Expiry)

As an Organization Administrator,
I want to resend, revoke, or let invitations expire with safe handling in all cases,
So that I can correct invitations sent to wrong addresses and ensure stale tokens cannot be used.

**Acceptance Criteria:**

**Given** an active invitation
**When** I resend it
**Then** the previous secret is invalidated, a new secret and fresh 7-day expiry are issued, and only one active invitation remains for that email + Organization

**Given** an active invitation
**When** I revoke it
**Then** the invitation is immediately invalidated and any subsequent acceptance attempt returns a neutral failure

**Given** an invitation that has passed its 7-day expiry
**When** acceptance is attempted using the original link
**Then** `server_now >= expires_at` is evaluated server-side and the attempt fails atomically with no membership created

**Given** I request the invitation list for my Organization
**When** the response is returned
**Then** only invitations belonging to my Organization are shown with their current state — no tokens or hashes are exposed

### Story 5.3: Permission Presets & Explicit Grant Management

As an Organization Administrator,
I want to assign collaborators permission presets that resolve to editable explicit grants, with a UI separating profile, state, grants, scope assignments, and calculated effective access,
So that I understand exactly what access each collaborator has and can adjust it precisely before confirming.

**Acceptance Criteria:**

**Given** I select a permission preset for a collaborator
**When** the preset is applied
**Then** it resolves to a visible versioned list of explicit grants that I can adjust before saving
**And** the UI clearly separates: profile (Administrator/User), account state, explicit grants, scope assignments, and calculated effective access

**Given** I preview a permission change that reduces a collaborator's access
**When** the preview is displayed
**Then** the UI highlights which capabilities and scopes will be removed

**Given** I submit a grant update
**When** the update is processed
**Then** unknown, inactive, platform-only, or cross-Organization capabilities and scopes are rejected server-side
**And** Organization-level scope grants descend to Companies and their scopes; Company grants descend only to that Company's scopes; scope grants never ascend

**Given** a grant update that reduces a collaborator's access
**When** submitted without recent re-authentication
**Then** the server requires re-authentication before committing

### Story 5.4: Suspension, Reactivation & Logical Removal

As an Organization Administrator,
I want to suspend, reactivate, or logically remove a collaborator's access with immediate server-side effect,
So that access changes take effect instantly even for sessions already open, and attributable history is preserved.

**Acceptance Criteria:**

**Given** I suspend a collaborator
**When** the suspension is committed
**Then** all active sessions for that identity within my Organization are invalidated immediately
**And** any in-flight mutations from that session cannot commit after the suspension

**Given** a suspended collaborator's session cookie is presented after suspension
**When** any protected request is made
**Then** the server returns a neutral 401/403

**Given** I reactivate a suspended collaborator
**When** reactivation completes
**Then** only their currently valid grants are restored — previously revoked grants are not resurrected

**Given** I logically remove a collaborator
**When** removal completes
**Then** access is immediately revoked and their membership history and attributable records are preserved

**Given** the suspension confirmation UI on mobile (360 px+)
**When** displayed
**Then** the consequences of suspension are shown before the confirmation control, the confirmation is explicit, and the layout recomposes without horizontal scrolling

### Story 5.5: Administrator Promotion & Atomic Ownership Transfer

As an Organization Administrator,
I want to promote an active User to Administrator and propose an atomic ownership transfer that the successor must accept,
So that administrative capacity can grow safely and ownership transfers without ever leaving the Organization without exactly one owner.

**Acceptance Criteria:**

**Given** I initiate promotion of an active User to Administrator
**When** promotion is submitted with a required reason, recent re-authentication, and explicit confirmation
**Then** the User's profile is updated to Administrator within my Organization — no platform capabilities are granted
**And** promotion evidence (actor, target, server time, reason) is committed atomically

**Given** I propose an ownership transfer to another active Administrator
**When** the proposal is created
**Then** nothing changes until the successor explicitly accepts

**Given** the successor accepts the ownership transfer
**When** acceptance is processed inside one serialized transaction
**Then** proposer ownership, successor eligibility, proposal freshness, and cancellation are all re-checked before committing
**And** exactly one owner exists after the transaction; the former owner remains an Administrator

**Given** concurrent operations attempt to eliminate the last active Administrator
**When** both are processed
**Then** at least one is rejected so the Organization always retains at least one active Administrator

**Given** the current owner
**When** suspension or removal of the current owner is attempted
**Then** the server rejects it until a successful ownership transfer has completed
