# CaptainDev Assessment Submission

This submission implements the required vertical slices for the CaptainDev NOVA SaaS technical assessment, covering SaaS Foundation & Platform Administration and Client-side Collaborative Administration. It delivers secure authentication, strict multi-tenant data isolation via PostgreSQL RLS, organization lifecycle management, and a comprehensive Next.js administration dashboard.

## Project Prerequisites & Setup Instructions

### Prerequisites
- **Node.js**: >= 22.0.0
- **Package Manager**: pnpm (v10.28.2)
- **Database**: PostgreSQL
- **Email Provider**: Resend API Key

### Installation & Environment
1. Ensure your local PostgreSQL database is running. If you want to use the provided Docker setup:
   ```bash
   docker-compose up -d
   ```
2. Install project dependencies from the root:
   ```bash
   pnpm install
   ```
3. Set up your environment variables. To avoid duplicates and confusion, we use a single unified `.env.example` file that contains all necessary variables for both the backend and frontend. Run the following to configure both:
   ```bash
   # Configure the backend/global API
   cp .env.example .env
   
   # Configure the Next.js frontend
   cp .env.example apps/web/.env
   ```
   *Note: Our implementation securely enforces RLS by dropping privileges to `nova_app` during transactions. You do NOT need to configure a special database user in your `.env`—the default `postgres` superuser connection string works perfectly out of the box and remains secure!*

### Database Setup, Migrations & Seeding
Run the following commands to initialize the database schema, apply all security roles, seed test data, and bootstrap the platform administrator:
```bash
# Apply database schema and setup the `nova_app` restrictive role
pnpm --filter @nova/api prisma migrate deploy

# Seed the database with synthetic organization data
pnpm --filter @nova/api prisma db seed

# Bootstrap the platform administrator (Requires ADMIN_EMAIL and ADMIN_PASSWORD in .env)
pnpm --filter @nova/api run bootstrap
```

### Running the Services
Start the backend API and frontend web application in separate terminal windows:
```bash
# Start the NestJS API (runs on port 3001)
pnpm --filter @nova/api run start:dev

# Start the Next.js Web App (runs on port 3000)
pnpm --filter @nova/web run dev
```
*Note: For local development, HTTP cookies are allowed, but production requires HTTPS for `__Host-` prefixed cookies.*

### Building for Production
To build both the frontend and backend for production, run:
```bash
pnpm run build
```

### Testing Commands
To execute the test suites across the project:
```bash
# Run all tests (API and Web)
pnpm test

# Run only Backend (API) Unit & Integration Tests (Vitest)
pnpm --filter @nova/api run test

# Run only Frontend (Web) End-to-End Tests (Playwright)
pnpm --filter @nova/web run test

# Run typechecking
pnpm typecheck
```

## Test Results
- Linting and Type Checking: Passed
- Unit Tests: Passed
- Integration & Negative Isolation (RLS) Tests: Passed
- End-to-End Test Suite: Passed

## Demonstration
Loom Video URL: [INSERT_LOOM_LINK_HERE]
