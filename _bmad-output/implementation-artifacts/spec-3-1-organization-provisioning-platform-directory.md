---
title: 'Story 3.1: Organization Provisioning & Platform Directory'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
deferred:
  - summary: >-
      Mock-only verification of Platform Organizations database transactions.
    evidence: |-
      The service tests mock the database integration entirely using vi.fn(). There are no assertions running against a real database instance to verify transaction boundaries and schema constraints.
    location: >-
      apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts
    severity: medium
baseline_revision: '9b3c2b23960f9886d0497e7ed93edf4b7547415e'
---

<intent-contract>

## Intent

**Problem:** Platform administrators currently have no way to provision new organizations, track their lifecycle (PROVISIONING, ACTIVE, SUSPENDED, DISABLED), manage their commercial status (DEMO, PILOT, ACTIVE), or securely view a list of all organizations.

**Approach:** Extend the `Organization` Prisma schema with independent access and commercial status dimensions using Enums. Expose secure `POST /platform/organizations` (for provisioning) and `GET /platform/organizations` (server-paginated directory) endpoints restricted to Platform Administrators.

## Boundaries & Constraints

**Always:**
- Keep commercial and access statuses completely separate in the schema.
- The `GET` endpoint must only expose support-safe metadata (no business data) and must implement server-side pagination.
- Operations must be strictly guarded by a Platform Administrator authorization guard.
- Every organization creation must emit a corresponding Evidence record.

**Block If:**
- Platform Administrator authorization guard is missing or cannot be resolved.

**Never:**
- Never return tenant-specific business data in the directory endpoint.
- Never use the tenant bypass in this context.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Provision organization | `POST` with valid initial commercial status | Returns 201 with Organization ID and initial statuses (`PROVISIONING` access, requested commercial) | 400 for invalid data; 401/403 for unauthorized |
| Fetch directory page 1 | `GET` with limit=10, page=1 | Returns 200 with 10 records of support-safe metadata and pagination info | 401/403 for unauthorized |
| Missing Platform Admin role | Any endpoint hit by normal identity | 403 Forbidden | Ensure no data leakage |

</intent-contract>

## Code Map

- `apps/api/prisma/schema.prisma` -- Needs `OrganizationAccessStatus` and `OrganizationCommercialStatus` enums. Added to `Organization` along with concurrency versioning (`updatedAt`). Update `Evidence` to include full evidence footprint.
- `apps/api/src/modules/platform-admin/platform-admin.module.ts` -- Existing module to host the new controllers and services.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.ts` -- New controller for the endpoints.
- `apps/api/src/modules/platform-admin/platform-organizations.service.ts` -- New service containing business logic and pagination for the directory.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.spec.ts` -- Unit tests for edge cases in the controller.
- `apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts` -- Unit tests for edge cases in the service.

## Tasks & Acceptance

**Execution:**
- `apps/api/prisma/schema.prisma` -- Add `OrganizationAccessStatus` and `OrganizationCommercialStatus` enums. Add `accessStatus`, `commercialStatus`, and `updatedAt` to `Organization`. Add `createdAt`, `reason`, `before`, and `after` fields to the `Evidence` model. Update model. Run `npx prisma format` and `npx prisma generate`.
- `apps/api/src/modules/platform-admin/dto/provision-organization.dto.ts` -- Create DTO for provisioning an organization, collecting `name`, `commercialStatus`, and `reason` (with `@IsNotEmpty()`, `@MaxLength()`).
- `apps/api/src/modules/platform-admin/platform-organizations.service.ts` -- Implement `provisionOrganization` (collects reason, creates organization + evidence in a transaction) and `getDirectory` (paginated, filters out 'System' internal org).
- `apps/api/src/modules/platform-admin/platform-organizations.controller.ts` -- Expose the endpoints, properly enforcing 401/403 from the guard.
- `apps/api/src/modules/access-control/guards/platform-admin.guard.ts` -- Implement guard properly returning 401 Unauthorized for missing session, and handling boundary checks safely.
- `apps/api/src/modules/platform-admin/platform-admin.module.ts` -- Register components and import `DatabaseModule`.
- `apps/api/src/modules/platform-admin/platform-organizations.controller.spec.ts` -- Write test asserting 401/403 edge cases and successful provisioning.
- `apps/api/src/modules/platform-admin/platform-organizations.service.spec.ts` -- Write test for pagination boundaries and system organization filtering.

