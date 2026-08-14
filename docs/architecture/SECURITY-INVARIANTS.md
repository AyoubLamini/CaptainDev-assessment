# Blocking Security Invariants

These invariants are mandatory. A violation is a failed assessment even when the happy-path UI works.

## SEC-01 — One tenant boundary

`Organization` is the only tenant boundary. Company and business scope are authorization scopes, never independent tenants. Every tenant-owned row has a non-null server-resolved `organization_id`.

## SEC-02 — No browser authority

An Organization ID, profile, capability, ownership status, or access state sent by the browser is a request parameter at most. The server resolves and verifies authority from authenticated state and PostgreSQL records.

## SEC-03 — Application authorization plus forced RLS

Every protected operation is authorized in the application layer and executed through a transaction-local PostgreSQL tenant context. Every tenant table enables and forces RLS. Runtime has neither `BYPASSRLS` nor table ownership.

## SEC-04 — Tenant-safe relations

Tenant parent-child relations use composite Organization-aware foreign keys or an equally strong database constraint. Cross-Organization references fail at the database boundary.

## SEC-05 — Fail closed

Missing tenant context, unknown capability, invalid catalog version, stale access epoch, inactive membership, or ambiguous ownership state causes refusal. No fallback grants access.

## SEC-06 — Neutral refusals

Unauthorized callers cannot distinguish an inaccessible object from a nonexistent one. Searches, counts, validation messages, and errors do not reveal data outside effective access.

## SEC-07 — Immediate revocation

Suspension, removal, and permission reduction invalidate active access immediately. Stale in-flight mutations cannot commit after revocation. UI caches and protected page state are purged on access change.

## SEC-08 — Ownership continuity

An active Organization has exactly one active owner and at least one active Administrator. Concurrent promotion, suspension, removal, or transfer cannot produce zero Administrators or two owners.

## SEC-09 — Safe invitations

Invitation secrets have at least 128 bits of entropy, are stored only as hashes, are single-use, revocable, and expire after seven days. Resend invalidates the previous token. A new identity is activated only through the mailbox-delivered invitation and sets its compliant password atomically with acceptance; an existing identity authenticates first and must have the same normalized email. Acceptance is atomic under concurrency.

## SEC-10 — Platform control-plane limits

Platform administration uses separate capabilities and minimized global metadata. Tenant intervention is narrow, reasoned, recently reauthenticated, evidenced, and scoped to one Organization transaction. It never supplies a general tenant bypass role.

## SEC-11 — Atomic mutation evidence

Business mutation, relevant evidence, and outbox records commit together. Replayed commands and asynchronous work cannot duplicate effects.

## SEC-12 — Secret and data minimization

No secrets, real data, invitation tokens, session values, or sensitive payloads are committed or logged. Technical logs use safe codes and correlation IDs. Evidence contains only the fields needed to prove an administrative action.

## SEC-13 — One customer Organization membership

A customer identity has at most one Organization membership in this assessment, including inactive historical membership. Re-invitation within the same Organization reuses the existing lifecycle record; invitation from another Organization fails neutrally.

## SEC-14 — First-party password credentials

NOVA owns authentication. Passwords are processed only over TLS and hashed with Argon2id using a unique library-generated salt and at least `m=19456 KiB`, `t=2`, `p=1`. Plaintext, reversible encryption, SHA-family password hashes, and production default passwords are forbidden. Single-factor passwords contain at least 15 Unicode characters, permit at least 64, use no character-class composition rule or scheduled rotation, and are checked against a maintained weak/compromised-password blocklist.

## SEC-15 — Server-side session authority

Session identifiers contain at least 128 bits of cryptographic entropy, are stored only as hashes server-side, and are carried only in a `__Host-` cookie with `Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/`. Web and API are same-origin for browser traffic. Authentication secrets never use browser local or session storage. Sessions rotate after login, password change/reset, and privilege elevation; logout, expiry, password reset, suspension, removal, and relevant access reduction revoke them server-side. Unsafe requests require CSRF protection in addition to `SameSite`.

## SEC-16 — Neutral and throttled authentication

Login, invitation, and password-recovery responses do not reveal whether an identity exists, is disabled, or is locked. Authentication attempts are throttled by account and source using bounded progressive delay without enabling permanent denial of service. Password-reset and invitation tokens are high-entropy, single-use, short-lived, stored only as hashes, and invalidate on successful use or replacement.

## SEC-17 — Constrained transactional email

Invitation and password-reset emails are sent only through the server-side Resend adapter. The adapter accepts only allowlisted, versioned templates and schema-validated variables, uses a stable delivery identifier, and rejects arbitrary senders, arbitrary markup, and untrusted link origins. The Resend API key and sender configuration stay outside the repository.

The database stores only the hash used to validate an invitation or recovery credential. Any delivery copy is application-encrypted under a key held outside the database, short-lived, deleted after delivery or terminal expiry, and excluded from logs, evidence, errors, and administrative reads. Email delivery metadata contains no usable link or token.

## Required negative tests

At minimum, executable tests must attempt:

- reading, updating, deleting, searching, and counting across Organizations;
- inserting a child row under a parent from another Organization;
- running without tenant context;
- alternating two tenant contexts on a reused database pool connection;
- forging Organization and scope identifiers in path, query, body, and headers;
- calling protected APIs directly despite a hidden UI action;
- accepting the same invitation concurrently;
- committing a mutation concurrently with membership suspension or permission reduction;
- removing the last active Administrator;
- racing two ownership transfers;
- broadening a narrow platform intervention into another Organization;
- linking one customer identity to two Organizations or creating duplicate membership history in one Organization;
- enumerating accounts through login, invitation, or password-recovery responses or timing shortcuts;
- fixing or replaying a session across login, logout, password reset, suspension, or privilege change;
- bypassing login throttling by changing only the source address or only the normalized email;
- using a reset or invitation token twice, after replacement, or at its exact expiry boundary;
- submitting an unsafe cookie-authenticated request without the required CSRF proof;
- replaying or modifying a queued transactional email command;
- selecting an arbitrary email template, sender, recipient redirect origin, or markup through the application API;
- recovering an invitation or reset secret from logs, evidence, delivery metadata, database columns, or Worker responses;

The test suite must fail if a new tenant-owned table lacks classification, RLS policy, or tenant-safe relations.
