# CaptainDev Assessment Submission

This submission implements the required vertical slices for the CaptainDev NOVA SaaS technical assessment, covering SaaS Foundation & Platform Administration and Client-side Collaborative Administration. It delivers secure authentication, strict multi-tenant data isolation via PostgreSQL RLS, organization lifecycle management, and a comprehensive Next.js administration dashboard.

## Delivered Scope
- **SaaS Foundation & Platform Administration**: Complete. Implements secure platform administration, organization provisioning, invitation workflows, and RLS-based multi-tenant isolation.
- **Client-side Collaborative Administration**: Complete. Implements business scope creation, advanced collaborator invitation, explicit permission grants, and atomic ownership transfer.
- **Authentication**: Complete. First-party email/password login, secure server-side sessions, single-use invitations, and password reset flows.
- **Email Delivery**: Complete. Real transactional email delivery through Resend.

## Known Limitations & Setup Caveats
- **Local Development**: For local development, HTTP cookies are allowed, but production deployment strictly requires HTTPS for `__Host-` prefixed secure session cookies to work.
- **Database Role**: The `postgres` superuser is used in the default `.env` for setup and migrations. However, at runtime, the application automatically drops privileges to the restrictive `nova_app` PostgreSQL role during transactions to enforce Row-Level Security (RLS). You do not need to configure a separate database user.
- **Setup**: See [README.md](README.md) for full project setup, database seeding, and running instructions.

## Test Results
All quality gates and test suites are passing securely:
- **Linting and Type Checking**: Passed
- **Unit Tests (API)**: Passed
- **Integration & Negative Isolation (RLS) Tests**: Passed (Ensures strictly isolated multi-tenant operations)
- **End-to-End Test Suite (Web)**: Passed

## Demonstration
Loom Video URL: https://www.youtube.com/watch?v=77ipdWyQ_TI
