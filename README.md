Call Automation (Collect)
Branch status for Feature 3. Everything is additive; no Company Check, legacy recovery or shared UI files are edited.

Done
Database: additive migration 20261010100000_call_automation with collection_cases, call_schedules, call_attempts and collection_events. It includes row-level security, an append-only timeline and idempotency indexes.
Policy: 09:00–18:00 IST calling window, daily / every-2-days / weekly cadence, attempt limits, and a bounded retry after provider failures (src/lib/call-automation/policy.ts).
Scheduler: safe under concurrent workers (FOR UPDATE SKIP LOCKED). It creates one attempt per slot, defers calls outside calling hours, and stops on payment, dispute, pause, withdrawn contact permission or the attempt limit (engine.ts).
Call handling: status only moves forward, duplicate and out-of-order callbacks are ignored, and missing callbacks are reconciled through the provider's status API. A provider rejection is recorded as failed and the attempt budget is returned. A provider timeout is marked unconfirmed and never retried.
Providers: a VoiceProvider interface, a deterministic mock provider (the default, never places real calls), and an Exotel adapter gated off by missing credentials and CALL_AUTOMATION_POLICY_APPROVED.
Privacy and security: debtor phone numbers are AES-256-GCM encrypted and shown masked. Provider callbacks are HMAC-signed and fail closed. The organisation always comes from the verified session, and another tenant's case returns 404.
API: /api/collect/cases/** (create, list, detail, automation configure / pause / resume / stop, manual call, case actions, status sync), /api/webhooks/exotel/call-status, and /api/cron/collect-scheduler.
Dashboard: /collect shows the case list and case detail. Call history separates request accepted, recipient answered and call ended, with a case timeline.
Tests: type check clean; 35 passing (17 unit, 18 database) covering valid case, persistence, outside hours, payment, pause, dispute, attempt limit, provider rejection, concurrent scheduler, duplicate and out-of-order callbacks, reconciliation, cross-tenant access, missing credentials and the payment race.
Local dev support: a dev-only auth bypass (COLLECT_DEV_AUTH=1, development/test only), a scheduler runner script and seed data under scripts/call-automation/.
To do
Sign-offs: confirm calling hours, cadence, attempt limits, the call script, promise-to-pay behaviour and whether consent evidence must be stored.
Live Exotel: test in a sandbox account (flow URL, Calls/connect parameters, callback format). The adapter has never run against the real API. Vobiz is not implemented.
Feature 2 integration: create cases from overdue invoices and feed real payment events into RECORD_PAYMENT.
Production auth: verify against Company Check's Supabase session. Local runs use the dev bypass.
Wiring: add a sidebar link to /collect and register the cron job (for example in vercel.json) with CRON_SECRET.
Optional: an MCP tool, WhatsApp or SMS fallback, detecting promise or dispute outcomes from the call itself, and Prisma models (the code currently uses raw SQL).
