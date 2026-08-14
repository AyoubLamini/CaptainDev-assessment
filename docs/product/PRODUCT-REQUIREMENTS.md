# NOVA Product Requirements

## 1. Document purpose and assessment boundary

This document gives the complete product context needed to make durable engineering decisions. It covers the fictional NOVA V1 product, including capabilities that are not part of this technical assessment.

Only requirements marked **Assessment** in the catalogue below are implementation deliverables for this exercise. Requirements marked **Context** explain the product that the foundation must support later; they must not be implemented unless they are a necessary dependency of an Assessment requirement. The delivery rules and priorities in [ASSESSMENT.md](../../ASSESSMENT.md) take precedence for the exercise schedule.

This candidate edition intentionally excludes commercial terms, personal names, internal review history, and internal planning artifacts. Stable requirement identifiers are retained so implementation and tests can be traced unambiguously.

## 2. Product vision

NOVA is a responsive, server-persisted SaaS decision cockpit for leaders in four sectors:

- restaurants;
- property development;
- construction;
- events.

It turns authorized operational and financial data into reliable KPI, prioritized issues, explanations, and recommended actions. It is a management and decision-support layer, not an accounting product, ERP, point-of-sale system, payment initiator, or autonomous agent.

The primary product outcome is that an authorized leader can identify the overall state, the most important issue, and the recommended next action in less than one minute. The product must never invent missing values, hide uncertainty, mix incompatible periods, or cross an Organization boundary.

## 3. Product releases

### Releases 1 and 2

The first commercial release includes the SaaS foundation, responsive web application, platform control plane, four sector cockpits, manual entry and imports, server persistence, basic history and exports, and proactive domain AI without free-form chat.

### Release 3

The governance release adds immutable audit versions, structured evidence, server-generated trace identifiers, compatible consolidation, consolidated exports, a summary PDF, and a contextual conversational copilot.

### Billing

Billing is a product capability spanning the releases. It includes hosted checkout, monthly and annual subscriptions, configurable trials, the customer billing portal, renewals, failed payments, verified webhooks, internal entitlements, offer configuration, promotions, and simple subscription indicators.

## 4. Domain vocabulary and actors

- **Organization**: the customer account and the unique technical tenant boundary.
- **Company**: a legal or operating entity inside one Organization. It is not a tenant.
- **Business Scope**: the managed operational perimeter inside a Company: restaurant, property development, construction site, or event.
- **Work Version**: mutable day-to-day data and results.
- **Audit Version**: an official immutable snapshot created in Release 3.
- **Platform Administrator**: a trusted NOVA operator with a narrow control-plane role. Platform access never grants unrestricted customer-data access.
- **Organization Administrator**: the owner or another promoted Administrator inside one Organization.
- **Organization User**: a collaborator with explicit capabilities and Company or Business Scope grants.

There are exactly two Organization profiles: `Administrator` and `User`. Labels such as Director, Accountant, and Read-only are adjustable permission presets, never additional profiles.

## 5. Reference journeys

1. A Platform Administrator provisions an Organization, invites its initial owner, and activates it without opening a tenant bypass.
2. An Organization Administrator creates Companies and Business Scopes, invites collaborators, and assigns explicit access.
3. A restaurant leader enters or imports a period, reviews KPI and issues, and receives a contextual recommendation.
4. A property developer reviews realized and projected margin, budget, financing, sales, and cash risks.
5. A construction manager reviews current performance, estimate at completion, schedule, cash, and evidenced contractual risks.
6. An event manager reviews revenue, ticketing, capacity, spending, cash, and isolated scenarios.
7. An authorized Administrator prepares a Work Version, officializes an Audit Version, and later creates a linked correction without rewriting history.
8. An authorized user generates scoped exports or, in Release 3, a consolidated report with explicit exclusions.
9. An authorized user asks the Release 3 copilot to explain an issue using only permitted data, rules, and evidence.
10. An Organization Administrator subscribes and manages billing while a Platform Administrator supervises minimized billing metadata and offer configuration.

## 6. Functional requirement catalogue

