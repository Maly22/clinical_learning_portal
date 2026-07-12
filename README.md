# PhasePrep

PhasePrep is a Next.js application backed by Supabase and deployed on Vercel, with Resend for transactional email.

## Local development

Requirements: Node 22, pnpm 11.11.0, Docker, and the Supabase CLI. `mise install` installs the pinned JavaScript toolchain.

```bash
pnpm install --frozen-lockfile
cp .env.development.example .env.local
pnpm db:start
pnpm dev
```

Start Docker Desktop before `pnpm db:start`. The command launches local Postgres, Auth, Storage, Studio, and an email-testing inbox, then prints the local API URL and credentials. Put its API URL, publishable/anon key, and service-role key in `.env.local`; do not commit them. The application runs at <http://localhost:3000>, Studio at <http://localhost:54323>, and the local email inbox at <http://localhost:54324>. Keep `EMAIL_DELIVERY_MODE=log` during normal development.

Before opening a pull request, run:

```bash
pnpm check
pnpm db:lint
```

## Infrastructure

- `supabase/migrations/` is the source of truth for database schema and Row Level Security.
- The project has two configurations: local development and Vercel. `main` deploys to Production; optional branch Previews reuse the same Vercel configuration.
- Secrets are server-only. Never prefix service-role, Resend API, or webhook secrets with `NEXT_PUBLIC_`.
- CI validates lint, types, and the production build. Vercel deploys `main` to Production and can create Previews for other branches using the same cloud services.
- `GET /api/health` provides a no-cache liveness endpoint without exposing dependency or secret details.

See [docs/deployment.md](docs/deployment.md) for first-time provisioning and release steps, and [docs/environments.md](docs/environments.md) for environment policy.
