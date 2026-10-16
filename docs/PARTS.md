# Phase 1 in 10 parts

Source: *Chaanbean Phase 1 PRD v1.0* (14 Oct 2026), updated by the *ChaanBean High Level PRD v2.0* (15 Oct 2026, after
the meeting with Mohan; see "Changes from PRD v2.0" below). Where the two differ, v2.0 wins. Build plan:
`../Chaanbean_Phase1_Build_Plan.md` (outside this repo).
Each part ends with something working and tested. Anything that needs a vendor we do not have yet is built against a
mock provider and switched to the real one when keys arrive.

| # | Part | Screens | Main PRD requirements | Target window | Status |
|---|---|---|---|---|---|
| 1 | Foundation: repo, Supabase, tenancy and roles, audit log, job runner, shared libraries, design system, app shell | shell for every route in 6.2 | FR-USR-02, FR-AUD-01, NFR-08/10/11 | 14–23 Oct 2026 | Done (15 Oct) |
| 2 | Sign-in, organisations and team | S01, S02, S18 | FR-AUTH-01–06, FR-ORG-01–06, FR-USR-01 | 26–30 Oct | Done (15 Oct) |
| 3 | Plans, wallet and billing: item codes, quota then wallet, hold/commit/reverse ledger, gateway (test mode), GST invoices | S03, S19 | FR-BIL-01–09 | 2–6 Nov | Must items built (15 Oct); see notes |
| 4 | Counterparties (buyers): three types, GSTIN auto-fill, duplicates, archive; UPI bank-linked check (mock until a provider) | S05, S06, S07 | FR-CP-01–08 | 9–13 Nov | Must and Should built (16 Oct); see notes |
| 5 | Credit Worthiness, public checks: adapter layer (12.3/12.4), routing, fallback, result reuse; GST search, Company check, Director details, Credit rating; choose-checks screen with cost box; confirm popup ("Yes, run search"); run all together or one by one; one report with risk level and safe credit range; report PDF | S08, S11 | FR-CW-01, 04–07, FR-RPT-01–06 | 16–27 Nov | Not started |
| 6 | Notifications: SMS (DLT), WhatsApp, email (SES), in-app; message list from v2.0 section 9.1; delivery status; preferences; sender profile | S20 | FR-NTF-01/02, FR-AUTH-03 | 30 Nov–4 Dec | Not started |
| 7 | Credit Worthiness, consent checks: buyer consent link and OTP, GST portal API-access step, 72-hour expiry with no charge, withdrawal; GST turnover (current year or last 4 years) via GSP; CIBIL company, personal or both via one bureau partner | S09 (consent), S10 | FR-CON-01–07, FR-CW-02/03 | 7–18 Dec | Not started |
| 8 | Case Check (optional tab): user picks court case, FIR and/or money laundering; same cost popup; match confidence; "This is him / Not him / Not sure"; only confirmed cases change the risk level | S12 | FR-CC-01–06 | 21 Dec–1 Jan | Not started |
| 9 | Business Security (optional tab): seller, buyer and lender agreements, agreement PDF, OTP acceptance, sealing, verify page, overdue job and interest, payments, E-Settlement | S13–S17, S22 | FR-TX-01–12, FR-ES-01–05 | 28 Dec–8 Jan 2027 | Not started |
| 10 | Dashboard, admin panel and launch: free dashboard (buyers, searches this month, credit given, overdue, units left); admin panel (prices, plan units, data partners); security pass; testing with a few real businesses; pilot | S04, S21 | FR-DSH-01, FR-ADM-01–03, NFR-01–12, section 15, 18.3 | 11–22 Jan 2027 | Not started |

Order (v2.0 section 13): platform basics first (Parts 1–4), then Tab 1 Credit Worthiness (5, 7), Case Check (8),
Business Security (9), then testing with real businesses and launch (10). Notifications (6) sits before Part 7 because
consent links are sent by SMS, email and WhatsApp. Target dates are ours until Pravin confirms them. If the GSP or bureau
contract is late, Part 7 runs on mock providers and Case Check (8) moves up. Should and Could items go into their part
after its Must flow passes; most are likely to land in a 1.1 release.

## Changes from PRD v2.0 (15 Oct 2026)

What v2.0 changes, and where it lands in the build:

- **Credit Worthiness keeps six checks only:** GST search, GST turnover, CIBIL, Company check, Director details,
  Credit rating. Removed from Phase 1: MSME Report, PAN Check, Import Export Profile and Turnover, Mobile to PAN,
  Mobile to Address, PAN to Mobile and Email, Company Master Report, Company Financial History, Comprehensive Company
  Report (some may return later as separate paid buttons). Parts 5 and 7 shrink accordingly; no contact lookups.
