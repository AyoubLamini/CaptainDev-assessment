# Technical Assessment Brief

## Mission

Build a working vertical slice of the first two NOVA modules:

1. **SaaS Foundation & Platform Administration**
2. **Client-side Collaborative Administration**

The result must be a runnable, persistent, multi-Organization web application. A polished static prototype or browser-only state is not sufficient.

## Suggested schedule

- There is no hard deadline.
- Submission by **Wednesday, 19 August 2026** is strongly encouraged so that the recruitment process can move quickly.
- Submit as soon as the work is complete.

## Functional scope

### SaaS Foundation & Platform Administration

Deliver a secured platform control plane that allows an authorized Platform Administrator to:

- authenticate through NOVA first-party email/password authentication;
- create an Organization in a provisioning state;
- invite its initial owner with a single-use, seven-day invitation delivered by email;
- activate the Organization atomically when the invitation is accepted;
- list and inspect Organizations through minimized platform metadata;
- manage commercial status independently from access status;
- suspend, reactivate, and terminally disable Organization access;
- perform narrowly scoped, reasoned, and evidenced user interventions;
- demonstrate isolation between at least two Organizations.

Platform administration must never become a general-purpose bypass around tenant isolation.

### Client-side Collaborative Administration

Deliver an Organization administration area that allows an authorized Organization Administrator to:

- activate a customer account from a valid invitation by choosing a password, then log in and log out with that account;
- request and complete a password reset through a neutral, single-use recovery flow delivered by email;
- create, edit, and deactivate Companies, while preventing a Company with active business scopes from being silently deactivated by cascade;
- create a business scope through a guided, duplicate-aware flow;
- search and open only authorized Companies and business scopes;
- invite a collaborator initially as a `User`, with explicit capabilities and scopes;
- accept, resend, expire, or revoke invitations safely;
- apply adjustable permission presets that resolve to explicit grants;
- suspend, reactivate, or remove a collaborator's access without deleting history;
- promote an active `User` to `Administrator` as a distinct sensitive action;
- propose and accept an atomic ownership transfer; the former owner remains an Administrator until a separate authorized action.

The product has exactly two Organization profiles: `Administrator` and `User`. Permission presets are not additional roles.

Multi-factor authentication is not required and must not be implemented for this assessment. The required authentication scope is email/password login, invitation-based account creation, logout, server-side sessions, and password reset.

## Delivery scope

The two modules above define the required functional scope. The submission is expected to implement and test the complete lifecycle described below.

### Required implementation

- reproducible local bootstrap, migrations, CI, and synthetic data;
- first-party email/password login, logout, server-side sessions, brute-force protection, and secure Platform Administrator bootstrap;
- invitation-based account activation for the initial owner and collaborators, with the links delivered through Resend and no public Organization self-registration;
- neutral password-reset request and completion using a hashed, single-use, 30-minute token delivered through the same email adapter;
- real delivery through a candidate-created Resend account for three transactional templates: initial-owner invitation, collaborator invitation, and password reset;
- Organization provisioning, initial-owner acceptance, activation, and minimized platform directory;
- Company and business-scope administration;
- collaborator invitation and acceptance with explicit grants;
- permission resolution, suspension, and reactivation;
- advanced, narrowly scoped, reasoned, and evidenced Platform Administrator intervention;
- terminal Organization disablement and its operational follow-up;
- Administrator promotion and atomic ownership transfer;
- immediate server-side access refusal after suspension, removal, or permission reduction, including for a session that was already open;
- forced PostgreSQL RLS and executable negative isolation tests.

### Optional enhancements

- real-time visual invalidation in an already-open browser through WebSocket, SSE, or equivalent, beyond the required immediate server-side refusal;
- notification channels and templates beyond the three required transactional authentication emails;
- optional infrastructure such as a dedicated worker, Redis, or BullMQ when it adds value to the submitted design.

Optional enhancements are not evaluation blockers. Do not weaken required functionality, security, or testing to increase infrastructure or visible feature count.

## Required deliverables

Your submission must include:

