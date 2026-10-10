# Call Automation (Collect): Feature 3

Automated payment-reminder calls for overdue invoices. Branch: `call-automation`. Everything here is additive;
it does not edit Company Check, the legacy recovery/telephony code, or any shared UI shell.

## Status

**Done (backend slice + mock telephony, verified locally: type check clean, 35 tests passing)**
- Additive migration: `collection_cases`, `call_schedules`, `call_attempts`, `collection_events` (RLS, append-only timeline, idempotency indexes).
- Domain/scheduler in `src/lib/call-automation/`: calling-hours + cadence policy, encrypted phone storage, idempotent scheduler (`SKIP LOCKED`), attempt dispatch, forward-only status handling, reconciliation, signed webhook verification.
- `VoiceProvider` interface with a deterministic **mock** provider (default) and an Exotel adapter (written from docs, **untested against the live API**, gated off).
- API: `/api/collect/cases/**` (create/list/detail, automation configure/pause/resume/stop, manual call, case actions, status sync), signed `/api/webhooks/exotel/call-status`, `/api/cron/collect-scheduler`.
- Dashboard at `/collect` (list, detail, call history showing accepted/answered/ended, timeline).

**To do**
- Sign-off on calling hours, cadence, attempt limits, call script, promise-to-pay and consent evidence (see open decisions below).
- Test Exotel against a sandbox account (flow URL, `Calls/connect` params, callback format); Vobiz not implemented.
- Feature 2 integration: create cases from overdue invoices; feed real payment events into `RECORD_PAYMENT`.
- Sidebar link to `/collect`; register the cron job (e.g. `vercel.json`) with `CRON_SECRET`.
- Production auth path is Company Check's Supabase session (untested here; local runs use the dev-only bypass).
- Optional: MCP tool, WhatsApp/SMS fallback, outcome capture (promise/dispute detected from the call), Prisma models if desired.

## What exists

| Layer | Path |
| --- | --- |
| Migration (additive, after Company Check) | `prisma/migrations/20261010100000_call_automation/` |
| Domain + scheduler | `src/lib/call-automation/` (`policy`, `pii`, `status`, `signing`, `engine`, `service`, `context`, `route`, `providers/`) |
| API | `src/app/api/collect/cases/**`, `src/app/api/webhooks/exotel/call-status`, `src/app/api/cron/collect-scheduler` |
| UI | `src/app/collect/**`, `src/components/collect/**` (scoped CSS Module, Plus Jakarta Sans) |
| Tests | `src/lib/call-automation/__tests__/` (unit + `*.db.test.ts`) |
| Dev tooling | `scripts/call-automation/` (shim, seed, scheduler runner) |

Lifecycle: create case → confirm contact permission → enable automation (frequency, max attempts) → scheduler
claims due schedules (`FOR UPDATE SKIP LOCKED`) → one attempt per slot (unique idempotency key) → provider call →
signed callback and/or status-API reconciliation → forward-only status updates → timeline events.

The UI distinguishes **request accepted**, **recipient answered** and **call ended/completed**. A provider "accepted"
is never shown as a connected call.

## Integration seams (what is reused, what is deliberately not)

- **Reused from Company Check, imported and never modified:** `requireContext` (Supabase session + organisation
  membership), `AppError`/`RequestContext`, `errorResponse`/`readJson`, `toJsonSafe`, `organisations` and
  `cc_private.user_org_ids()` (RLS).
- **Tenancy:** every table carries `organisation_id`; the org always comes from the verified session, never the request.
  A case id from another org returns 404.
- **Feature 2 (Business Security / invoices):** `collection_cases.invoice_id` is a plain text reference with no FK.
  When invoices land, populate it and replace manual case creation with "create case from overdue invoice".
- **Payment signal:** today payment is recorded by a user action. A future payment webhook/Feature 2 event should call
  `applyAction(ctx, id, { action: "RECORD_PAYMENT" })`; the scheduler re-checks the case under lock and again right before dialling.
- **Raw SQL, not Prisma models:** the scheduler needs `SKIP LOCKED` and partial unique indexes, and this avoids editing
  the shared `schema.prisma` files (no merge conflicts there). If you later want Prisma models, introspect the four tables.
- **Not used:** legacy `/api/recovery*`, `/api/webhooks/exotel`, `ExotelAdapter.initiateOutboundReminder` (silently
  falls back to a sandbox and reports success), `asterisk-vobiz` (always reports "answered"), and the cookie
  tenant resolver (forgeable; PRD §5.3).

## Running locally

Prereqs: Node, PostgreSQL 15+ binaries. No Supabase credentials needed.