### 6.1 SaaS foundation, Organizations, and administration

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-001 | **Assessment** | NOVA is a web SaaS with authoritative server-side persistence. Saved data survives an authorized logout/login and another browser session. |
| FR-002 | **Assessment** | Every API, row, relation, search, cache key, file, job, export, evidence item, and generated output is isolated by Organization and effective access. The server derives the authoritative Organization. |
| FR-003 | **Assessment** | NOVA provides first-party email/password authentication and server-side least privilege. Authentication establishes an internal identity; authorization then uses only the two Organization profiles plus explicit capabilities and scopes. UI hiding is never authorization. |
| FR-004 | **Assessment** | A Platform Administrator can create, inspect, activate, suspend, reactivate, and terminally disable an Organization through evidenced lifecycle transitions. |
| FR-005 | **Assessment** | A Platform Administrator may perform narrow, reasoned user interventions inside one selected Organization without gaining general access to its business data. |
| FR-006 | **Assessment** | Commercial status (`DEMO`, `PILOT`, `ACTIVE`) and access status are independent, visible, concurrency-safe dimensions. |
| FR-007 | Context | The platform control plane exposes minimized Stripe customer, subscription, payment, entitlement, and verified-event state by Organization; customer Administrators see only their own billing data. |
| FR-008 | Context | All four cockpits share context selection, the order overall state → priorities → actions → KPI → detail, and honest loading, empty, error, and non-calculable states. |

#### Assessment acceptance details

- There is no public Organization self-registration. The first Platform Administrator is created by a secure one-time bootstrap; customer identities are activated only through a valid initial-owner or collaborator invitation.
- Passwords are hashed with Argon2id using unique salts and the parameters in the architecture. Plaintext passwords, reversible encryption, and fast general-purpose hashes are forbidden.
- Login creates an opaque server-side session and sends only its random identifier in a secure `HttpOnly` cookie. Authentication or session secrets never enter browser-accessible storage.
- Login, logout, session expiry, password change/reset, account suspension, and access reduction revoke or rotate the affected sessions as specified by the architecture. A completed password reset revokes every existing session for the identity.
- Authentication and password-recovery responses are neutral and rate-limited so they do not disclose whether an email exists.
- Initial-owner invitations, collaborator invitations, and password-reset links are delivered as real transactional emails through Resend. Administrative screens and logs never reveal or substitute for the email token.
- Organization creation produces `PROVISIONING` and grants no customer access.
- Initial-owner invitation acceptance atomically creates the owner Administrator membership, establishes exactly one active owner, and activates the Organization.
- An active Organization always has exactly one active owner and at least one active Administrator.
- Suspension invalidates new and stale access immediately without deleting data. Reactivation restores only currently valid access.
- Terminal disablement has no reactivation path in this assessment.
- Sensitive transitions require recent authentication, a reason, explicit confirmation, server time, actor, minimized before/after evidence, and correlation data.
- The platform directory is server-paginated and may expose only support-safe identity, lifecycle, owner-contact, and synchronization metadata.
- Customer lifecycle protection is identical whether an action originates from Organization administration or a permitted platform intervention.

### 6.2 Work mode, data, imports, and Organization structure

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-009 | **Assessment** | One Organization owns one or more Companies, each with Business Scopes. A customer identity belongs to one Organization and can access only explicitly authorized Companies and scopes. |
| FR-010 | Context | Each sector provides structured forms backed by a canonical typed data dictionary and reproducible reference cases. |
| FR-011 | Context | Each sector supports template-based CSV/Excel imports with a mandatory preview, explicit validation, up to 10,000 rows and 20 MB. |
| FR-012 | Context | Important data records type, unit, period, ISO currency when monetary, tax basis, actual/estimated/forecast status, bounds, nullability, and requiredness. Currency changes are never retroactive and no tax or exchange rate is inferred. |
| FR-013 | Context | Missing required data blocks only dependent calculations and is never replaced with zero. Empty, valid zero, actual, estimated, and forecast values remain distinct. |
| FR-014 | Context | Blocking import errors write nothing; warnings require confirmation; duplicates require an explicit ignore or replace decision; replacements remain evidenced. |
| FR-015 | Context | Authorized users may associate source-document references needed for decision support, but V1 is not a document-management, OCR, signing, or transactional system. |
| FR-016 | Context | Results use the latest coherent period or an explicitly selected coherent period. Valid changes trigger only dependent recalculations. |
| FR-017 | Context | Entered and imported data retain scope, period, real source, actor, update time, freshness, status, and links to the rule versions used by derived results. |
| FR-018 | Context | The UI never presents a simulated integration as connected. |
| FR-090 | Context | Manual-entry and import cadence defaults to monthly and is configurable. Overdue data reduces freshness but does not by itself block calculation. |
| FR-096 | **Assessment** | A Business Scope retains Company, type, name, optional external identifier, relevant location, operational status, responsible person, and sector-specific counterpart when applicable. Counts are derived; provenance is server-generated. |

