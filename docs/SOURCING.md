# Sourcing the data behind the APIs

`main` exposes 42 endpoints, but almost none of them fetch anything. The whole 21k-line
`src/` tree makes **one** outbound HTTP call. Everything else — MCA, GST, Udyam, eCourts,
bureau scores, telephony, WhatsApp — resolves from the local database or returns a
hardcoded literal.

This document is about closing that gap: for each capability the product promises, where
the real data comes from, what it costs you in eligibility rather than money, and how to
wire a real provider into the existing adapter seam.

> Commercial terms in this space are negotiated, change often, and are usually behind a
> sales conversation. Nothing here quotes a price. Treat every provider as "confirm current
> terms directly" — the durable part of this document is the *eligibility* and *architecture*,
> which move far more slowly than rate cards.

---

## 1. What actually has to be sourced

`src/lib/verification-gateway/types.ts` defines 17 report types. Grouped by where the data
must come from:

| Group | Report types | Real source |
|---|---|---|
| Corporate registry | `director_details`, company master data | MCA21 |
| Tax registration | `gst_slab_check`, `gst_exact_turnover`, `gst_supreme_report` | GSTN |
| MSME status | `msme_report` | Udyam portal |
| Trade | `import_export_report` | DGFT (IEC) |
| Identity | `mobile_to_pan`, `pan_to_mobile_email`, `mobile_identity`, `mobile_to_address`, `address_enrichment`, `find_someone` | Aggregators over NSDL/Protean, telco KYC |
| Litigation | `court_case_history`, `fir_check` | eCourts, NCLT, state police portals |
| Credit | `bureau_report`, `payment_behaviour` | CIBIL / Experian / CRIF / Equifax |
| Composite | `company_supreme_report` | Aggregator bundle of the above |

Plus the outbound channels: voice, WhatsApp, SMS, email, e-sign.

---

## 2. Three gates you hit before any pricing conversation

These decide what you are *allowed* to buy, and they are the real constraint.

**Credit bureau data is licensed, not sold.** Under the Credit Information Companies
(Regulation) Act 2005 (CICRA), only entities registered with the RBI as a Credit
Institution — a bank, NBFC, housing finance company, or a notified Specified User — or
entities registered with SEBI or IRDAI, can pull bureau data. You cannot sign up on a
website for this. Bureaus also require a data-security audit before granting direct access.
There are three realistic paths: become a Credit Institution, partner with one and pull
under their membership under a written agreement (common for early-stage lending
fintechs), or buy a derived product from an aggregator that holds the licence.

**SMS requires TRAI DLT registration.** Three phases, all mandatory before a single
message sends: register the entity, register the sender ID (header), register each
template. Unregistered traffic is blocked by the operators, not merely rate-limited.
WhatsApp does **not** need DLT — it is not classified as telecom SMS — but does need a
Business Service Provider account approved by Meta.

**Consent is a legal artefact under the DPDP Act 2023.** For a recovery product this is
not paperwork: you are processing a third party's personal data to contact them about a
debt. The consent record, its provenance, and its withdrawal path need to exist before the
first call, not after.

---

## 3. Tier 1 — free government sources

Enough to build a real V0 without a single commercial contract.

