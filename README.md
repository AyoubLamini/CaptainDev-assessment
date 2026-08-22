# NOVA Platform

This is the implementation of the NOVA SaaS platform for the CaptainDev technical assessment. It includes the SaaS Foundation, Platform Administration, and Client-side Collaborative Administration modules.

## Getting Started

### Prerequisites
- **Node.js**: >= 22.0.0
- **Package Manager**: pnpm (v10.28.2)
- **Database**: PostgreSQL
- **Email Provider**: Resend API Key

### 1. Installation & Environment
Install dependencies:
```bash
pnpm install
```

Configure your environment variables. A single `.env.example` serves both the backend API and the Next.js frontend. Copy it to both required locations:
```bash
# Configure the backend/global API
cp .env.example .env

# Configure the Next.js frontend
cp .env.example apps/web/.env
```
*(Fill in your `RESEND_API_KEY` and other credentials in the root `.env` file.)*

### 2. Database Setup & Seeding

**Option A (Docker - Recommended):** If you have Docker installed, you can quickly spin up a local PostgreSQL database that matches the default `.env` configuration by running:
```bash
docker compose up -d
```

**Option B (Hosted DB):** If you prefer not to use Docker, ensure you provide a valid connection string to your hosted PostgreSQL database in the `DATABASE_URL` variable in your `.env` file.

Once your database is running, initialize the schema, apply security roles, seed synthetic data, and securely bootstrap the platform administrator:
```bash
# Apply database schema and setup the restrictive RLS role
pnpm --filter @nova/api prisma migrate deploy

# Seed the database with synthetic organization data
pnpm --filter @nova/api prisma db seed

# Bootstrap the platform administrator
pnpm --filter @nova/api run bootstrap
```

### 3. Running the Services
Start the backend API and frontend web application in separate terminal windows:
```bash
# Start the NestJS API (runs on port 3001)
pnpm --filter @nova/api run start:dev

# Start the Next.js Web App (runs on port 3000)
pnpm --filter @nova/web run dev
```

## Building for Production
To build both the frontend and backend for production, run:
```bash
pnpm run build
```

## Testing
Before running the tests locally, ensure your environment is correctly prepared:
- **For Backend Tests (`@nova/api`):** The PostgreSQL database must be actively running (via Docker or hosted).
- **For E2E Web Tests (`@nova/web`):** The backend API server must be actively running (`pnpm --filter @nova/api run start:dev`) so the frontend can communicate with it.
- **For All Tests (`pnpm test`):** Both the database and the backend API server must be actively running.

```bash
# Run all tests (API Unit/Integration and Web E2E)
pnpm test

# Run only Backend (API) Unit & Integration Tests (Vitest)
pnpm --filter @nova/api run test

# Run only Frontend (Web) End-to-End Tests (Playwright)
pnpm --filter @nova/web run test

# Run typechecking
pnpm typecheck
```

---

*For full details on the submission scope, architecture limitations, test results, and the Loom demonstration video, please see [SUBMISSION.md](SUBMISSION.md).*
