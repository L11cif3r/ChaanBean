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
| 5 | Credit Worthiness, public checks: adapter layer (12.3/12.4), routing, fallback, result reuse; GST search, Company check, Director details, Credit rating; choose-checks screen with cost box; confirm popup ("Yes, run search"); run all together or one by one; one report with risk level and safe credit range; report PDF | S08, S11 | FR-CW-01, 04–07, FR-RPT-01–06 | 16–27 Nov | Public checks built (16 Oct); see notes |
| 6 | Notifications: SMS (DLT), WhatsApp, email (SES), in-app; message list from v2.0 section 9.1; delivery status; preferences; sender profile | S20 | FR-NTF-01/02, FR-AUTH-03 | 30 Nov–4 Dec | Not started |
| 7 | Credit Worthiness, consent checks: buyer consent link and OTP, GST portal API-access step, 72-hour expiry with no charge, withdrawal; GST turnover (current year or last 4 years) via GSP; CIBIL company, personal or both via one bureau partner | S09 (consent), S10 | FR-CON-01–07, FR-CW-02/03 | 7–18 Dec | Consent checks built (16 Oct) on mock GSP, bureau and OTP; see notes |
| 8 | Case Check (optional tab): user picks court case, FIR and/or money laundering; same cost popup; match confidence; "This is him / Not him / Not sure"; only confirmed cases change the risk level | S12 | FR-CC-01–06 | 21 Dec–1 Jan | Built (18 Oct) on mock court, FIR and watchlist providers; see notes |
| 9 | Business Security (optional tab): seller, buyer and lender agreements, agreement PDF, OTP acceptance, sealing, verify page, overdue job and interest, payments, E-Settlement | S13–S17, S22 | FR-TX-01–12, FR-ES-01–05 | 28 Dec–8 Jan 2027 | Agreements built (18 Oct); E-Settlement and evidence pack next; see notes |
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
  and keep their data (00001 owns a GST- and KYC-verified business); the e2e suite uses 00011 to 00013, which it wipes on each run
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

## Part 5 notes (16 Oct)

- Migrations `20261016145055_part5_checks` and `20261016145147_part5_raw_ref_text`: `check_requests` (one request = one
  report, numbered `CR-2026-000001`, valid 30 days, risk level and range stored) and `check_items` (one row per check:
  status, hold, normalised result, encrypted raw response reference). Read by every role (report.view); no direct writes.
- S08 (v2.0 Figure 4): buyer, GST / CIBIL / company basics cards with price, plan units left and "Done on" for recent
  results (FR-CW-06); live cost box. Confirm popup (Figure 5) from the server's quote: units from plan, wallet money,
  units and balance after, "run all together" or "I will run each one myself". S09 redirects to S08 (folded in v2.0).
- Engine (`src/server/checks/service.ts`): holds every check first (all or nothing), then one background job per check
  with a 15 s timeout (30 s for GST returns), one retry after 2 s, then "Not available" with the hold reversed.
  Data or a clean "nothing found" commits the hold. The report is worked out again after every check.
- Report rules (`src/lib/report-rules.ts`, v2.0 section 6 and v1.0 9.2/9.3): High / Medium / Low / Not enough data with
  signals; safe range 1%–2% of last year's filed turnover, 0.5%–1% if falling, none when High. "Low" needs at least 3
  good signs; with fewer good signs and no warnings the level is Medium (the PRD leaves this case open).
- S11 (Figure 8): risk, safe range, why, sections per check with source and time, polling while running, "Run this
  check" in manual mode. Download PDF opens a branded printable page (`/api/v1/reports/:id/pdf`, export logged).
- Providers: one mock for all Credit Worthiness checks (`src/server/providers/checks`), with scenarios for every rule.
  GST turnover and CIBIL run on the same mock once Part 7 adds buyer consent; until then their cards say so.
- Counterparty list and profile show the latest risk level, last checked date, safe range and a Reports tab.
- Fixed in passing: the S06 duplicate warning could be cleared by a slower, earlier check (only the newest answer counts).
- Not built yet: secure share link (FR-RPT-05, Should), provider fallback and circuit breaker (12.4) until there is a
  second provider, Hindi.
- Tests: 77 unit (9 for report rules and mock scenarios), 46 database, end-to-end flow 14 steps.

## Part 7 notes (16 Oct)

