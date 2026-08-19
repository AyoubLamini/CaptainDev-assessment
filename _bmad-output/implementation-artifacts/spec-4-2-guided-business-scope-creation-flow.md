---
title: '4-2 Guided Business Scope Creation Flow'
type: 'feature'
created: '2026-08-19'
status: 'in-review'
baseline_revision: 'e7f0743cf06ae29aa30f10d4037a202fcbb0900c'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
deferred:
  - summary: >-
      The frontend wizard page (`scopes/new/page.tsx`) uses a hardcoded fallback UUID for `organizationId`.
    evidence: |-
      The component is not connected to any Next.js layout session provider yet, and the codebase lacks standard session extraction contexts for this feature module. A full fix requires integrating dynamic session context.
  - summary: >-
      The duplicate name normalization is rudimentary (only trimming) and is case-sensitive due to PostgreSQL defaults.
    evidence: |-
      Semantic duplicates with different casing will bypass the exact-string unique database constraint. The intent asked for "normalized name", but a case-insensitive constraint requires schema extensions (e.g. citext) out of scope.
  - summary: >-
      The wizard lacks a Cancel button and disabling state during submission.
    evidence: |-
      This could lead to a poorer UX but does not break the feature intent.

---

<intent-contract>

## Intent

**Problem:** Organization Administrators need to create Business Scopes, but doing so without a structured process risks data duplication, missed fields, and errors. A guided flow is needed to ensure scopes are created correctly the first time and duplicate checking is enforced before persistence.

**Approach:** Update the `BusinessScope` schema to include the missing fields (type, name, external identifier, location, responsible person, created-by actor). Implement a multi-step UI wizard for creation that includes a final review step. Implement duplicate detection on the backend (matching company, type, normalized name, and external identifier) to reject identical scopes before creation.

## Boundaries & Constraints

**Always:**
- Ensure the flow is numbered and allows backward navigation without losing state until final submission.
- Ensure duplicate detection runs server-side before persisting data.
- Ensure provenance fields (created-by actor, server-generated timestamp) are set securely server-side.
- Ensure the API is secured and isolated to the authenticated user's Organization.
- Do not write to `sprint-status.yaml`.

**Block If:**
- There is any ambiguity about the UI steps required that cannot be resolved with reasonable standard wizard patterns.

**Never:**
- Persist data before the final confirmation step is explicitly submitted.
- Bypass duplicate detection for concurrent submissions (rely on database constraints where possible).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid Creation | Unique scope data submitted on final step | Scope created and returned, provenance set | No error expected |
| Duplicate Scope | Scope data matching existing Company + type + normalized name + external ID | Creation rejected, matching scope details returned | 409 Conflict with details |
| Concurrent Duplicate | Two identical submissions simultaneously | One succeeds, the other fails | Database unique constraint violation caught and mapped to 409 |
| Incomplete Data | Submission missing required fields | Rejected | 400 Bad Request |

</intent-contract>

## Code Map

- `apps/api/prisma/schema.prisma` -- Add `BusinessScopeType` enum. Update `BusinessScope` to include `type`, `name`, `externalId` (String with default ""), `location`, `responsiblePerson`, `createdById`. Add unique constraint for duplicate detection. (Note: `externalId` must default to `""` instead of `null` so that Postgres `@@unique` correctly prevents concurrent duplicates).
- `apps/api/src/modules/org-admin/business-scope.controller.ts` -- API endpoints for scope creation, including validation and duplicate handling.
- `apps/api/src/modules/org-admin/business-scope.service.ts` -- Business logic for creation, setting provenance fields, and duplicate detection.
- `apps/api/src/modules/org-admin/org-admin.module.ts` -- Register the new controller and service.
- `apps/web/src/app/(org-admin)/companies/[companyId]/scopes/new/page.tsx` -- Multi-step wizard page for Business Scope creation.
- `apps/web/src/components/business-scope/ScopeCreationWizard.tsx` -- Wizard component managing state and backward navigation.

## Tasks & Acceptance