#### Assessment acceptance details

- No Company or Business Scope relationship may cross an Organization boundary.
- A Company with active Business Scopes cannot be deactivated through an implicit cascade; the user receives blocking-scope details and a safe next action.
- Business Scope type is `RESTAURANT`, `PROPERTY_DEVELOPMENT`, `CONSTRUCTION`, or `EVENT`.
- An authorized Administrator creates a scope through a guided flow with a final context review.
- Duplicate detection compares at least Company, type, normalized name, and external identifier when supplied; concurrency cannot create duplicates.
- Search, counts, and filters are server-side and reveal only authorized records.

### 6.3 Common steering experience

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-019 | Context | The primary screen follows overall state, prioritized issues, recommended actions, essential KPI, then details and evidence. |
| FR-020 | Context | Up to three real issues are ordered by financial impact, cash impact, operational risk, then urgency; reliability and recency break otherwise equal ties. |
| FR-021 | Context | A healthy state is shown when no deviation exists; the product never manufactures an alert. |
| FR-022 | Context | Each alert exposes observation, estimated impact, recommendation, data period/date, reliability components, missing data, and links to data and rule. |
| FR-023 | Context | Every card has one clear primary message and an understandable route to detail. |
| FR-024 | Context | Green, amber, and red meanings are also conveyed through text, iconography, or shape. |
| FR-025 | Context | Recommended thresholds are Administrator-configurable at Organization level and, for restaurants, optionally at restaurant level, with versioned precedence. Existing Audit Versions never change. |
| FR-026 | **Assessment** | Critical web journeys work from 360 px upward across mobile, tablet, and desktop without a native application or global horizontal scrolling. |
| FR-091 | Context | Releases 1 and 2 provide an authorized portfolio of Companies and Business Scopes with overall state and main alerts, without aggregating incompatible KPI. |
| FR-095 | Context | All 84 identified sector KPI-card contents remain reachable through summary or thematic detail views with definition, formula/version, period, unit, data status, and responsive access. |

The client shell exposes Portfolio and Administration outside a Business Scope. Inside a scope it exposes a return to Portfolio, Summary, Data, Rules & Thresholds, and conditional Audit. Consolidation & Reports appears only with Release 3 and the required rights.

### 6.4 Restaurant cockpit

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-027 | Context | Capture restaurant identity, period, revenue, costs, activity, objectives, surface, retention, lunch mix, elapsed days, and comparable revenue with synchronized amount/percentage representations where defined. |
| FR-028 | Context | Calculate revenue, costs, result, margin, ratios, ticket, daily activity, revenue per area, labelled 7/30-day and month-end projections, comparable evolution, retention, and mix; impossible denominators yield non-calculable. |
| FR-029 | Context | Detect versioned margin, cost, activity, and retention deviations with configurable thresholds, exact boundary behavior, one strongest applicable alert, and an action recommendation. |
| FR-030 | Context | Provide an authorized restaurant summary from which state, priority, and action can be identified in under one minute. |

### 6.5 Property-development cockpit

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-031 | Context | Capture project identity, status, responsibility, budgets, actual and forecast revenue/cost, land, construction, studies/fees, financing, calls for funds, penalties, schedule, and cash while separating actual, forecast, and baseline. |
| FR-032 | Context | Calculate expected, actual-to-date, and completion margin; budget and component deviations; sales/pre-sales; fund calls; delays; and supported risks without substituting missing data. |
| FR-033 | Context | Explain versioned margin, budget, land, construction, sales, funding, cash, penalty, schedule, finance, and delivery risks with trigger, impact, and action. Invalid allocation totals block officialization. |
| FR-034 | Context | Limit the cockpit to confirmed property-development capabilities and do not expose unsupported subprofiles as delivered. |