- **GST turnover:** the user picks current year only (price to be set) or last 4 years (₹189). Two item codes.
- **CIBIL:** the user picks company, personal or both, ₹389 each, from one bureau partner. Two item codes.
- **Cost first:** a confirm popup shows exactly what will be deducted (plan units, wallet money, units and balance
  after) and the search runs only on "Yes, run search". The choose-checks screen keeps a live cost box.
- **Run together or one by one:** the user can run every selected check at once or run each one by hand.
- **Charge rule:** charged only when data arrives; a failed search, a "no" from the buyer or a consent that expires
  after 72 hours costs nothing. The Part 3 hold, commit and reverse ledger already works this way.
- **Case Check and Business Security are optional tabs.** Case Check asks which checks the user wants; Business
  Security is used only when the customer wants it (others keep using Tally or their own system).
- **Report:** risk level High, Medium, Low or Not enough data (rules in v2.0 section 6); safe credit range 1% to 2% of
  last year's filed turnover, 0.5% to 1% if turnover is falling, "not advised without an advance" when risk is High.
- **Navigation:** Workspace (Dashboard, Counterparties), Main tabs (Credit Worthiness, Case Check, Business Security,
  E-Settlement), Account (Team and roles, Plan and wallet, Settings).
- **Not in Phase 1:** ChaanBean intelligence (AI follow-up questions), AI agents, Tally connectors, recovery features.
- **Build approach:** simple tabs where the user searches by hand first; smart features later.

Follow-ups in code already written:

- [x] Part 3 item catalogue (16 Oct, migration `20261016101813_part3_prd_v2_catalogue`, plan version 2): retire the removed items (inactive, not deleted, so old ledger rows keep their names);
      add GST turnover current year (no price until Mohan sets it, so it cannot be sold yet); split the bureau item
      into company and personal CIBIL; Credit rating, FIR and money laundering pay per use in both plans.
- [x] Sidebar labels and groups to match v2.0 (Main tabs; "Plan and wallet") (16 Oct).

Open points from v2.0 section 13 (replace Q1–Q5 where they overlap): price of GST turnover current year (Mohan);
MSME as a separate paid button (Pravin with Mohan); which bureau partner (Pravin); yearly prices and carry-forward
(Mohan); agreements per plan (Mohan); Tally connectors (Pravin with Mohan). New from reading v2.0: do the 12 / 30
CIBIL units in Plan A / B cover company and personal together, or 12 / 30 of each? Does the UPI bank-linked check
for a new buyer stay in Phase 1?

## Part 1 checklist

- [x] Repo (Next.js 16.4, TypeScript, Tailwind 4, Cache Components) on branch `phase1` of the ChaanBean repo; Supabase project
      `ixhhgevmplfjqkdmpepw` (old project, wiped and rebuilt on 15 Oct after a full backup)
- [x] Migrations: tenancy, permission matrix, hash-chained audit log, job queue, storage buckets
- [x] Shared libraries: validators, money, IST dates, masking, permissions
- [x] Server core: Supabase clients, field encryption and blind index, request context and guard, route wrapper, audit, jobs, storage
- [x] Design system, app shell, placeholder for every route, strings in `messages/en.json`
- [x] Unit tests, database tests, end-to-end smoke test, CI workflow
- [x] End-to-end smoke test green (54 checks, 360 px and desktop)
- [x] Database rules verified with SQL through the Supabase connector (15 Oct): row-level security per organisation
      and role, refused writes, anonymous access, function grants, private buckets, permission matrix identical to
      `src/lib/permissions.ts`, audit chain and tamper detection, job retry and backoff
- [x] `npm run test:db` green (15 Oct, 17 tests): row-level security through real Supabase sign-ins, audit chain with 8
      simultaneous writers, job claims by 3 simultaneous workers, audit writer masking, job runner, write-once and
      encrypted storage. Server work uses the database connection in `.env` (no Supabase secret key)

## Part 2 notes (15 Oct)

- Sign-in: mobile OTP through Supabase Auth with the PRD limits (5 sends an hour, 5 wrong codes lock for 30 minutes) and
  session rules in the signed `cb_sess` cookie (12 hours, 30 days trusted, 60 minutes idle for Owner and Admin).
- Development test numbers 90000 00001 to 00003 sign in with code 123456 through `src/server/auth/dev-signin.ts`
  (never in production). Real phone sign-in needs Supabase Auth: Phone provider on and the Send SMS hook
  (`public.dev_send_sms_hook` until Part 6).
- GST search and PAN verification use the mock provider (`src/server/providers/identity`); the GSTIN's 13th character
  picks the scenario: 9 cancelled, 8 suspended, 7 not found, 6 provider down.
