# Phase 1 in 10 parts

Source: *Chaanbean Phase 1 PRD v1.0* (14 Oct 2026). Build plan: `../Chaanbean_Phase1_Build_Plan.md` (outside this repo).
Each part ends with something working and tested. Anything that needs a vendor we do not have yet is built against a
mock provider and switched to the real one when keys arrive.

| # | Part | Screens | Main PRD requirements | Target window | Status |
|---|---|---|---|---|---|
| 1 | Foundation: repo, Supabase, tenancy and roles, audit log, job runner, shared libraries, design system, app shell | shell for every route in 6.2 | FR-USR-02, FR-AUD-01, NFR-08/10/11 | 14–23 Oct 2026 | Done (15 Oct) |
| 2 | Sign-in, organisations and team | S01, S02, S18 | FR-AUTH-01–06, FR-ORG-01–06, FR-USR-01 | 26–30 Oct | Done (15 Oct) |
| 3 | Plans, wallet and billing: item codes, quota then wallet, hold/commit/reverse ledger, gateway (test mode), GST invoices | S03, S19 | FR-BIL-01–09 | 2–6 Nov | Not started |
| 4 | Counterparties: three types, GSTIN auto-fill, UPI bank-linked check, duplicates, archive | S05, S06, S07 | FR-CP-01–08 | 9–13 Nov | Not started |
| 5 | Check engine, public checks and credit report: adapter layer (12.3/12.4), routing, fallback, circuit breaker, result reuse; GST, MCA, Director, MSME, PAN, IEC; risk band 9.2; credit range 9.3; report PDF | S08, S09 (public), S11 | FR-CW-01, 04–07, FR-RPT-01–06 | 16–27 Nov | Not started |
| 6 | Notifications: SMS (DLT), WhatsApp, email (SES), in-app; templates T01–T14; delivery status; preferences; sender profile | S20 | FR-NTF-01/02, FR-AUTH-03 | 30 Nov–4 Dec | Not started |
| 7 | Business Security: transactions, agreement PDF, OTP acceptance, sealing, evidence pack, verify page, overdue job and interest, payments, E-Settlement | S13–S17, S22 | FR-TX-01–12, FR-ES-01–05 | 7–18 Dec | Not started |
| 8 | Consent and consent checks: consent links, OTP, GSTN OTP step, withdrawal, limits; Filed GST Turnover via GSP; bureau; contact lookups (flagged) | S09 (consent), S10 | FR-CON-01–07, FR-CW-02/03/08 | 21 Dec–1 Jan | Not started |
| 9 | Case Check: court cases, AML, FIR where covered; match confidence; Confirm / Not this / Unsure review | S12 | FR-CC-01–06 | 4–8 Jan 2027 | Not started |
| 10 | Dashboard, ops console and launch: full dashboard; console (two-person pricing, provider routing, org support, consent and audit search, support sessions); security pass, pen-test fixes, UAT, pilot | S04, S21 | FR-DSH-01, FR-ADM-01–03, NFR-01–12, section 15, 18.3 | 11–22 Jan 2027 | Not started |

Ordering: the Part 3 ledger comes before Part 5 (checks spend units); Part 6 before Parts 7 and 8 (both send links);
Business Security (7) before consent checks (8) because it needs no data vendor. Should and Could items go into
their part after its Must flow passes; most are likely to land in a 1.1 release.

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