### 6.6 Construction cockpit

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-035 | Context | Capture site identity, contract and amendments, billing/collection, actual cost, original and revised budgets, progress, delays, dates, cash, future payments, and evidenced penalties/disputes. |
| FR-036 | Context | Calculate revised contract, current profit/margin, collection, budgets, estimate at completion, projected margin, budget evolution, subcontracting, schedule slippage, cash low point, and supported risks while separating current from forecast. |
| FR-037 | Context | Explain demonstrated cost, time, cash, and contractual deviations, applying the strongest applicable severity without inferring absent penalties. |
| FR-038 | Context | Keep monetary margin distinct from rate, financial progress from physical progress, observed delay from contractual slippage, and heuristic extrapolation from a planned date. |

### 6.7 Events cockpit

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-039 | Context | Capture event type, city, venue, responsibility, organizer, status, revenue, ticketing, total saleable capacity, costs, budget, and cash without confusing capacity and remaining tickets. |
| FR-040 | Context | Calculate revenue, costs, result, margin, occupancy, remaining tickets, average ticket price, budget deviation, sponsor dependency, cash low point, top cost contributors, and supported risks. |
| FR-041 | Context | Explain budget and organization risks with trigger, impact, strongest applicable severity, and recommendation; sold tickets above capacity are a blocking contradiction. |
| FR-042 | Context | Isolate 50%, 75%, and 100% occupancy scenarios from real data, state price/capacity/cost assumptions, and never present unconfirmed future cash as certain. |

### 6.8 Proactive domain AI without chat

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-043 | Context | AI uses only authorized available data and rule-engine outputs. Every deterministic number comes from a versioned rule and reconciles with referenced inputs. |
| FR-044 | Context | Detect and rank anomalies using the canonical deterministic ordering without inventing topics. |
| FR-045 | Context | Expose ranking factors, detailed data reliability, and missing inputs for each priority. |
| FR-046 | Context | Produce sector-, scope-, period-, and deviation-specific recommendations without guarantees or execution. |
| FR-047 | Context | Explain data, period, rule/trigger, impact, action, and limitations. |
| FR-048 | Context | Open each cockpit with a proactive state, priority, and action summary without requiring a question. |
| FR-049 | Context | Expose missing, incomplete, stale, contradictory, or incompatible data and their effect; block only dependent results and never invent replacements. |
| FR-050 | Context | Releases 1 and 2 provide no chat, free-form question, or conversation history. |
| FR-051 | Context | AI cannot mutate data or autonomously execute a business, access, billing, export, or audit action. |

### 6.9 Governance, Audit, and evidence

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-052 | Context | Work Mode supports authorized daily entry, import, association, consultation, and modification. |
| FR-053 | Context | Audit Mode presents control, evidence, history, actors, supporting references, and anomalies for an official version. |
| FR-054 | Context | Lifecycle is `WORK → READY_FOR_AUDIT → OFFICIAL_AUDIT → SUPERSEDED`; a User may prepare, but only an Administrator may officialize. |
| FR-055 | Context | An Audit Version is immutable during retention; correction creates a new linked version and preserves the old one. |
| FR-056 | Context | A server-side append-only ledger records defined mutations, validations, calculations, access changes, AI outputs, and exports; ordinary reads are not business events. |
| FR-057 | Context | A server-generated Trace ID identifies an operation chain and a unique Event ID identifies each event, with explicit parent links. |
| FR-058 | Context | Evidence links tenant, Company/scope, actor, UTC time, action, object, before/after, source, versions, calculation, result, reservations, error, and decision where applicable without storing model reasoning. |
| FR-059 | Context | Risk and governance scores expose inputs, contributions, formula/version, bounds, interpretation, and limitations. |
| FR-060 | Context | Compatible alerts, recommendations, and KPI may be consolidated only within one Organization and only when definition, unit, currency/basis, period, and rights are compatible. |
| FR-061 | Context | Release 3 views follow Summary, Risks, Evidence, History, then Details. |