- complete source code for web, API, background processing if used, and shared packages;
- source code and non-secret configuration for the Resend transactional email adapter;
- versioned database schema and migrations, including tenant-isolation policies;
- deterministic synthetic seed data for at least two Organizations;
- unit tests for domain invariants and permission resolution;
- integration tests against a real PostgreSQL instance, including negative cross-Organization cases;
- end-to-end tests for the critical platform and collaboration journeys;
- continuous-integration configuration running the relevant checks;
- a root README with setup, migration, seed, run, test, and build commands;
- documented first-party authentication behavior, session lifecycle, secure bootstrap, and implemented password-recovery flow;
- documented Resend setup, sender-domain configuration, local email adapter, and secret injection steps;
- concise architecture and trade-off notes for decisions made during the assessment;
- a Loom video of no more than 10 minutes showing the running platform, the implemented modules and their main features, and the principal functional journeys working end to end. The video must demonstrate a real invitation email arriving in a mailbox controlled by the candidate, opening its link, completing account activation, and proving that the invitation cannot be reused. It must also demonstrate a real password-reset email and successful completion of that journey. Security and failure-path properties that are not practical to demonstrate visually remain supported by automated test evidence. The accessible Loom link must be included in `SUBMISSION.md`. Use only synthetic identities and data.

Do not include secrets, real customer data, production credentials, or undocumented external dependencies.

## Definition of Done

The submission is done only when:

- a reviewer can start it from a clean clone using documented commands;
- all persistent business data is server-side and survives logout/login;
- all protected actions are authorized server-side;
- Platform Administrators, Organization Administrators, and invited Users can log in, log out, and return through a valid server-side session;
- invited users can create their account by choosing a password, and all account types can complete the neutral password-reset flow;
- a real mailbox controlled by the candidate receives invitation and password-reset emails through Resend, and each link completes its intended single-use journey;
- password credentials and session secrets follow the blocking authentication invariants;
- the browser cannot select or override the authoritative Organization context;
- migrations create the required constraints and PostgreSQL row-level security;
- Organization A cannot read, search, mutate, export, or reference Organization B data;
- invitation, lifecycle, permission, promotion, and ownership invariants are covered by tests;
- responsive critical journeys work from 360 px upward and remain keyboard-usable;
- lint/type checks, unit tests, integration tests, end-to-end tests, and build pass in CI;
- the Loom video demonstrates the functional platform, receipt of a real invitation and password-reset email in a candidate-controlled mailbox, completion of both linked journeys, and invitation replay refusal; it uses only synthetic identities and data and remains accessible throughout the review process;
- the private submission repository is accessible to the GitHub user `mbouzian42` throughout the review process;
- documentation states honestly what is complete, incomplete, mocked, or intentionally deferred.

## Blocking quality gates

The following failures are assessment blockers:

- any cross-Organization data leak or cross-Organization relationship;
- trusting an Organization, role, capability, or ownership claim supplied only by the browser;
- using only UI hiding for authorization;
- no server persistence or no repeatable database migration;
- committed secrets or real data;
- no executable negative isolation tests;
- plaintext, reversibly encrypted, fast-hashed, or weakly configured password storage;
- authentication secrets or session identifiers stored in browser-accessible storage;
- no functional Resend delivery, or an invitation/reset journey that depends on copying a token from logs, the database, or a development inbox;
- an email adapter that permits arbitrary templates, arbitrary senders, untrusted link origins, or unvalidated delivery requests, or exposes the Resend API key;
- a lifecycle transition that can leave an active Organization without exactly one owner or without an active Administrator;
- a stale session or concurrent mutation retaining access after a suspension or permission reduction;
- critical setup or verification steps missing from the documentation.
- the private repository or Loom video being inaccessible to the reviewer during the review process.

## Evaluation criteria

Reviewers will assess:

- correctness of the requested behavior and edge cases;
- tenant isolation and security depth;
- domain modeling, transaction boundaries, concurrency, and idempotency;
- architecture clarity and module ownership;
- test quality, especially failure and adversarial cases;
- maintainability, naming, typing, error handling, and observability;
- UX fidelity, accessibility, and responsive behavior;
- delivery discipline, documentation, and honest scope reporting;
- appropriate and transparent use of coding assistants.

Strong security, complete end-to-end behavior, and clear reporting are more important than optional infrastructure or visual embellishment. If any required item remains incomplete, list it honestly with known risks and the tests that still need to be added.

## Submission protocol

1. Ensure the repository contains no secrets and no real data.
2. Run every documented quality command from a clean local state.
3. Add a `SUBMISSION.md` containing the delivered scope, known limitations, test results, setup caveats, and Loom demonstration link.
4. Push the submission to a **private GitHub repository** you control. Do not fork this assessment repository.
5. Add the GitHub user [`mbouzian42`](https://github.com/mbouzian42) as a collaborator, ensure the invitation is accepted, and retain reviewer access throughout the review process.
6. Reply to the assessment email with the private repository URL and the accessible Loom video URL.
7. CaptainDev will evaluate the default-branch state available when the submission email is received. Do not push further changes or rewrite history after submission unless the reviewer explicitly requests a correction.
