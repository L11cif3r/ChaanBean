# Architecture

One Next.js app (App Router, Node runtime) on Supabase.

**Region.** Development runs on the existing Supabase project `ixhhgevmplfjqkdmpepw` in Sydney (`ap-southeast-2`),
wiped and rebuilt on 15 Oct 2026. The PRD requires all data in India (NFR-05), and Supabase cannot move a project
between regions, so before the pilot the schema (`supabase/migrations/`) is applied to a new project in Mumbai
(`ap-south-1`) and the app pointed at it. Vercel functions go to Mumbai (`bom1`); S3, KMS and SES to Mumbai once the
Chaanbean AWS account exists.

```
Browser: creditor app (app)/ · external pages (public)/ /c /a /v · ops console /admin (own host)
   │
src/proxy.ts            request id, Supabase session refresh, admin host isolation
   │
src/app/**/route.ts     API routes, all wrapped by route() in src/server/http.ts
   │                    (auth, PRD 4.3 capability check, zod input, error format with support reference)
src/server/*            business logic by module; the only code that talks to Supabase or providers
   │
Supabase                Postgres with row-level security · Auth · Storage · Realtime
```

## Data access

- **User client** (`src/server/supabase/server.ts`) acts as the signed-in user. Row-level security applies, so a query
  can only ever see that user's organisations.
- **Database connection** (`src/server/db/sql.ts`, postgres.js) logs in with the database password in `DATABASE_URL`
  (Supabase transaction pooler) and bypasses row-level security. It is used for background jobs, audit writes, stored
  files and writes the route has already authorised, never to read data on a user's behalf. No Supabase secret key
  is needed.
- **Postgres functions** (`rpc()`) hold anything that must happen atomically: job claiming now; ledger holds,
  transaction state changes and their audit rows in later parts.
- Schema changes are SQL files in `supabase/migrations/`, applied with the Supabase connector (`apply_migration`).
  The file is renamed to the version Supabase records, and `src/server/db/types.ts` is regenerated after every
  migration.

## Permissions

`app_private.role_capabilities` (database) is the PRD 4.3 matrix used by row-level security. `src/lib/permissions.ts`
is the same matrix for the server guard and the UI; `tests/db/foundation.test.ts` fails if they differ. Routes declare
a capability (`route({ capability: "check.run" }, …)`), and the database enforces it again.

## Audit log

`public.audit_log` is append-only (triggers refuse UPDATE, DELETE and TRUNCATE, even for the database owner) and
hash-chained per organisation: each row stores `prev_hash` and `row_hash = sha256(prev_hash | canonical row)`, and a
per-organisation advisory lock keeps the chain ordered under concurrent writers. `verify_audit_chain(org)` finds the
first broken row; the `audit.verify_chain` job runs it. Audit rows have no foreign key so they outlive the
organisation (retention 10.4). `audit()` masks personal data before writing.

## Background jobs

Rows in `public.jobs`, claimed with `FOR UPDATE SKIP LOCKED`. `enqueue()` starts the job straight after the response
with `after()`; a scheduler calls `POST /api/v1/jobs/run` (Bearer `CRON_SECRET`) every minute to sweep the rest. Failed
jobs retry with exponential backoff (30 s doubling, capped at 1 hour) until `max_attempts`, then become `dead`. A
worker only claims kinds it has a handler for. Locally, `APP_LOCAL_JOBS=true` runs a sweeper inside `next dev`.

## Encryption

PII fields are AES-256-GCM encrypted in the application (`src/server/crypto`), bound to their column with associated
data, with an HMAC blind index for exact-match search (see CONVENTIONS.md). Keys come from a `KeyProvider`: environment
keys in development, AWS KMS in production.

## Storage

`EvidenceStore` (write-once) and `RawResponseStore` (encrypted) in `src/server/storage`. Development keeps objects in
`app_private.stored_objects`, reachable only through the server's database connection: the database refuses to change
an object or to delete evidence outside retention clean-up, and every read re-checks the SHA-256 recorded at write
time. Production evidence moves to S3 with Object Lock (FR-TX-06).

## Rendering

Cache Components is on: pages prerender a static shell and anything that reads cookies, headers or the URL streams
inside `<Suspense>`. API routes call `connection()` so they always run per request.