### 6.10 History, exports, and reports

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-062 | Context | Each sector provides scoped history and simple CSV/JSON exports, up to 100,000 rows, with explicit filters, dates, monetary semantics, exporter, versions, and an Export ID. Large exports are private asynchronous artifacts available for seven days. |
| FR-063 | Context | Release 3 consolidated exports include Organization context, Audit Version, reliability/reservations, rule versions, Trace ID, and version lineage; incompatible KPI remain separate. |
| FR-064 | Context | Release 3 produces a real readable summary PDF containing context/version, state, up to three priorities, essential KPI, reliability, missing data, reservations, alerts, recommendations, evidence summary, and a non-certification warning. |

### 6.11 Conversational copilot

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-065 | Context | The copilot is authorized and contextualized by Organization, sector, Business Scope, data, entitlements, and current rights on every request. |
| FR-066 | Context | It supports free-form questions and deeper exploration of an alert or recommendation within the authorized product domain. |
| FR-067 | Context | On open, it presents at most three real prioritized topics and never fills the list with invented items. |
| FR-068 | Context | It explains an alert using relevant data, contributors, impact, possible actions, evidence, and limitations. |
| FR-069 | Context | It names a cause only when contribution is calculable; otherwise it labels an observed factor or hypothesis. Data reliability remains distinct from model or scenario uncertainty. |
| FR-070 | Context | A projection states horizon, method, assumptions, scenarios/range, uncertainty, and no guarantee. Fewer than three comparable periods yields no number; 3–5 is low-confidence indicative; 6+ may be quantified; seasonality requires at least 12 months. |
| FR-071 | Context | Copilot priorities use the same deterministic financial → cash → operational → urgency ordering, with reliability and recency only as tie breakers. |
| FR-072 | Context | The copilot covers supported property-development, construction, and events cases within their data and rule boundaries. |
| FR-073 | Context | It summarizes actual decisions and up to five relevant actions without executing or inventing them. |
| FR-074 | Context | It exposes missing data, assumptions, limitations, data reliability, and uncertainty, and refuses unsupported conclusions. |
| FR-075 | Context | Authorized conversation history follows access and retention rules; it is inaccessible after access ends and deleted under the retention lifecycle. |
| FR-076 | Context | Limit one active generation per User, apply a configurable initial burst limit, meter usage by Organization/User/feature/model/period, and block only new generations when a limit is reached. |

### 6.12 Billing

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-077 | Context | Production payment accounts are controlled by NOVA where possible and complete their required business and banking verification. |
| FR-078 | Context | Hosted checkout opens entitlements only after authoritative subscription/payment or configured trial confirmation; incomplete checkout grants nothing. |
| FR-079 | Context | Billing belongs to one Organization, normally one customer and at most one active base subscription, with versioned item-to-entitlement mappings and no hard-coded prices or identifiers. |
| FR-080 | Context | Same-interval upgrades may be immediate and prorated; downgrades, cancellation, and monthly/annual switches take effect at renewal after explicit preview. |
| FR-081 | Context | Organization Administrators use the hosted billing portal. During payment suspension they can reach only a payment-required route and the portal; Users see no financial detail. |
| FR-082 | Context | A failed authoritative payment immediately suspends covered access without read-only grace, preserves data for recovery, and allows verified payment to restore only current entitlements. |
| FR-083 | Context | Verified webhooks synchronize lifecycle changes idempotently, reject invalid signatures, ignore duplicate/old effects, and converge to authoritative provider state under reordering. |
| FR-084 | Context | Entitlements follow subscription state and effective date, including already-open sessions; cancellation preserves access until paid period end and retention begins when covered access ends. |
| FR-085 | Context | An Organization Administrator sees only that Organization's plan, invoices, payments, period, and state; NOVA stores no card data. |
| FR-086 | Context | A Platform Administrator sees minimized Organization billing state, entitlements, payments, last verified event, and processing history without card mutation. |
| FR-087 | Context | Deduplicated notifications cover trial, activation, renewal, failure, recovery, plan change, cancellation, and access end, with role-appropriate minimized content. |
| FR-088 | Context | Countries, addresses, tax identifiers, and tax behavior come from payment-provider configuration and never modify business KPI. |
| FR-092 | Context | Offers may configure one automatic-conversion trial per eligible Organization/customer, requiring payment method before access and applying immediate failure handling at conversion. |
| FR-093 | Context | Platform administration configures monthly/annual offers, setup fees, trial duration, discounts, promotions, codes, eligibility, dates, publication state, and provider mappings with full change evidence. |
| FR-094 | Context | Platform indicators show active paid subscriptions, collected revenue net of refunds, MRR, and ARR, excluding trials and one-off setup from MRR and keeping currencies separate. |

