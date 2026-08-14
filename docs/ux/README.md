# UX Reference Pack

The mockups communicate hierarchy, navigation, dark visual direction, responsive composition, and the expected clarity of sensitive actions. NOVA is a fictional assessment brand. Product and security documents remain authoritative for behavior.

PNG images may contain French interface copy. Implement clear English labels while preserving intent.

## Core functional mockups

| File | Use |
| --- | --- |
| [`core/platform-organization-directory-reference.png`](core/platform-organization-directory-reference.png) | Minimized Organization directory/detail layout only. Ignore billing, catalog, Stripe, Audit, Copilot, and other navigation entries. |
| [`core/companies-and-scopes-desktop.png`](core/companies-and-scopes-desktop.png) | Company/scope hierarchy, search, selection, and administration. Ignore portfolio KPI or Audit content. |
| [`core/create-business-scope-desktop.png`](core/create-business-scope-desktop.png) | Guided creation structure, context confirmation, and duplicate-aware review. Financial data entry, cadence, and domain cockpit setup are outside scope. |
| [`core/users-and-permissions-desktop.png`](core/users-and-permissions-desktop.png) | Collaborator states, presets, explicit grants, scopes, and sensitive actions only. Ignore KPI, alert, recommendation, import, work-mode, export, Copilot, and Audit navigation. |
| [`core/user-suspension-mobile-reference.png`](core/user-suspension-mobile-reference.png) | Consequence-first mobile suspension state only. Billing wording is illustrative and does not introduce billing requirements. |

## Optional style references

| File | Use |
| --- | --- |
| [`style-reference/portfolio-desktop.png`](style-reference/portfolio-desktop.png) | Dark desktop shell and visual hierarchy only |
| [`style-reference/portfolio-mobile.png`](style-reference/portfolio-mobile.png) | Responsive visual direction only |

The portfolio content, alerts, KPIs, and operational dashboard behavior shown in the optional style references are outside this assessment.

## Interpretation rules

- Preserve the dark application direction and semantic status colors.
- Never rely on color alone; include text, iconography, or state labels.
- Keep current Organization, Company, and business-scope context explicit.
- Hide unauthorized actions without treating UI hiding as authorization.
- Explain the consequences of suspension, removal, promotion, and ownership transfer before confirmation.
- Show authoritative server outcomes, including conflict and access-changed states.
- Recompose from 360 px upward without removing functionality.
- If visual copy conflicts with product or security requirements, follow the higher-authority document.
