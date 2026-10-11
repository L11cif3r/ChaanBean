# Call Automation (Collect)

Branch status for Feature 3. Additive; no Company Check or legacy recovery code is edited. Shared files touched: `Sidebar.tsx` (one entry), `package.json` (one script), `.env.example`, and a new `vercel.json`.

## Done

- **Database:** additive migration `20261010100000_call_automation` with `collection_cases`, `call_schedules`, `call_attempts` and `collection_events`. It includes row-level security, an append-only timeline and idempotency indexes.
- **Policy:** 09:00–18:00 IST calling window, daily / every-2-days / weekly cadence, attempt limits, and a bounded retry after provider failures (`src/lib/call-automation/policy.ts`).
- **Scheduler:** safe under concurrent workers (`FOR UPDATE SKIP LOCKED`). It creates one attempt per slot, defers calls outside calling hours, and stops on payment, dispute, pause, withdrawn contact permission or the attempt limit (`engine.ts`).
- **Call handling:** status only moves forward, duplicate and out-of-order callbacks are ignored, and missing callbacks are reconciled through the provider's status API. A provider rejection is recorded as failed and the attempt budget is returned. A provider timeout is marked unconfirmed and never retried.
- **Providers:** a `VoiceProvider` interface, a deterministic mock provider (the default, never places real calls), and an Exotel adapter gated off by missing credentials and `CALL_AUTOMATION_POLICY_APPROVED`.
- **Privacy and security:** debtor phone numbers are AES-256-GCM encrypted and shown masked. Provider callbacks are HMAC-signed and fail closed. The organisation always comes from the verified session, and another tenant's case returns 404.
- **API:** `/api/collect/cases/**` (create, list, detail, automation configure / pause / resume / stop, manual call, case actions, status sync), `/api/webhooks/exotel/call-status`, and `/api/cron/collect-scheduler`.
- **Dashboard:** `/collect` shows the case list and case detail. Call history separates request accepted, recipient answered and call ended, with a case timeline.
- **Invoice to case:** `POST /api/collect/invoices/sync` creates or updates a case from an invoice (`syncInvoice`). A lower outstanding amount is applied as a payment, a higher one updates the case, and closed or paid cases are never reopened. One case per invoice per organisation (409 `INVOICE_ALREADY_TRACKED`).
- **Payments:** a `collection_payments` ledger (migration `20261011100000_call_automation_payments`) with partial payments, idempotent `payment_ref`, and rejection of over-payment. A full payment marks the case PAID, stops the schedule and cancels queued calls. The pre-dial re-check remains as a backstop. A call that is already ringing cannot be recalled.
- **Payment events:** `POST /api/collect/payment-events` takes a signed server-to-server payment signal (HMAC over `timestamp.body`, 5-minute window, `COLLECT_PAYMENT_WEBHOOK_SECRET`). It is idempotent, tenant-scoped, and returns 202 for unknown invoices.
- **Automation edits:** `PATCH /cases/:id/automation` with `op: UPDATE` changes frequency and attempt limit without resuming a paused schedule.
- **Auth hardening:** same-origin (CSRF) check on all state-changing `/api/collect` calls; the dev bypass is ignored in production; Exotel callbacks are rejected if the attempt id doesn't match.
- **Deployment:** `vercel.json` cron runs `/api/cron/collect-scheduler` every 5 minutes with `CRON_SECRET`; `npm run collect:tick` runs the scheduler elsewhere. Env vars are listed in `.env.example`.
- **Dashboard:** sidebar link to `/collect`, original vs outstanding amount, partial-payment entry, payment history, in-place automation edits, and a clear signed-out message.
- **Mock provider:** optionally sends signed Exotel-shaped callbacks to the webhook (`CALL_MOCK_SEND_CALLBACKS=1`, never in production).
- **Tests:** type check and lint clean; 54 passing (unit and database) covering the original acceptance cases plus invoice sync, partial and full payment, idempotency, queued-call cancellation, payment events, tenant isolation, role checks, signature and CSRF checks, cron auth and the Vercel cron wiring.
- **Local dev support:** a dev-only auth bypass (`COLLECT_DEV_AUTH=1`, development/test only), a scheduler runner script and seed data under `scripts/call-automation/`.

## To do

- **Sign-offs:** confirm calling hours, cadence, attempt limits, the call script, promise-to-pay behaviour and whether consent evidence must be stored.
- **Live Exotel:** test in a sandbox account (flow URL, `Calls/connect` parameters, callback format). The adapter has never run against the real API. Vobiz is not implemented.
- **Feature 2 hookup:** Feature 2 isn't merged, and the legacy `Invoice` table is on a different tenancy from `organisations`, so invoice ids are plain references. Call the new sync and payment-event endpoints from Feature 2 once it lands.
- **Production auth:** the API uses Company Check's Supabase session, but the repo has no browser sign-in client yet, so this hasn't been exercised in a browser. Verify once login lands.
- **Deploy:** set the env vars. Vercel Hobby only allows daily crons, so the 5-minute schedule needs a paid plan (or use `collect:tick` / an external cron).
- **Optional:** an MCP tool, WhatsApp or SMS fallback, detecting promise or dispute outcomes from the call itself, and Prisma models (the code currently uses raw SQL).
