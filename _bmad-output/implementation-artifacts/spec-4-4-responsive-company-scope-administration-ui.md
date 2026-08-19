---
title: '4-4 Responsive Company & Scope Administration UI'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_commit: 'd38accdc2e795b8cb9c0cd74ed007fb6e8196fb3'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The existing company management UI is a crude, unstyled prototype. Organization Administrators need a responsive, professional interface to manage Companies, create Business Scopes through a guided flow, and search across authorized entities.

**Approach:** Overhaul `apps/web/src/app/(org-admin)/companies/page.tsx` and add necessary sub-pages/components to provide a responsive UI. We will configure and use Tailwind CSS for all styling, integrating the search and business scope endpoints.

## Boundaries & Constraints

**Always:**
- Use standard React/Next.js conventions for routing and state.
- Connect to existing backend endpoints (`/api/org-admin/:orgId/companies`, `/api/org-admin/:orgId/companies/:companyId/scopes`, `/api/org-admin/:orgId/search`).
- Ensure the UI is responsive across desktop and mobile form factors using Tailwind CSS utility classes.

**Ask First:**
- If you need to install any UI component libraries beyond base Tailwind CSS (like Headless UI, Radix, etc.).

**Never:**
- Do not modify backend endpoints; they are already built.

</frozen-after-approval>

## Code Map

- `apps/web/tailwind.config.ts` -- Tailwind configuration file.
- `apps/web/src/app/globals.css` -- Global CSS for Tailwind directives.
- `apps/web/src/app/(org-admin)/companies/page.tsx` -- Main entry for Company list, creation, and deactivation.
- `apps/web/src/app/(org-admin)/companies/[companyId]/scopes/new/page.tsx` -- Page for the guided Business Scope creation flow.
- `apps/web/src/app/(org-admin)/search/page.tsx` -- Global search interface for authorized Companies and Scopes.
- `apps/web/src/components/` -- Add any reusable UI components here (e.g., Modals, Forms, Search bars).

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/` -- Install `tailwindcss`, `postcss`, and `autoprefixer`, and initialize `tailwind.config.ts` and `postcss.config.mjs`. Add Tailwind directives to the global CSS.
- [x] `apps/web/src/app/(org-admin)/companies/page.tsx` -- Refactor the existing crude UI into a responsive Tailwind-styled layout. Ensure company creation, editing, and deactivation work seamlessly.
- [x] `apps/web/src/app/(org-admin)/companies/[companyId]/scopes/new/page.tsx` -- Implement the guided flow to create Business Scopes for a specific company, consuming the POST endpoint, styled with Tailwind.
- [x] `apps/web/src/app/(org-admin)/search/page.tsx` -- Build a search page that calls the search API and displays Companies and Scopes securely, styled with Tailwind.
- [x] `apps/web/src/app/layout.tsx` or `apps/web/src/components/` -- Add global navigation/layout to easily access Companies and Search.

**Acceptance Criteria:**
- Given I am an Organization Administrator, when I view the companies list, then it is displayed in a responsive, styled layout.
- Given I want to create a Business Scope, when I navigate to the company's scopes section, then I am guided through a form that successfully submits to the API.
- Given I want to find a company, when I use the search page, then results are fetched from the API and displayed clearly.

## Spec Change Log

## Verification

**Commands:**
- `npm run build` -- expected: Builds successfully across all apps.
- `npm run test` -- expected: Tests run successfully.

## Suggested Review Order

**Tailwind Integration**
- Configures Tailwind CSS within PostCSS 8 to match version 4 conventions.
  [postcss.config.mjs:1](../../apps/web/postcss.config.mjs#L1)

**Responsive Layout Navigation**
- Modifies the global layout container so top-level links remain accessible on mobile.
  [layout.tsx:25](../../apps/web/src/app/layout.tsx#L25)