- Migrations `20261016155049_part7_consent` and `20261016155156_part7_consent_bureau`: `consent_requests` (one per check
  request: scope, purpose, channels, the only mobile that can approve, hashed link token, 72-hour expiry, status,
  30-day "visible until"); `check_items.consent_id`; server-only `consent_private` (encrypted GST username, GSP token,
  bureau PAN and date), `consent_otps` (mobile OTP hashed; GSTN OTP reference) and `consent_events`, the append-only
  consent record (FR-CON-05: time, IP, device, OTP reference, scope, purpose, expiry). The browser can read the status
  but never the token or the buyer's mobile.
- Confirm popup (S09 folded into v2.0 Figure 5): who is asked, channels (SMS, WhatsApp, email when on file), purpose,
  the message text and what happens next. Rules: a yes from the last 30 days that covers the items is used again
  (and GST access still valid); a "no" in the last 7 days warns; at most 3 requests to one buyer in 7 days.
- Engine: "run together" holds every check at once; checks needing consent wait with a hold kept until the link
  expires. Approval queues them ("one by one" mode makes them ready to run by hand). A "no", expiry (job
  `consent.expire`, also checked when the link is opened) or withdrawal cancels them and reverses the holds. One
  reminder after 24 hours (job `consent.remind`). Every use of the buyer's access is logged ("data_fetched").
- S10 `/c/[token]` (Figure 7), phone first: who and why, mobile OTP (5 minutes, 5 tries, 5 sends an hour, resend
  after 30 s), GST portal steps (username, then the GSTN OTP), company PAN and date of incorporation and/or owner's PAN
  and date of birth (18 or over; must match the PAN on record), consent box, approve, decline with one confirmation.
  Afterwards the same link shows the yes and lets the buyer withdraw after an OTP; withdrawn or lapsed data is hidden
  from the report at once and left out of the risk level.
- Report: a "Buyer consent" card (waiting since, link valid until, said yes / no / no reply / withdrawn) and clear
  per-check messages, also in the PDF page.
- Mocks until keys arrive: OTP sender (no message sent, code 123456), GSP (username with "noapi" = API access off,
  "unknown" = not a GST user, "down" = GSP down; GSTN OTP 123456), CIBIL and turnover need the buyer's access.
- Faster "Yes, run search": holds, jobs and messages now go out side by side (was ~20 to 30 s on the Sydney database).
- Not built yet: telling the requester outside the app when the buyer answers (Part 6 notifications); counsel's
  consent text (placeholder v0.1-draft); ops search of consent records (Part 10); Hindi.
- Tests: 83 unit (6 for consent rules), 50 database (4 for consent), end-to-end flow 19 steps (approve with the GST
  portal and bureau steps, withdraw, decline, expiry, the 3-in-7-days limit).

## Changes from PRD v3.0 (16 Oct 2026, replaces v1.0 and v2.0)

Applied to Parts 3 to 7 (migration `20261016165108_prd_v3_catalogue_and_fields`):

- Item codes as in v3: `CW_GST_TURNOVER_4Y`, `CW_DIRECTORS`, `CP_ADD`. The old codes stay as inactive items because ledger
  rows are never changed; prices and quantities moved to the new codes in plan version 3 (Appendix A, Plan B 450 units).
- MSME report, PAN check, Import export profile and Import export turnover are back as the "Business identity and trade"
  group, with mock providers, a report section and an information-only "MSME registered" sign. Buyers have an IEC field.
- Adding a buyer is charged (CP_ADD, ₹10 + GST from the wallet unless a plan covers it); the form shows the cost.
- Personal CIBIL: the user enters the person's name, PAN, date of birth and mobile. If that person is not the buyer's
  contact they get their own consent request and confirm their PAN and date of birth on the page.
- Current-year-only turnover gives a safe range from that year scaled to 12 months ("Based on current year so far").
- Quotes are stored for 10 minutes and confirming passes the quote id; paid POSTs take an `Idempotency-Key`, so a repeated
  click returns the same request. "Run each one myself" opens a cost popup for every check.
- API paths as in v3 section 15: `/checks/requests`, `/checks/requests/{id}/items/{code}/quote|run`,
  `/checks/requests/{id}/consents/{cid}/resend`, `/public/consent/{token}` with `/otp`, `/verify`, `/gst-otp`,
  `/gst-verify` (ours: v3 lists only gst-otp), `/decision`, `/withdraw`. JSON stays camelCase (v3 examples use snake_case).