- Invite, access-request and email-verification messages go to `/dev/outbox` until Part 6.
- Tests: 56 unit, 24 database, 54 smoke, 8-step identity flow (`tests/e2e/identity-flow.spec.ts`).
- Known: each sign-in takes about 8 s against the Sydney database (many round trips); improves with the Mumbai move.

## Part 3 notes (15 Oct)

- Migrations `20261015152602_part3_billing` and `20261015161321_part3_hold_sweep`: item catalogue and versioned prices
  (Appendix A), versioned plans (Plan A ₹11,599, Plan B ₹17,599, 12 months, 3 and 5 seats), subscriptions, wallet,
  append-only usage ledger, payment orders, webhook events, GST invoices numbered `CB/2026-27/00001` per financial year.
- Charging (5.9): `placeHold` → `commitHold` / `reverseHold` in `src/server/billing/charge.ts`. Plan quota first, then
  the wallet at the pay-per-use price plus 18% GST; holds reverse automatically at expiry (`billing.release_hold` job).
  The wallet balance is kept by a trigger and can never go below zero, also under concurrent charges.
- Top-ups are what the customer pays: the full amount goes into the wallet and its GST is worked out of it (₹1,000 =
  ₹847.46 + ₹152.54 GST); usage is not invoiced again (S19 rule).
- Payments run through a mock gateway (`src/server/providers/payments`) with signed webhooks, duplicate-event protection
  and the dev checkout page `/dev/pay/:order`. Swap in the real gateway once the merchant account exists.
- Invoices are printable pages ("Save as PDF") marked Draft until the billing entity, GSTIN and SAC are set in
  `app_private.billing_settings` (PRD Q12; SAC 998399 is a placeholder to confirm with the accountant).
- Not built yet: upgrade/downgrade mid-period (FR-BIL-07, Should), renewal reminders and the renewal charge (FR-BIL-08;
  the auto-renew switch is stored), coupons (FR-BIL-09, Could), extra seats at ₹301, stored invoice PDFs (with the
  Part 5 PDF engine).
- Open questions still assumed: Q1 period (12 months), Q3 transaction units (not in plans, wallet), Q4 Plan A Company
  Check (0), Q5 rollover (none), Q13 counterparty fee (item `CP_UNREGISTERED`, ₹10).
- Known: with `DATABASE_URL` on Supavisor's transaction pooler (port 6543), bursts of parameterised postgres.js queries
  can leave a backend waiting for a Bind that never arrives, so pages hang until the statement timeout. Reproduced in
  plain Node without Next.js; the session pooler (port 5432, `DIRECT_URL`) does not hang. Decision pending on which
  pooler the server uses.

## Part 4 notes (16 Oct)

- Migration `20261016130827_part4_counterparties`: `public.counterparties` (three types; PAN, mobile, WhatsApp and email
  encrypted with keyed hashes for exact match; GSTIN, CIN and Udyam in plain text) and `app_private.upi_checks`.
  The same GSTIN, PAN or mobile cannot be added twice in one organisation, archived records included (FR-CP-04).
  Row-level security: every member reads, nobody writes directly; all writes go through `src/server/counterparties`.
- S05 list: search by name or GSTIN as you type (300 ms), or by full PAN or full mobile (hash match only, see build
  plan gap 1); status and tag filters; server-side paging at 10, 25 or 50; row menu; CSV export for Owner and Admin.
  Risk, last checked, open deals, outstanding and suggested limit show placeholders until Parts 5 and 9.
- S06 add: GSTIN Fetch through the identity mock (FR-CP-02); duplicate warning before save with a link to the existing
  profile; bank-linked mobile check through a mock UPI provider (`src/server/providers/upi`: a mobile ending in 0 is not
  linked, 9 is unavailable, anything else is linked). The result is stored server-side and attached on save, so the
  browser cannot fake it. Manual alternative: "I sent ₹1 by UPI" on the profile. Adding is free (no ₹10 item in v2.0).
- S07 profile: header, Overview (contact, bank-linked mobile, identity, defaults and tags, notes), Activity from the
  audit log; Reports, Cases, Transactions and Documents tabs fill in with Parts 5 to 9. Edit loads the full mobile only
  in the edit form. Archive and restore (FR-CP-08).
- Not built: bulk CSV import (FR-CP-07, Could); PIN codes are checked for format only (no India Post list yet).
- The server now uses Supabase's session pooler (`DIRECT_URL`, port 5432): on the transaction pooler bursts of parallel
  queries hung until the statement timeout (reproduced in plain Node; decided 16 Oct).
- Fixed in passing: `claim_jobs` could hand one worker more jobs than asked (migration
  `20261016140251_claim_jobs_materialized`); masking is idempotent so audit rows keep their dots.
- Tests: 68 unit, 43 database, end-to-end flow now 13 steps (4 for counterparties), smoke at 360 px and desktop.