### 6.13 Collaborative customer administration

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-089 | **Assessment** | An Organization Administrator manages invitation, explicit permissions/scopes, suspension, reactivation, logical removal, Administrator promotion, and atomic ownership transfer without granting platform capabilities. |

#### Invitation lifecycle

- An invitation initially targets `User`, expires after seven days, and has one single-use secret with at least 128 bits of entropy stored only as a hash.
- `expires_at` uses server time; acceptance fails atomically when `server_now >= expires_at`.
- Resend invalidates the previous secret and restarts expiry. Revocation is immediate. Only one active invitation may exist per normalized email and Organization.
- Invitation persistence and notification intent are atomic; the allowlisted Resend template is delivered idempotently and contains only the minimum identity and action context.
- For a new internal identity, possession of the valid mailbox-delivered invitation establishes control of the invited address and acceptance atomically sets a compliant password, consumes the invitation, and creates the membership. An existing identity must authenticate first and its normalized email must match the invitation.
- An identity already attached to another customer Organization is rejected neutrally. A former membership in the same Organization is reused rather than duplicated.
- Expired, revoked, consumed, or unknown invitations create no membership. Concurrent acceptance creates exactly one membership.
- Acceptance recalculates current capabilities and scopes and never resurrects removed or inactive grants.

#### Permission and collaborator lifecycle

- Presets resolve to a visible versioned list of explicit grants and remain adjustable before confirmation.
- Organization scope descends to its Companies and scopes; Company scope descends only to its scopes; scope grants never ascend.
- Unknown, inactive, platform-only, or cross-Organization capabilities and scopes fail closed.
- Permission reduction and suspension immediately invalidate stale access and prevent stale concurrent mutations from committing.
- Reactivation applies only current grants. Removal is logical and preserves attributable history.
- No operation may leave an active Organization without an active Administrator. The current owner cannot be suspended or removed before a successful transfer.

#### Promotion and ownership

- Only an eligible active User in the same Organization may be promoted. Promotion requires the current owner, recent authentication, reason, and explicit confirmation.
- Promotion grants Organization `Administrator`, never platform access, and does not transfer ownership.
- The current owner may propose transfer only to another active Administrator. Nothing changes until that successor accepts while still eligible.
- Acceptance rechecks proposer ownership, successor eligibility, proposal freshness, and cancellation inside one serialized transaction.
- Exactly one owner remains. The former owner remains an Administrator until a separate authorized action.

### 6.14 Clarifications from validated UX behavior

| ID | Scope | Requirement |
| --- | --- | --- |
| FR-113 | Context | Portfolio shows a decision-oriented priority, authorized Company/scope summary, overall data reliability with coverage, and authoritative update time. |
| FR-114 | **Assessment** | Portfolio and Company/scope surfaces search by authorized Organization, Company, scope name, or identifier and preserve unambiguous selected context without leaking inaccessible results or counts. |
| FR-115 | **Assessment** | Business Scope creation is a numbered guided flow with duplicate detection before persistence, backward correction, final Organization/Company review, and explicit confirmation. |
| FR-116 | **Assessment** | Permission presets are editable starting points; UI separates profile, state, explicit grants, scope assignments, and calculated effective access and previews sensitive access changes. |
| FR-117 | Context | Comparable KPI trends require compatible duration, scope, currency/basis, status, and rule version; otherwise show comparison unavailable and its reason. |
| FR-118 | Context | Rule/threshold changes require a reason and preview affected Work Versions while leaving Audit Versions unchanged. |
| FR-119 | Context | Priorities expose explicit severity, justified recommended deadline, qualitative effort, and an authorized contextual action without creating a task-management product. |
| FR-120 | Context | Work recalculation shows a traceable differential of KPI, reliability, cash impacts, and alerts created, changed, or resolved. |
| FR-121 | Context | Import conflicts show existing and incoming values, precise reason, and proposed correction side by side; the user explicitly ignores, replaces, or corrects. |
| FR-122 | Context | Before consolidated reporting, preview included scopes/period/KPI and every exclusion reason; output must exactly match the confirmed preview. |
| FR-123 | Context | Construction displays estimate at completion and, when non-calculable, exact applicable required inputs present and missing with resolution routes. |
| FR-124 | Context | Events display authoritative days-to-event and keep scenario confidence separate from data reliability and success probability; no confidence is invented without a validated rule. |
| FR-125 | Context | Work/Audit UI shows last recalculation and modification actor, separates readiness from officialization confirmations, and explains linked correction behavior. |
| FR-126 | Context | Copilot states its authorized-source boundary, links substantive claims to data/rule/evidence, timestamps summaries, and never persists internal model reasoning. |
| FR-127 | Context | Billing views expose last authoritative synchronization time; browser refresh cannot grant access before a valid processed webhook. |
| FR-128 | Context | Platform offer administration supports private, beta, published, and archived states and shows webhook processing latency and minimized Organization activity. |

