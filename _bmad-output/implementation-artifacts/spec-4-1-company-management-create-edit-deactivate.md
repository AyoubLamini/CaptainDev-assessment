---
title: '4-1 Company Management (Create, Edit, Deactivate)'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '79c58e9a15b2d9f974f1596af9fb87a2ffe80560'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Organization Administrators currently have no way to manage the Companies that belong to their Organization. They need to be able to create new Companies, edit their details, and deactivate them safely.

**Approach:** Extend the Company Prisma model with necessary fields (name, isActive or status). Build the API endpoints (create, update, deactivate) ensuring deactivation is blocked if the Company has active BusinessScopes. Build the corresponding frontend UI for Org Admins to manage these companies.

## Boundaries & Constraints

**Always:**
- Secure endpoints so only Organization Administrators (or authorized members) can manage Companies for their Organization.
- Deactivating a Company MUST fail (with a descriptive error) if it has any active BusinessScope associated with it.
- Never write to or revert changes to sprint-status.yaml; it is owned by the orchestrator.
- If the story's acceptance criteria include actions only a HUMAN can perform outside the repo: complete every part an agent CAN do, commit it, then finalize the spec frontmatter to status: awaiting-operator and enumerate what is owed under an operator_actions key (a YAML list of strings). Never use blocked for this.

**Block If:**
- Clarification is needed on whether soft-delete or strict deactivation is required beyond setting a status flag, and it's not answerable from existing context.

**Never:**
- Allow cross-organization data leakage.
- Bypass the active scope check during company deactivation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create Company | Valid payload (name) | Company created and returned | Returns 400 for invalid data |
| Edit Company | Valid payload, existing Company | Company updated and returned | Returns 404 if not found, 403 if unauthorized |
| Deactivate Company (Safe) | Company with NO active scopes | Company status set to inactive | Returns 404 if not found |
| Deactivate Company (Unsafe) | Company WITH active scopes | Deactivation blocked | Returns 400 or 409 Conflict with message |

</intent-contract>

## Code Map

- apps/api/prisma/schema.prisma -- Add name and status fields to Company model. Add isActive or status field to BusinessScope to support the active check constraint.
- apps/api/src/modules/org-admin/org-admin.module.ts -- Register new controllers and services.
- apps/api/src/modules/org-admin/company.controller.ts -- API endpoints for Company CRUD.
- apps/api/src/modules/org-admin/company.service.ts -- Business logic for Company management and scope validation.
- apps/web/src/app/(org-admin)/companies/page.tsx -- Frontend page to list and manage companies.

## Tasks & Acceptance

**Execution:**
- apps/api/prisma/schema.prisma -- Add name (String) and status to Company. Ensure BusinessScope has a status field to check for "active scopes". Generate Prisma client.
- apps/api/src/modules/org-admin/company.service.ts -- Implement createCompany, updateCompany, and deactivateCompany methods. Ensure deactivateCompany checks for active BusinessScopes.
- apps/api/src/modules/org-admin/company.controller.ts -- Implement REST endpoints and guard them for Organization Administrators.
- apps/web/src/app/(org-admin)/companies/page.tsx -- Implement a UI list with create/edit/deactivate actions for Companies.

**Acceptance Criteria:**
- Given an Organization Administrator, when they submit valid Company details, then the Company is created.
- Given an existing Company, when an Administrator edits it, then the changes are saved.
- Given a Company without active scopes, when an Administrator deactivates it, then it becomes inactive.
- Given a Company with active scopes, when an Administrator attempts to deactivate it, then the action is blocked and an error is shown.

## Spec Change Log

## Review Triage Log

## Design Notes

- The deactivation check is a critical business rule. BusinessScope must have a defined state representing "active". If BusinessScope currently lacks a status, introduce a basic one (e.g., isActive: Boolean or enum) to satisfy the constraint check.

## Verification

**Commands:**
- npm run build -- expected: Builds successfully across all apps.
- npm run test -- expected: All unit tests pass, especially the service logic checking for active scopes during deactivation.

## Auto Run Result

Status: done
Blocking condition: None