**Acceptance Criteria:**
- Given a Platform Administrator, when they provision an organization, then the database records the new organization in `PROVISIONING` state and emits an Evidence record.
- Given a Platform Administrator, when they fetch the directory, then they receive a paginated list containing only support-safe metadata (id, name, statuses, createdAt).
- Given a non-Platform Administrator, when they attempt these actions, then they receive a 403 Forbidden.

## Spec Change Log

- Trigger: Missing Evidence fields, concurrency versioning, provisioning reason, System org filtering, and test coverage (bad_spec).
- Amendment: Added instructions to `schema.prisma` to include `updatedAt`, `createdAt`, `reason`, `before`, `after` in models. Added `reason` to DTO. Added test files and filter logic to Code Map and Tasks.
- Avoided state: Insufficient evidence footprint, lack of concurrency control, broken pagination tests.
- KEEP: Keep the enum definitions, the base `PlatformAdminGuard` structure, and the service transactions structure.

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 4: (high 3, medium 1, low 0)
- patch: 8: (high 2, medium 6, low 0)
- defer: 1: (high 0, medium 1, low 0)
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` Spec failed to mandate full `Evidence` schema fields (reason, before, after) and `Organization` concurrency control (`updatedAt`). Loopback triggered to amend schema map.
  - `[high]` `[bad_spec]` Spec failed to require automated unit/integration tests covering the I/O edge cases. Loopback triggered to add test tasks.
  - `[high]` `[bad_spec]` Spec failed to instruct the API to collect `reason` during provisioning. Loopback triggered to update DTO and service logic.
  - `[medium]` `[bad_spec]` Spec failed to specify filtering out the internal `System` org from the directory. Loopback triggered to update service task.

### 2026-08-18 — Review pass 2
- intent_gap: 0
- bad_spec: 0
- patch: 14: (high 5, medium 7, low 2)
- defer: 1: (high 0, medium 1, low 0)
- reject: 0
- addressed_findings:
  - `[high]` `[patch]` Evidence Prisma model missing reason, before, after, createdAt fields.
  - `[high]` `[patch]` Organization Prisma model missing updatedAt.
  - `[high]` `[patch]` ProvisionOrganizationDto missing reason field and whitespace trim.
  - `[high]` `[patch]` provisionOrganization service method missing reason, before, after payload.
  - `[high]` `[patch]` getDirectory service method not filtering SYSTEM org and count mismatch.
  - `[medium]` `[patch]` Pagination page/limit lack boundary validation.
  - `[medium]` `[patch]` Missing test coverage for guard logic (mock-only).
  - `[medium]` `[patch]` req cast as any in Guard, throws 403 instead of 401 for missing session.
  - `[medium]` `[patch]` Missing ValidationPipe in controller.
  - `[low]` `[patch]` Hardcoded SYSTEM string.
  - `[low]` `[patch]` Hardcoded action string in Evidence.

### 2026-08-18 — Review pass 3
- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 2, medium 5, low 2)
- defer: 1: (high 0, medium 1, low 0)
- reject: 0
- addressed_findings:
  - `[high]` `[patch]` Migration failure risk: Organization added required fields without @default values.
  - `[high]` `[patch]` Incomplete SYSTEM organization upsert: missing update fields for required columns.
  - `[medium]` `[patch]` Missing whitespace trimming for reason in ProvisionOrganizationDto.
  - `[medium]` `[patch]` Missing verification of session expiration in PlatformAdminGuard tests.
  - `[medium]` `[patch]` Missing verification of pagination limit clamping in directory endpoint tests.
  - `[medium]` `[patch]` Missing foreign key relation for actorId in Evidence model.
  - `[medium]` `[patch]` Controller manual pagination clamping instead of using DTO validation.
  - `[low]` `[patch]` Hardcoded enum values used instead of Prisma enums in AuthService and tests.
  - `[low]` `[patch]` Missing explicit return types on controller and service methods.

## Design Notes

## Verification

**Commands:**
- `npm run lint` -- expected: Passes without errors.
- `npm run build` -- expected: API builds successfully with the new Prisma schema and modules.
- `npm run test` -- expected: Test suites pass.


**Manual checks (if no CLI):**
- Verify the DB schema includes the new enums and fields.
- Verify the API endpoints are guarded by the appropriate Platform Admin decorators/guards.

## Auto Run Result

Status: done
Summary: Organization provisioning and platform directory API endpoints have been implemented.

