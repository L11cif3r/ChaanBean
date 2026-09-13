# ChaanBean Mobile App

A cross-platform React Native (Expo) mobile application for **ChaanBean** — MSME Credit Intelligence, Business Verification & Recovery Platform.

Built with **React Native**, **Expo SDK 57**, and a dual-theme design system featuring **Swiggy Orange (`#FC8019`)** and **Obsidian Dark Mode**.

---

## Features Implemented in Mobile App

### 1. Operations Command Desk (`HomeScreen`)
- **Monitored Trade Receivables**: Real-time breakdown of total active receivables (₹56.10 Lakhs) and overdue balance (₹38.10 Lakhs).
- **Deterministic Credit Risk Flag Radar**: Interactive breakdown across Green (Prime Low Risk), Amber (Moderate Risk), and Red (High Risk Default) tiers.
- **Priority Attention Alert**: Direct card for high-risk counterparties (e.g. Metro Supplies Co).
- **Fast Action Grid**: Quick access to 18 statutory adapters, OmniTrace 360™, Tele-Recovery, and Statutory Arbitration.
- **Section 65B Digital Evidence Log**: Live feed of cryptographic SHA-256 evidence seals and Government Reference Numbers.

### 2. Business Background Check (`VerificationScreen`)
- **18 Isolated Feature Tabs** with dedicated parameter inputs, autofill chips, and formatted visual dossier cards:
  1. `director_details`: MCA21 DIN profile, directorship appointments, shareholding stakes, and Companies Act §164(2) disqualifications.
  2. `msme_report`: Official Udyam registration certificate, enterprise classification, and NIC codes.
  3. `gst_slab_check`: Aggregate turnover bracket, tax liability slab, and return filing frequency.
  4. `gst_exact_turnover`: Multi-year audited GSTR-3B turnover breakdown with CAGR.
  5. `gst_monthly_filings`: 12-month compliance calendar with official Government ARNs.
  6. `gst_supreme_report`: 360° PAN purchase/sales reconciliation and ITC mismatch detection.
  7. `trust_hub_verification`: Digital Trust ID certificate (`TRUST-CB-XXXX`) and credibility score (0–1000).
  8. `mobile_to_pan`: Resolves mobile number to verified PAN and cardholder name under ITD records.
  9. `mobile_identity`: Multi-carrier telecom KYC, SIM tenure, and active circle.
  10. `court_case_history`: eCourts Section 138 NI Act cheque dishonor suits and State police CCTNS records.
  11. `import_export_report`: DGFT Importer-Exporter Code (IEC) and ICEGATE customs clearances.
  12. `education_marksheet_check`: NAD & CBSE 10th/12th marksheet verification with SHA-256 hash.
  13. `pan_to_gst`: Multi-state GSTIN directory linking state branch registrations under parent PAN.
  14. `voice_call_cadence`: Outbound Asterisk/Vobiz cadence scheduler (1m, 2m, 5m, 30m, 1h) with emergency 24/7 override.
  15. `legal_notice_suite`: 4 statutory notices with official Government Reference Numbers (`ITD-DISPUTE-ACK-...`, `GSTN-DRC-01A-...`).
  16. `delayed_payment_followup`: Temporal aging schedule (1–15, 16–30, 31–45, 45+ days) and promise-to-pay tracker.
  17. `subscription_seats`: 5 team member access seats with role-based governance.
  18. `additional_company_addon`: Multi-entity expansion module for ₹1,500 add-on.

### 3. OmniTrace 360™ (`FindSomeoneScreen`)
- **9-Vector Debtor Skip-Tracing**:
  1. **Alternate Mobiles**: Consumer delivery clusters (Swiggy, Amazon, Meesho, Zomato, Blinkit, Paytm, Zepto, WhatsApp) with 1-click dial & copy.
  2. **Alternate Emails**: MCA official, director personal, GST contact, domain WHOIS.
  3. **Alternate Addresses**: MCA office, director residence, GST warehouse, delivery clusters.
  4. **Digital Age & Footprint**: Tenure (years/months), earliest statutory filing, fintech adoption index.
  5. **Bank & Physical Branch**: IFSC, MICR, masked commercial account, and verified clearing UTR.
  6. **CIBIL Commercial**: Score, commercial rank, active lines, 30/60/90+ DPD buckets.
  7. **Experian Commercial**: Score, risk band, default probability percentage.
  8. **CRIF High Mark**: Score, reliability index, trade inquiry frequency.
  9. **PAN Legal Entity Verification**: PAN-Aadhaar linkage status, multi-state GSTIN count.

### 4. Tele-Recovery Workbench (`RecoveryScreen`)
- **CALL All Time (24/7 Emergency Override)**: High-frequency voice recovery cadence.
- **Caller DID Switcher**: Switch between enterprise trunks:
  - Bengaluru Primary Trunk (`+91 80 4719 2000`)
  - Mumbai Regional Gateway (`+91 22 6912 3400`)
  - Delhi Commercial Gateway (`+91 11 4084 5500`)
  - Pan-India Toll-Free Recovery Desk (`1800 890 4422`)
- **Unreachable Call Diagnosis Modal**:
  - Automatically identifies SIP 486 Busy / Q.850 Cause 17 / Call Screening.
  - 1-click retry with alternate DID.
  - 1-click dispatch for statutory WhatsApp notices, Priority DLT SMS, and registered emails.
  - 1-click dial alternate skip-traced delivery cluster numbers.
- **Statutory 4-Way Notice Dispatch**: Instant generation of official Government Reference Numbers reported to ITD and GSTN.

