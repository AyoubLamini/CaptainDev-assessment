---
title: '4-3 Authorized Company & Scope Search'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Users and Administrators need to search for Companies and Business Scopes by name or identifier to quickly locate entities they are authorized to access, without exposing data from other Organizations or leaking pagination counts.

**Approach:** Build a search endpoint that takes a search query and returns matching Companies and Business Scopes. The search must be strictly scoped to the user's authorized Organization and respect explicit capability constraints. Pagination counts must also be securely filtered.

## Boundaries & Constraints

**Always:**
- Strictly isolate search results and counts to the authorized Organization.
- Filter out any Companies or Scopes that belong to a different Organization.
- Support searching by Company name, Scope name, and Scope external identifier.

**Block If:**
- Authorization logic for scope access (beyond organization isolation) is completely undefined in the existing codebase and cannot be safely inferred.

**Never:**
- Never return records from another Organization.
- Never leak inaccessible result counts in pagination metadata.
- Never write to or revert changes to sprint-status.yaml.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid Search | Valid query string | Returns matching Companies and Scopes within Org | No error expected |
| Empty Query | Empty query string | Returns empty results or all authorized records | No error expected |
| Cross-Org Attack | Searching for a known name in another Org | Returns empty results / no count leakage | No error expected |

</intent-contract>

## Code Map

- \pps/api/src/modules/org-admin/search.controller.ts\ -- New controller for cross-entity search endpoint.
- \pps/api/src/modules/org-admin/search.service.ts\ -- Logic to perform secure search queries via Prisma.
- \pps/api/src/modules/org-admin/org-admin.module.ts\ -- Register new controller and service.

## Tasks & Acceptance

**Execution:**
- \pps/api/src/modules/org-admin/search.service.ts\ -- Implement secure search query against Prisma \Company\ and \BusinessScope\ models filtered by \organizationId\.
- \pps/api/src/modules/org-admin/search.controller.ts\ -- Expose REST endpoint for search.
- \pps/api/src/modules/org-admin/org-admin.module.ts\ -- Add \SearchController\ and \SearchService\.

**Acceptance Criteria:**
- Given I submit a search query, when the results are returned, then only Companies and Scopes within my Organization are included.
- Given I submit a search query, when the results are returned, then pagination counts reflect only authorized records.
- Given two Organizations have identically named Companies, when I search by that name, then only my Organization's Company appears in my results.

## Spec Change Log

## Review Triage Log

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

- The endpoint returns separate arrays for Companies and Scopes. Given the schema, separate arrays with their respective totalCounts work best.
- The search uses Prisma's \contains\ filter with \mode: 'insensitive'\ on names.

## Verification

**Commands:**
- \
pm run build\ -- expected: Builds successfully across all apps.
- \
pm run test\ -- expected: All unit tests pass.

## Auto Run Result

Status: done
Blocking condition: None

**Summary:** 
Implemented a new Authorized Company & Scope Search API endpoint conforming strictly to PRD security constraints by leveraging robust server-side data isolation.

**Files changed:**
- apps/api/src/modules/org-admin/search.controller.ts (new search endpoint route)
- apps/api/src/modules/org-admin/search.service.ts (business logic restricting access by organizationId)
- apps/api/src/modules/org-admin/search.service.spec.ts (comprehensive tests mapping securely to the Matrix scenarios)
- apps/api/src/modules/org-admin/org-admin.module.ts (module provider/controller wiring)

**Review findings breakdown:** 
patches applied: 0, deferred: 0, rejected: 0

**Follow-up review recommendation:** false
**Verification performed:** pnpm test and pnpm build both completed with no failing errors. Matrix test audit fully successful. No residual risks.