## 7. Non-functional requirements

| ID | Scope | Requirement |
| --- | --- | --- |
| NFR-001 | **Assessment** | Zero cross-Organization leakage is tolerated across every protected read, write, relation, search, cache, job, file, export, evidence item, AI request, and administration path. |
| NFR-002 | **Assessment** | First-party authentication, password verification, server-side sessions, authorization, least privilege, recent-auth checks, throttling, and invalidation are server-enforced and fail closed. |
| NFR-003 | **Assessment** | Production-style traffic uses TLS; no secret, credential, invitation token, or real customer data is committed, documented, or logged. |
| NFR-004 | Context | Daily backups retain at least seven days initially; target RPO is 24 hours and target RTO is eight working hours, demonstrated by a documented restoration exercise. |
| NFR-005 | **Assessment** | Development and test use isolated configuration and synthetic non-sensitive data; no production access is required. |
| NFR-006 | **Assessment** | Errors, important transitions, latency, and availability produce structured, minimized, timestamped, correlation-friendly operational signals. |
| NFR-007 | Context | Release 3 Audit/Event/Trace evidence is server-generated and append-only during retention; correction is a linked event and authorized purge follows explicit retention rules. |
| NFR-008 | Context | Business results are reproducible for data/rule versions. Rules have stable IDs and versions; Work uses current validated rules while Audit retains historical versions. |
| NFR-009 | Context | AI respects rights, exposes insufficiency, executes no autonomous action, and uses the versioned rule engine for deterministic values; critical evaluation must pass repeatedly without leakage or invention. |
| NFR-010 | **Assessment** | Support current Chrome, Edge, Firefox, and Safari behavior across 360–767, 768–1199, and 1200+ px families without global horizontal scrolling. |
| NFR-011 | **Assessment** | Critical journeys are keyboard-usable with visible focus, clear labels/errors, non-color-only meaning, and text/table alternatives for important charts. Aim for WCAG 2.2 AA behavior without claiming certification. |
| NFR-012 | Context | Under the reference load, cockpit usable p95 is under two seconds, AI response p95 under 15 seconds, and monthly availability target is 99.5% excluding announced maintenance. |
| NFR-013 | Context | After covered access ends, customer access stops; recoverable data is retained for 90 days, active storage is purged at day 90, and final backup copies disappear within 30 additional days, subject to separately applicable retention. |
| NFR-014 | Context | Production accounts belong to NOVA where possible and delivered configuration contains no secrets. |
| NFR-015 | **Assessment** | Delivery includes essential technical documentation, repeatable setup/migration/deployment procedures, final verification, and correction of blocking defects. |
| NFR-016 | Context | AI providers receive only minimal authorized encrypted data, cannot train on it, have approved region/subprocessors/retention/deletion, and receive no secrets or internal reasoning. |
| NFR-017 | **Assessment** | Canonical domain data is independent of manual, import, or future connector channels; provider-specific behavior remains inside adapters and no real connector is required. |
| NFR-018 | **Assessment** | Required invitation and password-reset emails are sent through Resend using a server-side API key, a verified sender, and allowlisted versioned templates; automated tests remain deterministic through the same outbound port. |