### 5. Debtors Portfolio & Buyer Risk Dossier (`DebtorsScreen`)
- Counterparty directory with search and filter by risk tier (All, Green, Amber, Red).
- Detailed Buyer Dossier:
  - Turnover consistency score, debt-to-equity leverage, Section 138 litigation count, and compliance score.
  - Recommended exposure limits (₹20–30L Green vs. ₹8–15L Amber vs. Blocked Red).
  - Complete "Why?" audit trail.

### 6. Financial Intelligence & Document Ingestion (`BusinessCheckScreen`)
- 12-Section Financial Intelligence Dossier.
- Multi-year audited financial summaries (Revenue, EBITDA margin %, Net profit, Current Ratio, Debt-to-Equity).
- Cross-Document Reconciliation Engine (GSTR-3B vs. P&L vs. Bank statement inflows).
- Side-by-Side Comparison Modal comparing counterparties across CAGR and risk metrics.
- Add New Business verification prompt.

### 7. Statutory Arbitration Center (`ArbitrationScreen`)
- **MSMED Act 2006 (Section 16)**: Statutory penal interest compounding engine at **3x RBI Bank Rate (20.25% p.a.)** with monthly rests.
- Interactive principal amount and days overdue calculator.
- Statement of Claim generator with formal case number assignment.
- **Simulated Aadhaar OTP e-Sign ceremony** with Section 65B cryptographic evidence seal.

### 8. Trust Hub & Community Default Blacklist (`TrustHubScreen`)
- Digital Trust ID certificate lookup (`TRUST-CB-XXXX`, `VTID-1000`).
- Credibility Score (885 / 1000 Tier 1 Prime) with verified compliance badges.
- Community Default Blacklist and Report Trade Default form.

### 9. Owner / Admin Executive OS (`AdminOSScreen`)
- **7-Stage Sales CRM Kanban**: Lead ➔ Qualified ➔ Demo ➔ Proposal ➔ Negotiation ➔ Won ➔ Live.
- Customer engagement ledger and health score tracking.
- Multi-channel marketing attribution tracking across 7 acquisition funnels.
- MRR revenue waterfall and ARR forecasting.

### 10. Platform Settings & Health (`SettingsScreen`)
- Dual-Theme Toggle: Obsidian Dark Mode and Crisp Light Mode with instant toggle.
- Backend Connectivity Mode: Standalone Sandbox (offline-first) vs. Live Next.js API.
- Live telemetry for all 11 statutory verification gateways.

---

## Quick Start & Running the Mobile App

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node v24)
- npm `v9+` or `v11+`

### Installation
```bash
cd mobile
npm install
```

### 1. Launch in Web / Mobile Browser (Instant Preview)
```bash
cd mobile
npm run web
```
This starts the local development server at `http://localhost:8081` (or next open port) where you can preview the full app on desktop or mobile viewports.

### 2. Launch on Physical Phone (Android / iOS via Expo Go)
```bash
cd mobile
npx expo start
```
Scan the displayed QR code with the **Expo Go** app on Android or iOS.

### 3. Launch on Emulators
```bash
npm run android  # Android Studio Emulator
npm run ios      # iOS Simulator (macOS)
```

---

## Architecture

```text
mobile/
  ├── App.tsx                     # Main entrypoint with ThemeProvider & Header
  ├── src/
  │    ├── theme/
  │    │    └── ThemeContext.tsx   # Dual-Theme provider (#FC8019, Obsidian Dark, Crisp Light)
  │    ├── services/
  │    │    ├── dataStore.ts       # In-memory store mirroring Prisma database entities
  │    │    ├── verificationEngine.ts # 18 deterministic statutory verification adapters
  │    │    ├── findSomeoneEngine.ts  # 9-vector debtor skip-tracing engine
  │    │    ├── telephonyEngine.ts    # Asterisk/Vobiz SIP simulation & DID rotation
  │    │    └── arbitrationEngine.ts  # MSMED Act §16 (20.25% p.a.) compounding engine
  │    ├── components/
  │    │    ├── HeaderBar.tsx      # Top bar with logo, wallet, and theme switcher
  │    │    ├── BottomTabBar.tsx   # Bottom tab bar (Command, Verify, OmniTrace, Recovery, Hub)
  │    │    ├── RiskBadge.tsx      # Green / Amber / Red indicators
  │    │    ├── MetricCard.tsx     # KPI cards
  │    │    └── UnreachableModal.tsx # SIP 486 / Q.850 Cause 17 diagnosis & DID switcher
  │    └── screens/
  │         ├── HomeScreen.tsx         # Command Desk & Risk Radar
  │         ├── VerificationScreen.tsx # 18 dedicated statutory tabs
  │         ├── FindSomeoneScreen.tsx  # OmniTrace 360™ debtor skip-tracing
  │         ├── RecoveryScreen.tsx     # Tele-Recovery desk & legal notices
  │         ├── HubScreen.tsx          # Navigation hub to deep sub-modules
  │         ├── DebtorsScreen.tsx      # Debtors portfolio & buyer risk dossier
  │         ├── BusinessCheckScreen.tsx # 12-section financial intelligence & comparison
  │         ├── ArbitrationScreen.tsx  # MSMED Act §16 claim builder & Aadhaar e-Sign
  │         ├── TrustHubScreen.tsx     # Trust ID passport & community blacklist
  │         ├── AdminOSScreen.tsx      # 7-Stage CRM & MRR waterfall
  │         └── SettingsScreen.tsx     # Theme switcher & gateway health
```