| Source | What you get | Access |
|---|---|---|
| [MCA21 V3](https://www.mca.gov.in/) | Company/LLP master data, CIN, status, directors, charges | Public portal, free. Basic master data needs no login; filing history and charge data do. **No documented public API** — this is why `main`'s MCA adapter is manual-entry. |
| [GST portal](https://services.gst.gov.in/services/searchtp) | GSTIN validity, legal name, status, registration date, taxpayer type | Public search, no credentials. **Turnover is not exposed** — that is why the product asks for GSTR-3B uploads. |
| [Udyam](https://udyamregistration.gov.in/) | MSME registration status, enterprise classification | Public verification, no auth |
| [eCourts](https://services.ecourts.gov.in/) / [NCLT](https://nclt.gov.in/) | Case history, insolvency proceedings | Public search; no bulk API, CAPTCHA-gated |
| [API Setu](https://apisetu.gov.in/) | MeitY's open API platform — validates GSTIN, IEC and PAN registration details | Free tier; register for a key |

API Setu is the one government route with a genuine API, and it is already the single real
integration in `main`:

```ts
// src/lib/verification-gateway/clients.ts
const res = await fetch(`https://apisetu.gov.in/gst/v1/turnover/${gstin}`, {
  headers: { "X-API-KEY": process.env.APISETU_API_KEY },
});
```

**The honest limit of Tier 1:** no bulk access, CAPTCHAs, and no SLA. It is correct for
manual, operator-driven verification — exactly what `main` built — and wrong for anything
automated at volume.

### Why `main` chose manual entry, and why that was right

Its adapters say so explicitly:

```ts
/**
 * MCA Adapter — V0 Public-Data Mode
 * There is no free, unauthenticated public JSON API for MCA21.
 * ...
 * Future: swap openMcaPortalUrl() + parseManualPayload() with an
 * authorized API Setu / Karza / Digitap call — the interface is the same.
 */
```

An operator opens the portal, reads the page, types what they saw, and the server files it
as `sourceStatus = "USER_PROVIDED"`. That is a defensible V0: the provenance is tracked
rather than fabricated, and the interface is already shaped for a real provider to drop in.

---

## 4. Tier 2 — commercial aggregators

One contract covering identity, business and litigation data. This is the practical answer
for most of the 17 report types.

| Provider | Notes |
|---|---|
| **Perfios (Karza)** | Karza was acquired by Perfios in February 2022. Named directly in `main`'s adapter comments. Its TotalKYC covers identity, business, financial and legal data; one of the deepest Indian data libraries. Sits alongside Perfios' bank-statement analysis. |
| **Signzy** | KYC/KYB, video KYC, bank verification |
| **IDfy** | Identity, background verification, litigation checks |
| **Digitap** | Named in `main`'s comments; identity and alternate data |
| **Surepass**, **Zoop**, **Setu** | Lighter-weight, faster to onboard, often better documented for small teams |

**How to choose.** Coverage per report type matters more than headline price — ask for a
per-endpoint coverage matrix against the 17 types above and check the *fill rate*, not just
whether an endpoint exists. Then check: pricing model (per-hit vs subscription vs
committed volume), whether failed lookups are billed, sandbox quality, and contractual
data-retention terms, which matter under DPDP.

Onboarding is typically a KYC of your own company, an agreement, and a security review —
days to weeks, not minutes.

---

## 5. Tier 3 — credit bureaus

The hardest and most valuable tier. Four bureaus operate in India: **TransUnion CIBIL**,
**Experian**, **CRIF High Mark**, **Equifax**. `main` declares a key for the first three.

Commercial (business) bureau reports are a distinct product from consumer reports and are
what a B2B credit-recovery product actually needs — CIBIL's commercial product covers
entity credit history, not an individual's score.

Access is gated by §2 above. Realistically:

1. **Direct membership** — only if you are already an RBI-registered Credit Institution.
2. **Under a partner's membership** — via co-lending or a written data-sharing agreement.
3. **Through an aggregator** that holds the licence and resells a derived product. Fastest,
   least control, and check carefully what you are contractually allowed to *display* to
   your own users.

**Budget the eligibility work, not the integration.** The API itself is straightforward;
becoming allowed to call it is the project.

---

## 6. Outbound channels

| Channel | What `main` declares | What it actually needs |
|---|---|---|
| Voice | `VOBIZ_SIP_ENDPOINT`, Asterisk | A SIP/telephony provider (Exotel, Knowlarity, Twilio, or a direct SIP trunk). `main` writes a `Call` row without dialling. |
| WhatsApp | `WHATSAPP_BSP_API_KEY` | A Meta-approved **BSP** (Gupshup, Twilio, and others). Template approval required. No DLT. |
| SMS | via BSP | **TRAI DLT registration first** — entity, header, template. Non-negotiable. |
| Email | `SENDGRID_API_KEY` | SendGrid or equivalent; domain auth (SPF/DKIM) before deliverability is usable. |
| TTS | `POLLY_ACCESS_KEY` | AWS Polly. Indian-language neural voices exist and are the reason the product ships scripts in four languages. |
| e-Sign | — | An ASP/ESP such as Digio or Leegality over NSDL/CDSL eSign, for Aadhaar OTP signatures under IT Act §3A. |

Two behaviours in `main` to fix before any of this is real, both already surfaced in the
Android UI:

- The **direct voice action bypasses the TRAI calling-window and frequency-cap checks**
  that the policy tick applies. Under a real telephony contract that is a compliance
  breach, not a bug in a demo.
- `/api/recovery/settle` **is not idempotent** — a replayed webhook applies twice. Fix
  before money moves through it.

---

## 7. What `main` declares vs what it needs

Its `.env.example` lists thirteen keys:

```
DATABASE_URL   REDIS_URL          APISETU_API_KEY    CIBIL_API_KEY
EXPERIAN_API_KEY   CRIF_API_KEY   WHATSAPP_BSP_API_KEY
SENDGRID_API_KEY   VOBIZ_SIP_ENDPOINT   POLLY_ACCESS_KEY
GEMINI_API_KEY     IT_PORTAL_API_KEY    GST_PORTAL_API_KEY
```

**Only `DATABASE_URL` is required to run.** Five of these are read by no code at all. The
rest are placeholders for integrations that do not exist yet — useful as a statement of
intent, misleading if read as a dependency list.

---

## 8. A phased sourcing plan

**Phase 0 — free, today.** Register for an API Setu key. Keep MCA/Udyam/eCourts on the
existing manual-entry flow with `USER_PROVIDED` provenance. This is genuinely shippable for
a small operator team and costs nothing.

**Phase 1 — one aggregator.** Contract a single Tier 2 provider covering identity, business
and litigation. Swap the four V0 adapters behind their existing interface. This is where
automated verification actually begins.

**Phase 2 — communications.** DLT registration (start early; it gates SMS entirely), a
WhatsApp BSP, SendGrid domain auth, and a telephony provider. Fix the calling-window bypass
before the first real call.

**Phase 3 — bureau.** Begin the eligibility work in parallel with Phase 1, because it is
the long pole. Until then, take bureau-derived data through the aggregator.

**Throughout — consent.** Build the DPDP consent record before Phase 2, not after.

---

## 9. Wiring a real provider in

The adapter seam already exists and is the best-built part of `main`. `VerificationAdapter`
is a typed contract with a registry, a DB-backed TTL cache keyed on
`(subjectType, subjectId, reportType)`, and parallel fan-out with per-report degradation:

```ts
export interface VerificationAdapter {
  provider: string;
  supportedReports: ReportType[];
  getReport(subject, reportType): Promise<NormalizedReport>;
}
```

To add a real provider:

1. Implement `VerificationAdapter` against the vendor SDK.
2. Register it in `src/lib/verification-gateway/adapters.ts`.
3. Keep `sourceStatus` honest — emit `VERIFIED` only for data a provider actually returned,
   never for manual entry.
4. Leave the V0 manual path in place as the fallback when a lookup fails or is not covered.

Nothing in the Android client changes. It consumes `NormalizedReport` through
`backgroundcheck/data/BackgroundCheckApi.kt`, so a provider swap is invisible to it — which
is the point of the seam.

One thing the client will need updating for: it currently labels manual data as
user-provided and states plainly that certain checks are not performed. **Those notices are
tied to real behaviour.** When a provider makes a check real, update the copy — and only
then.

---

## Sources

- [API Setu — Government of India open API platform](https://apisetu.gov.in/)
- [API Setu documentation: use cases](https://docs.apisetu.gov.in/document-central/explore-apisetu/Use%20Cases.html)
- [MCA21 V3 portal](https://www.mca.gov.in/)
- [Perfios — KYC/KYB products (Karza)](https://perfios.ai/in/products/kyc-kyb/)
- [Identity verification API vendor guide, 2026](https://www.befisc.com/fintechsherlock/signzy-hyperverge-karza-idfy-alternatives-2026/)
- [Credit bureau API integration overview](https://vistarkriya.com/website/blog/post.php?slug=credit-bureau-api-integration-cibil-experian-crif-equifax)
- [TransUnion CIBIL access paths for lending teams](https://productgrowth.in/tools/kyc-identity/cibil/)
- [DLT registration: TRAI guide for India](https://www.smscountry.com/blog/dlt-registration/)
- [India SMS regulations and TRAI compliance](https://www.messagecentral.com/sms-guideline/india)
- [WhatsApp Business API in India: BSP, DPDP, integration](https://www.messagecentral.com/blog/whatsapp-business-api-india-guide)
