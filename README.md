# Chaanbean portal

Phase 1 of Chaanbean: Creditworthiness, Case Check and Business Security for Indian businesses that sell on credit.
Built from the *Chaanbean Phase 1 PRD v1.0* (14 Oct 2026). The work is split into 10 parts: see
[docs/PARTS.md](docs/PARTS.md).

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) ·
next-intl · Vitest · Playwright. Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Rules:
[docs/CONVENTIONS.md](docs/CONVENTIONS.md).

## Set up

1. Node 20.9 or later, then `npm install`.
2. `cp .env.example .env.local` and fill it in:
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`: Supabase > Project Settings > API Keys for the
     project `ixhhgevmplfjqkdmpepw` (Sydney, used for development; see docs/ARCHITECTURE.md on moving to India).
   - `FIELD_ENCRYPTION_KEY`, `BLIND_INDEX_KEY`: `openssl rand -base64 32` each.
   - `CRON_SECRET`: `openssl rand -hex 24`.
3. `npm run dev` and open http://localhost:3400. The design system is at http://localhost:3400/dev/ui.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3400 (runs background jobs when `APP_LOCAL_JOBS=true`) |
| `npm run check` | Lint, type check and unit tests |
| `npm run test:db` | Database tests against Supabase staging (creates and removes `ZZ TEST` data) |
| `npm run test:e2e` | Playwright smoke test at 360 px and desktop (uses the installed Google Chrome locally) |
| `npm run build` | Production build |

## Database

Migrations are SQL files in `supabase/migrations/`, applied to Supabase with the Supabase connector. After each one:
rename the file to the recorded version, regenerate `src/server/db/types.ts`, and run the security advisors.