**Execution:**
- `apps/api/prisma/schema.prisma` -- Add `BusinessScopeType` enum (RESTAURANT, PROPERTY_DEVELOPMENT, CONSTRUCTION, EVENT). Add `type`, `name`, `externalId` (make this `String @default("")` to avoid PostgreSQL `NULL != NULL` uniqueness loophole), `location`, `responsiblePerson`, `createdById` to `BusinessScope`. Add a unique compound constraint (`companyId`, `type`, `name`, `externalId`) to prevent concurrent duplicates.
- `apps/api/src/modules/org-admin/business-scope.service.ts` -- Implement scope creation logic. Ensure `createdById` is set to the authenticated user. Implement duplicate check providing existing scope details on conflict. Map Prisma `P2002` error to a 409 Conflict exception.
- `apps/api/src/modules/org-admin/business-scope.controller.ts` -- Implement REST endpoint for creation, ensuring guards for Org Admin access are applied. Ensure explicit validation checks for required fields to throw `BadRequestException`.
- `apps/api/src/modules/org-admin/org-admin.module.ts` -- Wire up controller and service.
- `apps/web/src/app/(org-admin)/companies/[companyId]/scopes/new/page.tsx` -- Create the Next.js page hosting the wizard.
- `apps/web/src/components/business-scope/ScopeCreationWizard.tsx` -- Implement a numbered multi-step form: step 1 (details), step 2 (location/person), step 3 (review). Ensure data is not submitted until step 3.

**Acceptance Criteria:**
- Given I initiate Business Scope creation, when I progress through the guided steps, then the flow is numbered, I can navigate backward to correct earlier inputs, and no data is persisted until I reach the final confirmation step.
- Given I reach the final review step, when the step is displayed, then it shows the full Organization and Company context alongside all scope details for explicit confirmation before submission.
- Given I submit a scope whose Company + type + normalized name + external identifier (when provided) match an existing scope, when duplicate detection runs, then the server rejects the creation before persisting, returns details of the matching scope, and the guided flow remains open for correction.
- Given a successfully confirmed scope creation, when the submission completes, then the Business Scope is persisted with: Company reference, type, name, optional external identifier, location, operational status, and responsible person, and provenance fields are set server-side.

## Spec Change Log

### 2026-08-19 — Resolved intent gap in Postgres unique constraint behavior
- Triggering finding: In PostgreSQL, `NULL != NULL`, so a compound `@@unique` constraint covering `externalId` would fail to prevent concurrent duplicates when `externalId` is `null`.
- Amended: `Code Map` and `Tasks & Acceptance` for `schema.prisma`.
- Avoided state: Database allows multiple identical scopes if their optional `externalId` is left null.
- KEEP instructions: Keep the Next.js multi-step wizard component, the service logic with `P2002` Prisma error mapping, the frontend duplicate conflict display, and the test structures. Keep the controller's manual body validation (if no DTOs are used in the codebase).

## Review Triage Log

### 2026-08-19 — Review pass 0
- intent_gap: 0
- bad_spec: 1: (high 1, medium 0, low 0)
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` The unique constraint relies on a nullable `externalId`, meaning PostgreSQL will not trap concurrent duplicates since `NULL != NULL`.

### 2026-08-19 — Review pass 1
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 1, medium 2, low 2)
- defer: 3: (high 0, medium 1, low 2)
- reject: 0
- addressed_findings:
  - `[high]` `[patch]` The implementation mapped the name without trimming, meaning whitespace variations bypass duplicate protection. Added `.trim()` mapping.
  - `[medium]` `[patch]` The controller success path lacked unit test assertions. Added controller tests asserting service parameter mapping.
  - `[medium]` `[patch]` `page.tsx` contained an inline duplicate of the wizard. Removed it in favor of the imported component.
  - `[low]` `[patch]` The controller payload mapping accepted an optional `id` which shouldn't be client-provided. Filtered it.
  - `[low]` `[patch]` The service tests did not assert the correct payload when calling the Prisma mock. Fixed test assertion to include `organizationId`.

## Verification

**Commands:**
- `npm run build` -- expected: Both API and Web build successfully.
- `npm run test` -- expected: Any added tests for the service duplicate detection pass.