## 8. Cross-cutting data and rule contracts

### Canonical data

- Monetary values use decimal arithmetic, an explicit ISO currency, and explicit tax basis.
- Dates, periods, units, actual/estimated/forecast state, source, actor, freshness, and version are explicit.
- `null` is never converted to zero. Division by missing or zero denominators yields non-calculable.
- Aggregation and comparison require compatible definition, unit, period, currency/basis, status, scope, and rule version.
- Data provenance is generated from the actual channel: `MANUAL`, `IMPORT`, or a future `CONNECTOR`.

### Deterministic rules and reliability

- Important calculations and thresholds have stable identifiers, versions, typed inputs, units, period semantics, boundary cases, and executable reference cases.
- Rules produce deterministic KPI, alerts, contributions, ranking, and reliability. AI may explain those outputs but cannot replace them.
- Reliability is a 0–100 score with separately visible completeness, freshness, validation, and consistency components. Missing data and coverage remain visible.
- A data change invalidates only dependent results. An Audit Version retains the exact rule and data versions used.

### Work and Audit

- Work is mutable under current access; Audit is an immutable, self-contained official snapshot.
- Officialization records data, reservations, results, rule/threshold versions, lineage, and a deterministic integrity fingerprint.
- Correction creates a linked new Work Version and later a new Audit Version; it never mutates the prior official snapshot.

### Retention and access end

- Access state, billing state, and user state remain independent; effective access is their intersection with current capabilities and scopes.
- Reactivation in one dimension never clears another suspension reason.
- Background work is reauthorized before execution and before result delivery.
- Retention notices identify the Organization and scheduled deletion date without exposing business data.

### Future integration boundary

- Rules, KPI, cockpits, IAM, Audit, and exports consume the canonical model, not provider schemas.
- Every future integration uses an adapter for external identity, authentication, pagination, limits, scheduling/webhooks, mapping, and errors.
- Incoming tenant/scope identifiers are references, never authority. The server resolves Organization, Company, and Business Scope.
- Repeated delivery is idempotent; connector failure is isolated and observable; manual entry and imports remain available.

## 9. Required product states and errors

Critical screens provide loading, empty, success, validation-error, access-changed, conflict, retryable-failure, and unavailable states. Public errors use stable non-sensitive codes and a correlation identifier. Inaccessible and nonexistent tenant-owned resources are not distinguishable to an unauthorized caller.

For this assessment:

- Organization access lifecycle is `PROVISIONING → ACTIVE ↔ SUSPENDED`, with `DISABLED` terminal.
- Companies and Business Scopes use `ACTIVE | INACTIVE`; Company deactivation is blocked while an active scope exists.
- Collaborator lifecycle distinguishes invitation, active membership, suspension, logical removal, promotion, and ownership proposal/acceptance.
- Sensitive commands use optimistic versioning or locking, stable idempotency, and atomic evidence.

## 10. Product-wide exclusions

The V1 product does not include native mobile applications, a native task-management module, autonomous AI execution, generic document management, OCR/signature workflows, real bank/accounting/ERP/point-of-sale connectors, massive migration, a public partner API, independent certification, or a commercial CRM.

Public customer self-registration and externally delegated authentication are not part of the target authentication model. Customer accounts originate from authorized invitations.

The technical assessment additionally excludes implementation of billing, sector cockpits and KPI, imports beyond synthetic seed data, Release 3 Audit/consolidation/reports, the conversational copilot, and real external connectors. These remain architecture context only.

## 11. Acceptance principles

- Tenant isolation, access enforcement, and non-invention of critical data are blocking qualities.
- Tests cover nominal, boundary, invalid, unauthorized, stale, replayed, and concurrent cases.
- Two Organizations are used in executable negative tests, including context reuse on the same database connection.
- A clean clone can be configured, migrated, seeded, started, tested, and built with documented commands.
- Documentation states what is complete, deferred, simulated, or known to be incomplete.

For the exact candidate deliverables, priorities, suggested timing, and evaluation criteria, use [ASSESSMENT.md](../../ASSESSMENT.md).
