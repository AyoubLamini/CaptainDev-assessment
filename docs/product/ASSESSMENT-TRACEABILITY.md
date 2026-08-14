# Assessment Traceability Matrix

## Purpose

This matrix separates the complete NOVA product context from the requirements that must be delivered during the technical assessment. It is not a task decomposition. The candidate remains responsible for planning implementation and tests.

The full target is the two required modules defined in [ASSESSMENT.md](../../ASSESSMENT.md). All capabilities mapped below are implementation deliverables. The AD identifiers point to the optional detailed rationale in [TARGET-ARCHITECTURE.md](../architecture/TARGET-ARCHITECTURE.md); the concise [assessment architecture](../architecture/ARCHITECTURE.md) is the implementation contract.

## Requirement mapping

| Requirement | Assessment capability | Status | Main architecture decisions | Minimum verification |
| --- | --- | --- | --- | --- |
| FR-001 | Server-persisted web SaaS | Required | AD-05, AD-20, AD-22, AD-24 | Clean bootstrap, migration, logout/login persistence, build and CI |
| FR-002 | Strict Organization isolation | Required | AD-01, AD-03, AD-04, AD-27 | Forced-RLS negative tests for read, write, search, counts, and relations using Organizations A and B |
| FR-003 | First-party authentication and least privilege | Required | AD-02, AD-20, AD-31, AD-35, AD-42, AD-46 | Password hashing, neutral throttled login, session rotation/revocation, real invitation/reset delivery, direct API authorization, unknown capability, and stale-access tests |
| FR-004 | Organization provisioning and lifecycle | Required | AD-05, AD-06, AD-15, AD-26, AD-37 | Provisioning, activation, suspension, reactivation, terminal-disablement, owner-invariant, and safe-evidence tests |
| FR-005 | Narrow platform user intervention | Required | AD-02, AD-26, AD-37 | One-Organization transaction, reason and recent-auth checks, no business enumeration |
| FR-006 | Separate commercial and access status | Required | AD-05, AD-06, AD-30, AD-38 | Independent state transitions and lost-update tests |
| FR-009 | Organization → Company → Business Scope hierarchy | Required | AD-01, AD-04, AD-27, AD-30 | Tenant-safe constraints, authorized hierarchy access, blocked Company cascade |
| FR-026 | Responsive web delivery | Required | AD-20, AD-31 | Critical journeys at 360 px and desktop, keyboard operation, no global horizontal scroll |
| FR-089 | Collaborative administration lifecycle | Required | AD-05, AD-06, AD-35, AD-36, AD-37, AD-40, AD-41 | Invitation, grant, suspension/reactivation/removal, last-Administrator, promotion, and transfer tests |
| FR-096 | Business Scope identity | Required | AD-01, AD-07, AD-27 | Required identity fields, server-derived provenance, authorized filtering |
| FR-114 | Search and selected-context clarity | Required | AD-02, AD-20, AD-31 | Server-side authorized search, neutral empty result, late-response/context-switch behavior |
| FR-115 | Guided duplicate-aware scope creation | Required | AD-05, AD-06, AD-27 | Review-before-create flow and concurrent duplicate prevention |
| FR-116 | Presets and effective-access view | Required | AD-02, AD-31, AD-35, AD-41 | Versioned preset resolution, adjustable grants, access-loss preview, stale mutation refusal |
| NFR-001 | Blocking tenant isolation | Required | AD-01, AD-03, AD-27 | Same-connection A → B → A and missing-context PostgreSQL tests |
| NFR-002 | Secure server authorization | Required | AD-02, AD-31, AD-35, AD-41, AD-42 | UI and direct API produce the same refusal; access epoch enforced |
| NFR-003 | Transport and secret hygiene | Required | AD-22, AD-23, AD-45 | Secret scan, synthetic data, minimized logs and errors |
| NFR-005 | Environment separation | Required | AD-22, AD-24 | Isolated local/test configuration with no production dependency |
| NFR-006 | Operational signals | Required | AD-15, AD-23, AD-37 | Structured errors and lifecycle evidence with correlation IDs |
| NFR-010 | Responsive/browser compatibility | Required | AD-20, AD-31 | Documented browser target and responsive end-to-end checks |
| NFR-011 | Functional accessibility | Required | AD-31 | Keyboard, focus, labels, errors, and non-color-only meaning |
| NFR-015 | Delivery documentation | Required | AD-24, AD-45 | Clean-clone commands, CI, architecture notes, honest limitations |
| NFR-017 | Future integration boundary | Required at boundary level | AD-04, AD-07, AD-08, AD-30 | Domain model has no provider dependency; no real connector required |
| NFR-018 | Resend transactional email | Required | AD-05, AD-06, AD-22, AD-23, AD-46 | Template/schema validation, deterministic adapter tests, idempotency tests, and real invitation/reset delivery to a candidate-controlled mailbox demonstrated in Loom |

## Critical end-to-end journeys

1. The securely bootstrapped Platform Administrator logs in with first-party credentials, provisions an Organization, and sends the initial-owner invitation.
2. The matching owner accepts once; the Organization activates with exactly one owner and an Administrator membership.
3. The owner creates a Company and a duplicate-aware Business Scope.
4. The owner invites a User with explicit capabilities and scope; the matching User accepts once and sees only authorized records.
5. The owner reduces access or suspends the User; direct API calls and an already-open session lose access immediately.
6. The owner reactivates the User with only current grants.
7. Organization A cannot read, search, count, mutate, export, or reference Organization B data.
8. Login throttling, session fixation prevention, logout, expiry, and suspension revoke access as specified without leaking credentials or account existence.
9. Password-reset requests are neutral; the single-use token expires at the exact boundary, and successful reset revokes every session for the identity.
10. The owner promotes an eligible User to Administrator without granting platform access.
11. The owner proposes a transfer to an eligible Administrator; acceptance leaves exactly one owner and keeps the former owner as Administrator.
12. A recently reauthenticated Platform Administrator performs one reasoned, evidenced intervention scoped to a selected Organization without gaining general access to its business data.
13. Terminal Organization disablement revokes access and cannot be reversed through an ordinary reactivation path.

Real-time visual browser invalidation beyond immediate server-side refusal and notification channels/templates beyond the three required emails are optional enhancements. All mapped business capabilities, including promotion, ownership transfer, advanced platform intervention, terminal disablement, and real Resend delivery, are required.

## Evidence expected in the submission

- requirement IDs referenced in relevant test names or test descriptions;
- migration and policy files for database invariants;
- CI output for lint/type checks, unit, PostgreSQL integration, end-to-end, and build;
- `SUBMISSION.md` listing delivered scope, deferred items, known risks, and the accessible Loom demonstration link;
- a Loom video of no more than 10 minutes showing the running platform, the implemented modules and features, and the principal functional journeys working end to end, including receipt and completion of real invitation and password-reset emails through Resend in a candidate-controlled mailbox;
- a private submission repository accessible to the GitHub user `mbouzian42` throughout the review process;
- demonstrated successful invitation and password-reset delivery through Resend in the Loom video.