- Defaults: GST turnover "Last 4 years", CIBIL "Company". A wrong input (4xx) is not retried.
- Organisations have display name, contact mobile, reply-to email and a Business Security switch; buyers see the display
  name and contact mobile (falling back to the legal name and the requesting user's phone). Editing them comes with
  Settings (Part 10).

Still to do from v3: Exotel WhatsApp OTP with SMS fallback (Part 6, needs keys), CAPTCHA and per-IP OTP limit, share
link for reports (Should), low-units alert at 10% (Should), retention clean-up, Mumbai hosting.

## Part 8 notes (18 Oct): Case Check

- Migration `20261018112622_part8_case_check`: check requests get a `tab` (credit_worthiness or case_check) and the
  search details, encrypted (`inputs_ciphertext`) with a plain summary (name, state, district). `case_matches` keeps
  every possible match with Chaanbean's score and confidence, the user's review (confirmed, not this person, unsure,
  with who and when), and for watchlists the list name and version date (FR-CC-08). The browser cannot read the search
  details or change a review directly.
- Same engine as Credit Worthiness: quote valid 10 minutes, cost popup, holds, one retry, charged only when the search
  ran ("no records" is charged, FR-CC-05; a failed source or more than 50 matches is not). Court search may take up to
  120 s; the results page polls.
- S12 `/cases`: buyer, search form pre-filled from the record (PAN and mobile on file used unless replaced), the three
  checks with prices, nothing pre-ticked except the user's last choice (FR-CC-01), FIR card off for states the provider
  does not cover (FR-CC-07, placeholder list). Results at `/cases/{id}`: counters, matches ranked by confidence, row
  details, review buttons. `PATCH /api/v1/case-matches/{id}` records the review.
- Confidence (`src/lib/cases.ts`): name similarity without company suffixes, father's or
  director's name, district and state, PAN decisive; watchlists use the provider's score capped by the name.
- Only confirmed matches count: a confirmed pending cheque bounce or recovery case is a warning sign (v3 6.7), a
  confirmed watchlist hit makes the risk High (kept from v1.0; v3's table does not list it, so this needs Mohan's say).
  Reports still within their 30 days are worked out again at once. The buyer profile Cases tab lists runs and confirmed
  cases.
- Mock scenarios by name: CLEAN no records, COMMON over 50 matches, DOWN provider down, SANCTION / PEP watchlist hits.
- Not built yet: district list per state (free text for now), notification when a slow search finishes (Part 6),
  15-day refresh of confirmed pending cases (Could), real providers.

## Part 9 notes (18 Oct): Business Security agreements

- Migration `20261018171117_part9_business_security`: `transactions` (seller, buyer, lender; CHB-TX-NNNNNN; 13 statuses
  from v3 8.6), `transaction_items`, `transaction_versions` (what was sent, version by version), `transaction_attachments`,
  `transaction_decisions` (accept, reject with reason, changes with comment, with IP and device), `transaction_seals`
  (write-once PDF reference, SHA-256, who accepted how), `payments` (split into interest and principal),
  `transaction_events` (activity log, append-only), `link_otps`, `verify_hits`. Invoice number once per counterparty.
- PDF (`src/server/pdf/agreement.ts`, pdf-lib + qrcode, Geist font so ₹ prints): title by type, parties, invoice, items,
  amounts, fixed clauses that cannot be removed plus the creator's terms, acceptance block, and on every page the
  reference, verify link and QR code. Preview is marked PREVIEW. Not yet PDF/A.
- S13 `/transactions/new` (and `/edit`): type tabs, labels by type, items with GST rates 0 to 40%, live totals, paid now,
  due date, interest. S14 `/transactions/{id}/review`: PDF preview, channels, link valid 1 to 15 days, confirmation,
  cost. S16 `/transactions/{id}`: timeline, amounts with interest to today, record payment, mark fully paid, cancel,
  resend, attachments (PDF/JPG/PNG checked by bytes, 10 MB, 5 files), evidence, activity log to the second.
- Charging (v3 section 10): one unit held on first send and committed when the counterparty opens the link; cancelling
  before that, or the link expiring unopened, gives it back; resending after a change request is free.
- S15 `/a/{token}` (phone first): summary, terms, full PDF and attachments (viewing logged), OTP to the mobile on record,
  acknowledgement, "I am not {contact}" name field, I Accept, Request changes (10 to 1,000 characters), Reject (reason
  optional). Accepting seals at once: final PDF with the acceptance block, SHA-256, `evidenceStore.putOnce` (write-once
  in Postgres until S3 Object Lock), copies to both parties (outbox until Part 6).
- S22 `/v/{reference}`: the browser hashes the PDF (the file is not uploaded); shows only parties and seal time; 30
  checks per IP an hour.
- Jobs: reminders on day 2 and day 5 while unopened, expiry at the end of the link validity, overdue check 00:30 IST
  the day after the due date (statuses are also worked out again on every read). Interest is simple and daily on the
  principal still owed after the due date; payments pay accrued interest first (`src/lib/transactions.ts`).
- Open points: buyer-initiated deals reuse the same balance and due-date engine ("goods due by"); delivery tracking and
  the refund clause need Mohan's say. An old link stops working when a new version is sent. Agreement units per plan
  are still open (v3 Q5), so sending is charged from the wallet.
- E-Settlement and the evidence pack followed in Part 9b and 9c (below).


## Part 9b notes (19 Oct): E-Settlement

- Migration `20261019045710_part9b_settlements`: `settlements` (CHB-ST-NNNNNN; from an overdue agreement or an outside
  debt with GST bill number, date and amount; owed, settlement amount, interest agreed, waived; full or instalments;
  grace days 7 to 30), `settlement_instalments` (Due, Paid, Missed), `settlement_versions`, `settlement_proposals` (the
  debtor's counter-proposal), `settlement_decisions`, `settlement_seals`, `settlement_payments`, `settlement_events`
  (append-only). One live settlement per agreement; never more than what is owed.
- Rules in `src/lib/settlements.ts` (unit-tested): waiver, Split equally (monthly on the same day, or every 7 or 15
  days, leftover paise on the last row), schedule checks (2 to 24 rows, increasing dates, total matches), and
  `scheduleState`: payments fill instalments in date order; unpaid after the grace days = Missed = Defaulted.
- Screens: STL `/settlements`, S17 `/settlements/new` (and `/edit`, `?proposal=` to revise from the debtor's terms),
  `/settlements/{id}/review` (same flow as S14), `/settlements/{id}` (same layout as S16 with the schedule, the
  counter-proposal next to the current terms with Accept proposal / Revise, payments, evidence, activity), and the
  debtor's page `/s/{token}` (accept by OTP, propose another amount or dates, reject). "Start E-Settlement" on an
  overdue agreement opens S17 with it filled in.
- Charging: one BS_SETTLEMENT unit held on first send, used when the debtor opens the link; revisions free.
- On acceptance: sealed like an agreement (PDF with the schedule and default clause, SHA-256, write-once, verify page
  takes CHB-ST); the original agreement becomes Settled. Settlement payments are also recorded on the original
  agreement, so a default puts it back to Overdue with its balance and interest less what was paid. Jobs: reminders day
  2 and 5, expiry, a note to the creditor on each instalment date (FR-ES-05), the missed check after the grace days.
- Link OTPs for agreements and settlements now share `src/server/links/otp.ts`.

## Part 9c notes (19 Oct): evidence pack

- `GET /api/v1/transactions/{id}/evidence` and `/api/v1/settlements/{id}/evidence` (Export permission), once sealed:
  a ZIP with the sealed PDF (hash re-checked), attachments, an acceptance certificate, the activity log as a PDF, a
  DRAFT section 63 certificate (Bharatiya Sakshya Adhiniyam, 2023; Part A with the hash) for counsel, and a file list
  with each SHA-256. Small ZIP writer in `src/server/zip.ts`, text PDFs via `src/server/pdf/kit.ts`.
- Wording of the certificate, the s.63 draft and the default clause is a placeholder until counsel approves it.

## Ready for real providers (19 Oct)

- Every outside message now carries the real recipient (`to`) for the sender, so switching on Exotel or ZeptoMail
  needs only the adapter and keys. Wallet alerts go to each Owner and Admin with an email.
- Write-once storage has its own switch, `PROVIDER_STORAGE=s3|gcs` (unset = database). Email can be `ses` or
  `zeptomail` (Phase 2 PRD).

## Changes from PRD v4.0 (20 Oct 2026): Credit Worthiness and Case Check

Migrations `20261020050116_v4_enum_values` to `20261020053304_v4_bulk_confirmed_status`.

- **Rupees only** (section 3). Plans have no units: a plan payment goes into the wallet in full (ledger note "Plan B
  payment"), and while a plan is active its own price list applies (`plan_prices`, Option A; empty = pay-per-use, which
  is Option C). Every hold is wallet money, price plus 18% GST. Q1 (A, B or C) is still open.
- **Company search** (section 4). One box for a name (3 letters or more), GSTIN or CIN/LLPIN: your buyers first, then
  MCA records (up to 50, best word match first, then Active), with state, city and "Active only" filters, the data date,
  "Add by GSTIN" and "Search by a person's name: coming with ChaanBean intelligence". Picking a record adds the buyer for
  free (type `business_cin`, no contact yet); a GSTIN can be linked later from the buyer's Edit. Used by Credit
  Worthiness and Case Check. Buyers without a mobile run public checks; checks the buyer approves by OTP ask for a
  contact first, and transactions and settlements list only buyers with a mobile.
- **Multiple search** (sections 6 and 7, `/checks/bulk`). Type up to 10 or upload up to 50 rows (2 MB, template
  columns). Rows are matched free (GSTIN, then CIN, then name: a name always needs a pick), duplicates and bad rows are
  skipped, and Continue adds the companies as buyers (with the file's contact when they have none). The quick screen runs
  GST search and (with a CIN) Company check for all of them with one cost popup and one cancel window, then sorts them
  into Avoid / Check further / Looks good / Not enough data by the rules in `src/lib/screen.ts`. The results table filters
  by result (default Looks good), state, years, filing and MCA status, sorts, deep-checks the ticked rows with one popup,
  and downloads as Excel. The file and the rows are stored (`bulk_searches`, `bulk_rows`).
- **Cancel window** (section 8). "Yes, run search" creates the request as `pending_start`; nothing is held, asked or run
  until `CANCEL_WINDOW_SECONDS` (default 3) pass, and Cancel inside the window leaves no ledger entry. A multiple search
  shares one window for all its rows.
- **Sample data mode** (section 10) and **turnover charts** (bar with year-on-year change, line, pie, current year by
  month; the PDF gets the bar chart).
- **Phones** (11.3): the cost and Continue sit in a bar at the bottom below the large layout; Cancel is 48 px tall; the
  font is Inter (₹ included) across the app.
- **Slots** (11.1, 11.2): SMS OTP through Fast2SMS on DLT, and KYC with DigiLocker at `/account/kyc` (a reminder for
  the Owner, not blocking; Q8). See PROVIDERS.md.

Still open from v4: AI person-name search (section 5), Ops-editable screen thresholds and per-organisation row limits,
all-India MCA import (paid database plan), Mumbai hosting (search is about 1.2 s from India against Sydney; the target is
under 1 s), and Q1 to Q10.

### v4 completion (20 Oct, later)

- **Live sources on**: API Setu GSTN Tax Payer V2 (sign-up, company search, ₹15 GST search; V1 as fallback when V2 is
  down) and MCA open data (search, ₹2 Company check). Reports name each source: "API Setu, 20 Oct 2026, 14:36 IST",
  "MCA open data as of 13 Oct 2026"; what a source does not give says "Not in this source". The GST section adds
  nature of business, e-invoicing, other places of business and tax office.
- **Multiple search**: deep check includes Case Check (Court, FIR in covered states, AML) for many buyers, with the
  search details from each buyer's record (FR-CC-04); "Add GSTIN" fixes a not-found row or replaces the offered matches;
  PRD paths `/api/v1/bulk-searches/...` and `/api/v1/wallet`, `/wallet/ledger` are aliases of the existing routes.
- **GST Registration Certificate** (GSTN on API Setu): on the KYC page the Owner or Admin gets the business's own
  certificate with an OTP to the primary authorised signatory; the PDF is kept write-once. Test mode (OTP 123456) until
  API Setu's encryption details for this API are in (`PROVIDER_GST_CERTIFICATE=apisetu`).
- **KYC** is offered right after the sign-up payment, and stays a reminder banner for the Owner until done.
- **Ops console (/admin, first part)**: data sources per service, MCA import per state with progress and a weekly
  refresh, organisations with wallet, KYC and the per-organisation sample data switch (FR-MK-01). Staff are the mobiles
  in `OPS_MOBILES` until staff sign-in arrives in Part 10.
- No "units" left in screens, ledger notes or PDFs (T12); every v4 screen checked at 360 px (T15).

