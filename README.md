# ChaanBean

## MSME Credit Intelligence, Business Verification & Recovery Platform

ChaanBean is a B2B fintech platform designed to make **business verification, credit assessment, payment recovery, and financial risk management faster and more actionable for the Indian MSME ecosystem**.

The platform is inspired by products such as **LegAn**, but takes a more focused approach. Instead of presenting businesses with a large collection of independent verification services, ChaanBean aims to bring the relevant information together, analyse it, and turn it into a **simple, explainable business decision**.

> **Verify faster. Decide smarter. Recover better.**

---

## What is ChaanBean?

Businesses frequently operate on credit, making it important to understand who they are dealing with before extending credit and what to do when payments are delayed.

ChaanBean is designed to cover this entire operational journey:

**Business Verification → Risk Assessment → Credit Decision → Payment Monitoring → Tele-Recovery → Legal Escalation**

The platform combines information from multiple verification and financial sources and presents it through a unified, dual-theme (Dark & Bright) interface with zero synthetic mock values.

---

## Core Capabilities

### Business Verification

ChaanBean brings 11 real verification gateway adapters into one unified platform:

- GST verification and turnover analysis (GSTR-3B consistency)
- Exact GST turnover & slab estimation
- PAN and identity verification (NSDL)
- Mobile-to-PAN and mobile identity checks
- Mobile-to-address verification
- MSME / Udyam statutory verification
- MCA21 Company filings and director DIN vetting
- e-Courts litigation & Section 138 NI Act case history
- Police FIR checks
- DGFT Import / export IEC information
- Commercial bank account IMPS penny-drop validation
- Defaulter bureau and peer default network reports

---

### Credit Intelligence

ChaanBean converts collected data into an immediate, explainable risk decision:

🟢 **Green** — Lower-risk profile (approved credit tenor & recommended limits)

🟠 **Amber** — Caution or additional collateral / short tenor required

🔴 **Red** — High-risk profile / active defaults / hard override to stop credit

---

### Payment Recovery & Telephony

The platform automates the post-due-date recovery cycle with strict statutory compliance:

- **TRAI Calling Hours Compliance**: Enforces calling windows (09:00 to 18:00 IST) and frequency caps.
- **MSMED Act 2006 (Section 16)**: Automatic compound interest calculation at 3x RBI bank rate (20.25%) with monthly rests.
- **One-Way Voice Telephony**: Asterisk PBX / Vobiz SIP carrier telemetry with RFC-compliant 16kHz PCM WAV streaming.
- **Multilingual TTS**: Web Speech synthesis supporting Hindi, Tamil, Malayalam, Telugu, Kannada, and English.
- **Legal Notices**: IT Act 2000 Section 65B digital evidence logs with cryptographic SHA-256 certificate seals.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup SQLite database and seed initial test records
npm run db:setup

# 3. Start development server
npm run dev
# Or start production build
npm run build && npm run start
```

Open [http://localhost:3000](http://localhost:3000) (or `/intro`) to view the animated intro and login portal.

---

## Application Architecture

```text
Company Portal (Next.js 15 App Router + Tailwind CSS)
  → API routes (Auth, Verification, Telephony, Trust Hub)
    → Verification Gateway (11 real adapters, parallel fan-out, cache-first)
    → Risk Scoring Engine (deterministic Green/Amber/Red)
    → Credit Decision Engine (recommended limit & tenor)
    → Payment Recovery Engine
        → Policy Engine (L1 Gentle → L2 Firm → L3 Statutory Legal)
        → Telephony Engine: Asterisk PBX / Vobiz Carrier SBC + 16kHz PCM WAV Audio
    → Legal Evidence Log (immutable Section 65B SHA-256 audit trail)
    → Trust Hub & Community Default Registry (Peer Default Alerts)
    → Owner / Admin Analytics OS (CRM Pipeline, MRR Waterfall, Customer Health)
```

---

## Screens & Routes

| Route | Module | Description |
|---|---|---|
| `/intro` | Cinematic Intro | Animated 5-part logo assembly with radiant bloom |
| `/login` | Auth Portal | Dual Client Portal & Admin Desk login and registration |
| `/` | Dashboard | Operations Alert Bar & 8 live command center modules |
| `/trust-hub` | Trust Hub | Centralised Business Verification (Trust ID) & Check Verified Businesses |
| `/debtors` | Debtors & Portfolio | Buyer list with live Green / Amber / Red risk flags |
| `/buyers/[id]` | Buyer Dossier | Risk signal radar, exposure breakdown, and live counterparty stream |
| `/background-check` | Background Check | 11 verification adapters with live data pulled from input |
| `/payment-recovery` | Tele-Recovery | One-way call console, Asterisk/Vobiz telemetry, settlement reconciliation |
| `/arbitration` | Arbitration Center | MSMED Act §18 claims with 20.25% compound interest & Aadhaar e-Sign |
| `/vendors` | Vendor Management | Pre-KYC registration wizard and verified vendor roster |
| `/admin` | Admin Executive Desk | Overview of ARR, active companies, and system health |
| `/admin/pipeline` | Sales Pipeline CRM | 7-stage Kanban with 1-click customer company conversion |
| `/admin/customers` | Customer Engagement | Real company usage ledger consumption and health score tracking |
| `/admin/marketing` | Marketing & Attribution | Conversion tracking across 7 acquisition channels |
| `/admin/financials` | Financials (MRR) | Owner-only gated MRR waterfall, revenue breakdown & forecast |
| `/settings` | Settings | Platform configuration and API gateway statuses |

---

## Verification Test Suites

```bash
node test-auth.mjs               # 5/5 PASSED: Client & Admin Auth, Registration & RBAC
node test-routes.mjs             # 15/15 PASSED: All user and admin routes [200 OK]
node test-trust-hub.mjs          # 6/6 PASSED: Trust ID verification, 3-step KYC & Default gate
node test-verification-input.mjs # 6/6 PASSED: Real data pulled from input & 0 Math.random()
node test-call-flow.mjs          # 6/6 PASSED: 16kHz WAV streaming, Q.850 telemetry & settlement
node test-e2e.mjs                # 15/15 PASSED: End-to-end multi-channel recovery flow
```
