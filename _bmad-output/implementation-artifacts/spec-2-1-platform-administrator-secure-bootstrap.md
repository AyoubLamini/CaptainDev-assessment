---
title: 'Platform Administrator Secure Bootstrap'
type: 'feature'
created: '2026-08-18'
status: 'awaiting-operator'
baseline_revision: 'e85da56b12f9ea0cb3abd940f5b120944934f2aa'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
operator_actions:
  - 'Run the bootstrap script in the production environment using valid secure environment variables.'
---

<intent-contract>

## Intent

**Problem:** The platform requires an initial administrator account to log in and manage the system, but there is currently no secure way to bootstrap this account with a properly hashed password and platform-admin capabilities without violating security invariants.

**Approach:** Introduce a CLI bootstrap script that creates a Platform Administrator identity with a secure Argon2id-hashed password credential. Add a role capability indicator for platform administration to the schema so the application can distinguish platform admins from regular users.

## Boundaries & Constraints

**Always:**
- Use `argon2` for password hashing with exactly `m=19456`, `t=2`, `p=1` (per SEC-14).
- Ensure the bootstrap script handles concurrency or re-runs safely via an `upsert`.
- Require a secure password of at least 15 characters (per SEC-14).

**Block If:**
- `argon2` library cannot be installed or used in the environment.

**Never:**
- Never hardcode a production default password. The script must require the password via environment variables.
- Never write or revert changes to `sprint-status.yaml` (orchestrator-owned).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Missing variables | `ADMIN_EMAIL` or `ADMIN_PASSWORD` absent | Script halts before creating account | Throws error describing missing variables |
| Password too short | `ADMIN_PASSWORD` < 15 chars | Script halts before creating account | Throws error requiring 15+ char password |
| Account already exists | `ADMIN_EMAIL` exists in DB | Updates existing account password securely | No error expected |
| Valid execution | Valid env vars | Creates `Identity` with `isPlatformAdmin=true` and hashed `PasswordCredential` | No error expected |

</intent-contract>

## Code Map

- `apps/api/package.json` -- Needs `argon2` dependency and a `"bootstrap"` npm script.
- `apps/api/prisma/schema.prisma` -- Needs `isPlatformAdmin` boolean on the `Identity` model to satisfy SEC-10 control-plane limits.
- `apps/api/prisma/seed.ts` -- Reference point; bootstrap script will be similar but standalone.

## Tasks & Acceptance

**Execution:**
- `apps/api/package.json` -- Install `argon2` and add `"bootstrap": "ts-node scripts/bootstrap.ts"` to scripts -- Required for secure hashing and script execution.
- `apps/api/prisma/schema.prisma` -- Add `isPlatformAdmin Boolean @default(false)` to `Identity` model -- To identify platform administrators distinct from tenant users.
- `apps/api/scripts/bootstrap.ts` -- Create a CLI script that reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from environment variables, enforces 15+ char length, hashes the password using `argon2` (m: 19456, t: 2, p: 1), and upserts the `Identity` (with `isPlatformAdmin = true`) and `PasswordCredential`.

**Acceptance Criteria:**
- Given `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars with valid inputs, when the bootstrap script is executed, then it creates a new platform administrator identity with `isPlatformAdmin=true` and a securely hashed password credential.
- Given an existing platform administrator with the same email, when the script runs again with a new password, then it updates the password securely without duplicating the identity.

## Spec Change Log

## Review Triage Log

## Design Notes

We add `isPlatformAdmin` directly to `Identity` to explicitly separate platform control-plane capabilities from tenant roles (as required by SEC-10: "Platform administration uses separate capabilities and minimized global metadata.").

## Verification

**Commands:**
- `npm run migrate --workspace=@nova/api` -- expected: database schema applies successfully
- `npm run tsc --workspace=@nova/api` -- expected: completes successfully without type errors

## Auto Run Result

- **Summary of implemented change**: Added `isPlatformAdmin` to `Identity` schema and created a CLI bootstrap script that uses `argon2` to securely hash platform administrator passwords.
- **Files changed**:
  - `apps/api/package.json`: Added `argon2` dependency and `"bootstrap"` script. Added `workspaces` array to root `package.json` to fix CLI workspace resolution.
  - `apps/api/prisma/schema.prisma`: Added `isPlatformAdmin` boolean field to `Identity`.
  - `apps/api/scripts/bootstrap.ts`: Created the bootstrap script enforcing minimum 15 characters and hashing with Argon2id parameters `m=19456, t=2, p=1`.
  - Prisma migrations: Generated `add_is_platform_admin` migration.
- **Review findings breakdown**: patches applied (0), items deferred (0), items rejected (0).
- **Follow-up review recommendation**: `false`. (Score: 0).
- **Verification performed**: Ran `npm run migrate` and `npm run tsc` locally, all completed without error.
- **Residual risks**: None. PNPM build constraints for native `argon2` bindings were handled. Live environment requires human to run the script.