```powershell
# 1. throwaway Postgres on 54329 (data in ./scratch, gitignored)
$pg = "C:\Program Files\PostgreSQL\18\bin"
& "$pg\initdb.exe" -D scratch\pgdata -U postgres --auth=trust -E UTF8 --locale=C
& "$pg\pg_ctl.exe" -D scratch\pgdata -o "-p 54329 -c listen_addresses=127.0.0.1" -l scratch\pg.log start
& "$pg\psql.exe" -h 127.0.0.1 -p 54329 -U postgres -c "create database chaanbean_collect_dev"
# 2. Supabase stand-ins (auth schema, roles) so Company Check's migrations run on plain Postgres
& "$pg\psql.exe" -h 127.0.0.1 -p 54329 -U postgres -d chaanbean_collect_dev -f scripts\call-automation\local-supabase-shim.sql
# 3. migrations + dev org/user
npx prisma migrate deploy
& "$pg\psql.exe" -h 127.0.0.1 -p 54329 -U postgres -d chaanbean_collect_dev -f scripts\call-automation\seed-dev.sql
node scripts/prisma-generate.js
npm run dev            # http://localhost:3000/collect
```

`.env` (see `.env.example` additions below). Never point these at the shared Neon/Supabase database.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | local DB |
| `CALL_PROVIDER` | `mock` (default) or `exotel` |
| `COLLECT_PII_KEY` | base64 of 32 random bytes; encrypts debtor phone numbers. Required; no default |
| `COLLECT_WEBHOOK_SECRET` | ≥16 chars; signs provider callback URLs. Unset = callbacks rejected |
| `CRON_SECRET` | Bearer token for `/api/cron/collect-scheduler`. Unset = rejected |
| `COLLECT_DEV_AUTH=1`, `COLLECT_DEV_ORGANISATION_ID`, `COLLECT_DEV_USER_ID` | local-only auth bypass; works only when `NODE_ENV` is `development`/`test` |
| `EXOTEL_API_KEY/TOKEN/ACCOUNT_SID/CALLER_ID/CALL_FLOW_URL/SUBDOMAIN`, `COLLECT_PUBLIC_BASE_URL` | live Exotel |
| `CALL_AUTOMATION_POLICY_APPROVED=1` | explicit gate for live calls (see open decisions) |

Run the scheduler locally: `npx tsx scripts/call-automation/run-scheduler.ts [--loop] [--interval=30] [--now=<ISO>]`
(`--now` simulates a clock inside calling hours; the cron route never uses it).
Mock outcomes by last digit of the number: 0-4 answered+completed, 5-6 no answer, 7 busy, 8 accepted then failed, 9 rejected.

Tests: `npx vitest run src/lib/call-automation` (unit) and
`RUN_DB_TESTS=1 npx vitest run src/lib/call-automation` (DB, local database only).

## Safety properties (and where they are tested)

- No false success: missing credentials/approval ⇒ provider not ready ⇒ nothing is claimed or dialled; provider
  rejections are recorded as FAILED and return the attempt budget; a timeout is "unconfirmed" and the slot is never retried.
- Idempotent: one attempt per schedule slot; duplicate/out-of-order callbacks are ignored (terminal states are final).
- Payment/dispute/pause/withdrawal win races: schedule→case lock order, plus a re-check immediately before dialling.
- Phone numbers are AES-256-GCM encrypted, shown masked, never logged; no raw provider payloads are stored.
- Callbacks are HMAC-signed per attempt and fail closed.

## Open product / compliance decisions (not assumed approved)

1. **Calling hours** are 09:00–18:00 IST (from the existing authorizer). Needs legal sign-off.
2. **Cadence presets** (daily / every 2 days / weekly), default 3 attempts, max 10, and a 60-minute gap between manual calls.
3. **Call script / language.** The script lives in the Exotel flow behind `EXOTEL_CALL_FLOW_URL`; nothing here authors one.
4. **Promise-to-pay.** Currently: calls wait until the day after the promised date. Confirm desired behaviour.
5. **Contact permission.** A user attestation gates automation; confirm whether consent evidence must be stored.
6. **Caller-ID rotation is NOT implemented** (guide §12 forbids rotating numbers to evade blocking); a single approved `EXOTEL_CALLER_ID` is used.
7. **Vobiz** is not implemented (`VoiceProvider` is the seam).
8. Live Exotel is **untested against the real API**; verify the flow URL, `Calls/connect` parameters and callback format in a sandbox account first.

## Merge notes

- No shared file is edited. New migration sorts after Company Check's (`20261009120000_*`).
- Follow-ups for whoever owns shared files: a sidebar link to `/collect` (`Sidebar.tsx`), and a cron entry
  (e.g. `vercel.json`: `/api/cron/collect-scheduler` every 5 minutes with `CRON_SECRET`).
- `next build` lint currently fails on Company Check's `src/lib/company-check/service.ts:509` (`prefer-const`), unrelated to this feature.
- `docs/requirements/*.pdf` are untracked source documents and are not part of this work.
