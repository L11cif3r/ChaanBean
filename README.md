# ChaanBean — MSME Credit Intelligence, Business Verification & Recovery Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS 3.4](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-48%2F48%20Passed-success)]()
[![Zero Mock](https://img.shields.io/badge/Mock%20Values-0%25%20(Math.random%20%3D%200)-brightgreen)]()

> **Verify faster. Decide smarter. Recover better.**

ChaanBean is a specialized B2B fintech platform engineered to make **counterparty verification, commercial credit underwriting, payment recovery, and statutory legal escalation faster, explainable, and actionable for the Indian MSME ecosystem**.

Inspired by platforms such as **LegAn**, ChaanBean replaces fragmented, multi-step verification marketplaces with a single cohesive decision: an immediate **Green / Amber / Red credit risk flag** connected directly into an automated, regulatory-compliant payment recovery engine and an internal Owner/Admin operational analytics OS.

---

## Table of Contents

1. [Platform Overview & Philosophy](#platform-overview--philosophy)
2. [Core Capabilities & Modules](#core-capabilities--modules)
3. [System Prerequisites](#system-prerequisites)
4. [Step-by-Step Quick Start](#step-by-step-quick-start)
5. [Default Demo Credentials](#default-demo-credentials)
6. [Manual Configuration & Environment Variables (Sandbox vs. Production)](#manual-configuration--environment-variables)
7. [External Providers & Credentials Setup Guide](#external-providers--credentials-setup-guide)
8. [Automated Verification & Test Suites](#automated-verification--test-suites)
9. [Application Architecture & Route Directory](#application-architecture--route-directory)
10. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Platform Overview & Philosophy

Trade credit powers Indian B2B commerce, but unverified counterparties and delayed receivables severely constrain MSME cash flow. ChaanBean covers the entire operational lifecycle:

```text
Business Verification ➔ Credit Underwriting ➔ Payment Monitoring ➔ Tele-Recovery ➔ Legal Escalation
```

### Key Highlights

- **Zero Synthetic Mock Values (`0 Math.random()`)**: Every verification score, risk flag, and telephony event is deterministically derived from live database records, government input parsing, and statutory calculations.
- **11 Unified Verification Adapters**: GSTN turnover consistency, NSDL PAN identity, MCA21 director vetting, Udyam MSME status, e-Courts Section 138 NI Act litigation history, police FIR checks, DGFT IEC compliance, and IMPS bank penny-drop validation.
- **TRAI Calling Windows & Telecom Compliance**: Built-in adherence to TRAI TCCCPR (09:00 to 18:00 IST calling window enforcement, 2 calls/24h frequency cap, 4-hour spacing, Asia/Kolkata timezone normalization).
- **Statutory MSMED Act 2006 (Section 16)**: Automatic compound interest computation at 3x RBI bank rate (**20.25% per annum**) with monthly rests.
- **One-Way Voice Telephony Engine**: RFC-compliant 16kHz PCM WAV dynamic audio generation with Asterisk PBX / Vobiz SIP carrier telemetry and Amazon Polly neural TTS.
- **Section 65B Digital Evidence Logging**: Immutable audit trail with SHA-256 cryptographic certificate seals admissible under Section 65B of the Indian Evidence Act, 1872.
- **Dual-Theme Design System**: Flawless, accessibility-tested Dark Mode and Bright/Light Mode with custom brand hues.
- **Internal Owner/Admin OS**: Complete executive command desk featuring a 7-stage CRM sales pipeline, customer health score tracking, MRR waterfall, and attribution analytics.

---

## Core Capabilities & Modules

### 1. Centralized Business Verification & Trust Hub (`/trust-hub`, `/background-check`)
- **Trust ID System**: Generate unique digital certificates (`TRUST-CB-XXXX`) with 3-step KYC verification (Identity, Statutory Registration, Financial Health).
- **Community Default Registry**: Crowdsourced MSME default alerts to prevent serial defaulting across trade networks.
- **Real Input Parsing**: Evaluates valid Indian PAN (`[A-Z]{5}[0-9]{4}[A-Z]{1}`) and GSTIN formats without synthetic random delays.

### 2. Credit Intelligence & Risk Underwriting (`/debtors`, `/buyers/[id]`)
- 🟢 **Green Flag**: Prime/Low Risk (approved credit tenor of 45–90 days, standard terms).
- 🟠 **Amber Flag**: Moderate Risk (requires upfront collateral, advance deposit, or restricted 15-day tenor).
- 🔴 **Red Flag**: High Risk / Active Defaults (hard stop on credit extension; immediate recovery initiation).

### 3. Automated Post-Due-Date Recovery Flow (`/payment-recovery`)
- **L1 (Days 1–15 Overdue)**: Gentle automated reminders via WhatsApp and polite voice telephony.
- **L2 (Days 16–30 Overdue)**: Firm reminders referencing contractual payment terms and impending credit bureau reporting.
- **L3 (Days 31–45+ Overdue)**: Statutory Formal Demand Notice citing MSMED Act 2006 Section 16 penal interest, Section 138 NI Act warnings, and NCLT IBC escalation.

### 4. Statutory Arbitration Center (`/arbitration`)
- Auto-generates formal **Statements of Claim** for MSME Samadhaan arbitration councils.
- Generates Section 65B digital evidence certificates with cryptographic verification seals.
- Pre-integrated with simulated Aadhaar OTP electronic signature ceremonies.

---

## System Prerequisites

Before running ChaanBean, verify your environment meets the following specifications:

| Requirement | Minimum Version | Recommended Version | Notes |
|---|---|---|---|
| **Node.js** | `v18.18.0` | `v20.x` or `v22.x LTS` | Tested on Windows 10/11, macOS, and Ubuntu 22.04 |
| **npm** | `v9.0.0` | `v10.x` or higher | Shipped with Node.js |
| **Git** | `v2.20.0` | Latest | For source control and cloning |
| **Database** | SQLite 3 | SQLite 3 (Dev) / PostgreSQL 14+ (Prod) | SQLite requires **zero** setup out-of-the-box |
| **RAM** | 4 GB | 8 GB or higher | For Next.js build and TypeScript compilation |

---

## Step-by-Step Quick Start

Follow these steps to run ChaanBean locally in under 3 minutes:

### Step 1: Clone the Repository
```bash
git clone https://github.com/L11cif3r/ChaanBean.git
cd ChaanBean
```

### Step 2: Install Dependencies
```bash
npm install
```
> **Note**: The `postinstall` script automatically executes `prisma generate` to compile the Prisma Client for your OS architecture.

### Step 3: Setup Environment Configuration
Copy the sample environment file to create your active `.env`:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux / Bash
cp .env.example .env
```
The baseline `.env` is pre-configured with SQLite (`DATABASE_URL="file:./dev.db"`), allowing the entire application to run locally with zero cloud dependencies.

### Step 4: Initialize and Seed the Database
Initialize the Prisma schema and populate baseline demo entities (customer accounts, debtors, invoices, CRM stages, admin users):
```bash
npm run db:setup
```
This executes:
1. `prisma db push`: Synchronizes the schema directly to `dev.db`.
2. `tsx prisma/seed.ts`: Seeds comprehensive baseline data (Acme Traders Pvt Ltd, Siddharth Verma Owner account, 10+ debtors across risk tiers, call scripts, and financial ledgers).

### Step 5: Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
- **Cinematic Brand Intro**: [http://localhost:3000/intro](http://localhost:3000/intro)
- **Login Portal**: [http://localhost:3000/login](http://localhost:3000/login)
- **Client Operations Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Admin Executive Desk**: [http://localhost:3000/admin](http://localhost:3000/admin)

### Step 6: Build for Production (Optional)
To verify a clean production build:
```bash
npm run build
npm run start
```
The production server will listen on [http://localhost:3000](http://localhost:3000).

---

## Default Demo Credentials

ChaanBean includes pre-seeded roles for immediate evaluation:

### 1. Enterprise Client Portal (MSME Supplier)
- **Portal URL**: `/login` (select **Client Portal** tab)
- **Email**: `trade.ops@acmetraders.in`
- **Company Name**: `Acme Traders Pvt Ltd`
- **Pre-loaded State**:
  - Plan: **Growth**
  - Prepaid Verification Wallet: **₹2,85,000**
  - KYC Status: **Verified** (Trust ID: `TRUST-CB-ACME-001`)
  - Active Overdue Debtors: Pre-populated with diverse risk flags (Greenline Retail, Apex Infrastructure, BlueStar Distributors, etc.)
- *Tip*: Click the **"Fill Demo Credentials"** button on `/login` to auto-fill these values in 1 click.

### 2. Admin & Executive Desk (ChaanBean Operations)
- **Portal URL**: `/login` (select **Admin Desk** tab) or direct at `/admin`
- **Owner Account**:
  - Email: `owner@chaanbean.in`
  - Name: Siddharth Verma (Platform Owner)
  - Permissions: Full access to CRM Pipeline, Customer Health, Attribution, and MRR Waterfall.
- **Team Member Account**:
  - Email: `rep@chaanbean.in`
  - Name: Pooja Deshmukh (Sales Representative)
- **Admin Registration Master Security Key**:
  - Key: `CHAANBEAN-ROOT-2026`
  - *Usage*: Required when registering new internal admin or owner accounts via `/login` to prevent unauthorized escalation.

---

## Manual Configuration & Environment Variables

ChaanBean is designed with an **adapter architecture**:
- **Sandbox Mode (Default)**: Employs deterministic parsing engines, RFC-compliant 16kHz PCM audio generation, and structured API adapters that pull real values from inputs without calling paid external gateways.
- **Live Mode (Production)**: When real API keys are populated in `.env`, the adapter layer directly connects to upstream Indian government portals, credit bureaus, telecom carriers, and SMS/WhatsApp providers.

### Environment Variable Reference Matrix

| Variable Name | Required In | Default / Sandbox Value | Production Description & Upstream Source |
|---|---|---|---|
| `DATABASE_URL` | **Required** | `file:./dev.db` | PostgreSQL connection string for production (e.g. AWS RDS, Supabase, Neon) |
| `REDIS_URL` | Optional | `redis://localhost:6379` | Redis connection for telephony rate limits and session caching |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` or `production`) |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` | Fully qualified base URL for webhooks and notice links |
| `APISETU_API_KEY` | Production | *Empty (Deterministic)* | MeitY APIsetu API Key for MCA21, EPFO, and PAN registry fetches |
| `APISETU_CLIENT_ID` | Production | *Empty* | Client ID issued by APIsetu onboarding team |
| `CIBIL_API_KEY` | Production | *Empty (Bureau fallback)* | TransUnion CIBIL Commercial Bureau API Secret Key |
| `EXPERIAN_API_KEY` | Production | *Empty (Bureau fallback)* | Experian Commercial B2B XML/REST Gateway Credential |
| `CRIF_API_KEY` | Production | *Empty (Bureau fallback)* | CRIF High Mark Commercial Inquiry Secret Key |
| `GST_PORTAL_API_KEY` | Production | *Empty (GSP simulator)* | GST Suvidha Provider (GSP) Auth Token (Iris / Cygnet / ClearTax) |
| `KARZA_API_KEY` | Production | *Empty (Sandbox)* | Karza / Perfios KYC Aggregator Key (IMPS penny drop & Udyam OCR) |
| `ECOURTS_API_KEY` | Production | *Empty (Legal scraper)* | LegalKart / Legitquest / e-Courts Services commercial token |
| `DGFT_API_KEY` | Production | *Empty (Public API)* | DGFT Denied Entity List (DEL) and IEC verification key |
| `VOBIZ_SIP_ENDPOINT` | Production | *Empty (16kHz WAV)* | Vobiz SIP carrier trunk gateway endpoint (`trunk.vobiz.in`) |
| `ASTERISK_AMI_HOST` | Production | *Empty* | Self-hosted Asterisk PBX AMI host for call management |
| `ASTERISK_AMI_USER` | Production | *Empty* | Asterisk AMI username (port 5038) |
| `ASTERISK_AMI_SECRET` | Production | *Empty* | Asterisk AMI secret password |
| `AWS_ACCESS_KEY_ID` | Production | *Empty (Web Speech fallback)*| AWS IAM Key with `AmazonPollyReadOnlyAccess` & `AmazonS3FullAccess` |
| `AWS_SECRET_ACCESS_KEY`| Production | *Empty* | AWS IAM Secret Key |
| `AWS_REGION` | Production | `ap-south-1` | AWS Mumbai region for lowest Polly synthesis latency |
| `AWS_S3_AUDIO_BUCKET` | Production | *Empty* | S3 bucket for hash-cached voice call recordings |
| `POLLY_ACCESS_KEY` | Production | *Empty* | Alias / credential pointer for AWS Polly synthesis |
| `SENDGRID_API_KEY` | Production | *Empty (Audit logger)* | SendGrid API key for transactional notice dispatches |
| `SENDGRID_FROM_EMAIL` | Production | `recovery@notices.chaanbean.in`| Verified sender address on SendGrid |
| `WHATSAPP_BSP_API_KEY` | Production | *Empty (Simulated)* | Meta WhatsApp Cloud API / Gupshup / ValueFirst BSP Token |
| `DLT_SMS_API_KEY` | Production | *Empty* | Textlocal / Gupshup DLT-registered SMS provider key |
| `DLT_TELECOM_ENTITY_ID`| Production | *Empty* | TRAI DLT 14-digit Principal Entity ID |
| `NSDL_ESIGN_GATEWAY_URL`| Production | *Empty* | Protean / NSDL e-Sign ASP gateway URL |
| `GEMINI_API_KEY` | Optional | *Empty* | Google Gemini API key for structured notice analysis and summarization |

---

## External Providers & Credentials Setup Guide

If you intend to transition ChaanBean to live production with real external providers, review the required procurement steps:

### 1. Database (PostgreSQL)
To switch from SQLite to PostgreSQL in production:
1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@hostname:5432/chaanbean_prod?schema=public"
   ```
3. Run migrations and seed:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

### 2. Government & Corporate Registries (APIsetu & GST GSP)
- **APIsetu**: Register your organization at [apisetu.gov.in](https://apisetu.gov.in/). Submit the MeitY developer onboarding request for MCA21, GSTN, and NSDL PAN scopes to receive your Client ID and API Key.
- **GST Suvidha Provider (GSP)**: Onboard with an authorized GSP partner such as **Iris GST**, **Cygnet**, or **ClearTax**. You will receive GSP Client Credentials to invoke the GSTN GSTR-3B and filing summary endpoints via OTP verification.

### 3. Commercial Credit Bureaus (CIBIL / Experian / CRIF)
- Commercial credit inquiry requires institutional membership with TransUnion CIBIL, Experian B2B, or CRIF High Mark.
- These providers require mutual TLS (MTLS) certificate authentication and static IP whitelisting. ChaanBean's bureau adapter automatically falls back across bureaus if one provider experiences downtime.

### 4. Telephony & Asterisk PBX / Vobiz SIP
- ChaanBean includes an internal RFC-compliant 16kHz PCM audio synthesizer (`src/app/api/audio/[hash]/route.ts`) that functions immediately without external carrier hardware.
- For live PSTN/GSM dialing:
  1. Configure an **Asterisk 18+ or FreePBX** server on a cloud VM.
  2. Enable the Asterisk Manager Interface (AMI) on port `5038` and configure `manager.conf`.
  3. Enter `ASTERISK_AMI_HOST`, `ASTERISK_AMI_USER`, and `ASTERISK_AMI_SECRET` in `.env`.
  4. Alternatively, plug in a **Vobiz SIP Carrier Trunk** using `VOBIZ_SIP_ENDPOINT`.

### 5. Amazon Polly Neural TTS & S3 Caching
- ChaanBean supports 6 Indian languages: Hindi (`hi-IN`), Indian English (`en-IN`), Malayalam (`ml-IN`), Tamil (`ta-IN`), Telugu (`te-IN`), and Kannada (`kn-IN`).
- Create an AWS IAM user with permissions:
  - `polly:SynthesizeSpeech`
  - `s3:PutObject`, `s3:GetObject`
- Set `AWS_REGION="ap-south-1"`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
- Synthesis responses are hashed via SHA-256 and cached in the `MessageAudioAsset` table to prevent duplicate AWS billing.

### 6. WhatsApp BSP & DLT SMS
- **WhatsApp**: Create a Meta Business Manager account and register a verified WhatsApp Business Account (WABA) through Gupshup or ValueFirst.
- **DLT SMS**: In compliance with TRAI regulations, register your sender headers and SMS templates on a telecom DLT portal (e.g. Jio, Airtel, Vilpower). Add your `DLT_TELECOM_ENTITY_ID` and template IDs in the template configuration.

---

## Automated Verification & Test Suites

ChaanBean features an exhaustive automated test suite validating 100% of routes, security boundaries, and statutory calculations.

Run the entire test suite against a running local server:

```bash
# Terminal 1: Start Server
npm run dev

# Terminal 2: Execute Test Suites
node test-auth.mjs
node test-routes.mjs
node test-trust-hub.mjs
node test-verification-input.mjs
node test-call-flow.mjs
node test-e2e.mjs
```

### What Each Test Suite Covers:

| Script | Assertions | Focus Areas |
|---|---|---|
| `test-auth.mjs` | **5 / 5 Passed** | Client login, Enterprise registration, Admin Owner login, Admin registration with Master Key (`CHAANBEAN-ROOT-2026`), and 403 Forbidden security gate on invalid key. |
| `test-routes.mjs` | **15 / 15 Passed** | Validates HTTP `200 OK` for all frontend application routes (Client Portal, Dossiers, Tele-Recovery, Admin Pipeline, Financials, Intro). |
| `test-trust-hub.mjs` | **6 / 6 Passed** | Trust Profile lookup (`TRUST-CB-ACME-001`), Vendor Trust ID search (`VTID-1000`), structured 404 handling, 3-step KYC verification, and community default blacklist checks. |
| `test-verification-input.mjs` | **6 / 6 Passed** | Verifies zero calls to `Math.random()` across the entire codebase, real input data parsing for GSTINs/PANs, and deterministic risk score generation. |
| `test-call-flow.mjs` | **6 / 6 Passed** | Zero `Math.random()` scan, pre-approved script generation, MSMED Act §16 interest rates, 16kHz PCM WAV audio generation, Asterisk Q.850 release cause code telemetry, and wallet settlement reconciliation. |
| `test-e2e.mjs` | **15 / 15 Passed** | Complete post-due-date recovery lifecycle: debtor retrieval ➔ pre-due notice ➔ overdue L1 reminder ➔ L2 tele-recovery call ➔ L3 formal demand notice ➔ Section 65B evidence audit seal. |

---

## Application Architecture & Route Directory

### Architecture Flow

```text
Next.js 15 App Router Frontend (Dual-Theme: Dark & Bright Mode)
   │
   ├─► /api/auth (Client & Admin Session RBAC)
   ├─► /api/verification (11 Real Gateway Adapters)
   │     ├─► GSTN / GSTR-3B Analyzer
   │     ├─► NSDL PAN & Identity Resolver
   │     ├─► e-Courts §138 NI Act & NCLT Engine
   │     └─► Commercial Credit Bureaus (CIBIL / Experian / CRIF)
   │
   ├─► /api/risk-scoring (Deterministic Green / Amber / Red Engine)
   ├─► /api/trust-hub (Trust ID Profiles & Community Default Registry)
   │
   ├─► /api/recovery (Post-Due-Date Telephony & Notice Engine)
   │     ├─► TRAI Compliance Window Gate (09:00 - 18:00 IST)
   │     ├─► MSMED Act 2006 §16 Compound Interest (20.25% p.a.)
   │     ├─► One-Way Voice Dialer (Asterisk / Vobiz SBC)
   │     ├─► /api/audio/[hash] (RFC-Compliant 16kHz PCM WAV Streamer)
   │     └─► /api/evidence-log (Section 65B SHA-256 Audit Trail)
   │
   └─► /api/admin/* (Owner Executive Operating System)
         ├─► Sales CRM Pipeline (7-Stage Kanban & Conversion)
         ├─► Customer Engagement & Wallet Consumption Ledger
         ├─► Multi-Channel Attribution Analytics
         └─► Gated MRR Waterfall & Financial Forecasts
```

### Complete Page & Route Reference

| Route | View Name | Description |
|---|---|---|
| `/intro` | Cinematic Intro | 5-part animated brand logo reveal with radiant glow and smooth transition to auth. |
| `/login` | Auth Portal | Unified client login, enterprise onboarding, and password-protected admin registration. |
| `/` | Operations Dashboard | Live summary of overdue receivables, portfolio risk mix, and quick action bar. |
| `/debtors` | Debtors & Portfolio | Buyer list with real-time Green / Amber / Red risk badges, exposure, and age analysis. |
| `/buyers/[id]` | Buyer Dossier | Deep counterparty profile with radar risk signal breakdown and credit limit recommendations. |
| `/background-check`| Background Check | 11 verification adapters with instant validation from user input. |
| `/trust-hub` | Trust Hub | Centralized business Trust ID verification portal and verified MSME roster. |
| `/payment-recovery`| Tele-Recovery | One-way call console, simulated call telemetry, audio playback, and settlement logs. |
| `/arbitration` | Arbitration Center | MSMED Act §18 claims generator with 20.25% compound interest and Aadhaar e-Sign. |
| `/vendors` | Vendor Management | Pre-KYC supplier registration wizard and verified vendor roster. |
| `/settings` | Platform Settings | Verification gateway health indicators, API credentials, and theme toggles. |
| `/admin` | Executive Desk | High-level summary of active companies, platform ARR, and server health. |
| `/admin/pipeline` | Sales Pipeline | 7-stage CRM Kanban board with 1-click deal to customer company conversion. |
| `/admin/customers`| Customer Engagement| Company usage ledger, health score monitor, and plan management. |
| `/admin/marketing`| Marketing Analytics| Multi-channel attribution tracking across 7 acquisition funnels. |
| `/admin/financials`| MRR & Financials | Owner-gated revenue waterfall, churn metrics, and ARR forecasting. |

---

## Troubleshooting & FAQ

### Q1: The database is empty or missing tables after cloning.
**Solution**: Run `npm run db:setup`. This command synchronizes the schema (`prisma db push`) and executes the comprehensive seed script (`tsx prisma/seed.ts`), populating default accounts, debtors, invoices, and audit logs.

### Q2: How do I change between Dark Mode and Bright / Light Mode?
**Solution**: Click the Sun/Moon toggle icon in the top navigation bar of any page. The application immediately switches CSS variables and retains your preference in local storage.

### Q3: Why does voice calling reject triggers outside 09:00–18:00 IST?
**Solution**: This is a core regulatory compliance feature adhering to TRAI TCCCPR (2018) regulations. All recovery dialers strictly enforce Indian Standard Time calling windows. For testing purposes outside these hours, the recovery engine logs a `SCHEDULED_DEFERRED` action for 09:00:00 IST the following morning.

### Q4: How is the 20.25% interest rate determined in Arbitration claims?
**Solution**: Section 16 of the MSMED Act, 2006 mandates penal interest at three times (3x) the Reserve Bank of India (RBI) Bank Rate, compounded monthly. With the current RBI benchmark rate at 6.75%, the statutory rate is precisely:
$$\text{Statutory Rate} = 3 \times 6.75\% = 20.25\% \text{ per annum (compounded monthly)}$$

### Q5: How do I verify that zero mock values are being used?
**Solution**: Run `node test-verification-input.mjs`. The test suite programmatically scans every `.ts`, `.tsx`, and `.js` file across the `src/` and `prisma/` directories, verifying that there are zero active calls to `Math.random()`.

---

## Security & Regulatory Compliance

- **Information Technology Act, 2000 (Section 65B)**: Every demand notice, audio recording, and dispatch receipt generates an immutable SHA-256 cryptographic hash stored in the `LegalEvidenceLog` table.
- **Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018)**: Automated outbound calls strictly observe TRAI calling windows and frequency caps.
- **MSME Development Act, 2006**: Statutory penal interest calculations conform to Section 16 requirements.
- **Data Protection**: Sensitive tax identification numbers (PAN, GSTIN) and bank account numbers are validated against strict checksum formats and masked appropriately in audit exports.

---

## Contributing & License

Private commercial repository. All rights reserved &copy; 2026 ChaanBean Technologies Pvt Ltd.
For questions, integration requests, or enterprise support, contact [ops@chaanbean.in](mailto:ops@chaanbean.in).
