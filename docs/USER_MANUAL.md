# ChaanBean — User Manual & Operator Guide

Welcome to **ChaanBean**, the credit underwriting, risk monitoring, automated collections, and statutory legal recovery operating system for Indian MSMEs.

---

## Table of Contents
1. [User Personas & Role Matrix](#1-user-personas--role-matrix)
2. [Onboarding & Profile Setup](#2-onboarding--profile-setup)
3. [Credit Assessment & Verification (Phase 2)](#3-credit-assessment--verification)
4. [Post-Credit Monitoring & Exposure Control (Phase 3)](#4-post-credit-monitoring--exposure-control)
5. [Payment Collections & Automation Workbench (Phase 4)](#5-payment-collections--automation-workbench)
6. [Legal Recovery Infrastructure & Advisor Network (Phase 5)](#6-legal-recovery-infrastructure--advisor-network)
7. [Reports, Analytics & CSV Exports (Phase 6)](#7-reports-analytics--csv-exports)
8. [Frequently Asked Questions (FAQ)](#8-frequently-asked-questions)

---

## 1. User Personas & Role Matrix

| Persona | Key Responsibilities | Primary Modules Used | Access Level |
| :--- | :--- | :--- | :--- |
| **Business Owner / CXO** | Platform oversight, risk appetite, executive reporting | `/dashboard`, `/admin/pipeline`, `/api/reports/management` | Super Admin / Owner |
| **Credit Underwriter / Risk Officer** | Debtor onboarding, financial document analysis, limit recommendation | `/business-check`, `/background-check`, `/debtors` | Admin / Operator |
| **Finance & Accounts Manager** | Invoice exposure tracking, payment reconciliations, credit hold controls | `/monitoring`, `/collections`, `/api/invoices` | Finance User |
| **Collection Agent** | Contacting overdue debtors, recording Promises to Pay (PTP), dispatching payment links | `/collections`, `/payment-recovery` | Collection Agent |
| **Legal Counsel / Legal Desk** | Case intake, evidence pack certification, statutory notices under MSMED §16 and NI Act §138 | `/legal-advisors`, `/arbitration` | Legal Advisor |

---

## 2. Onboarding & Profile Setup

1. **Company Registration**: Navigate to `/login` or `/subscription` to register your enterprise with GSTIN, PAN, and primary trade classification.
2. **Multi-Tenant Isolation**: Each enterprise operates within an isolated workspace. Debtor databases, risk radar snapshots, and evidence logs are strictly scoped to your tenant.
3. **Team Invites**: Assign team members to distinct roles (Owner, Team Member, Finance, Legal Desk) to enforce strict principle-of-least-privilege access.

---

## 3. Credit Assessment & Verification

### Initiating a Credit Check
1. Navigate to **Business Check** (`/business-check`).
2. Search by **GSTIN**, **CIN**, or **PAN**.
3. View the multi-source dossier combining:
   - **MCA21**: Director history, paid-up capital, charge status.
   - **GST Portal**: Active filing consistency, return compliance (GSTR-1, GSTR-3B).
   - **Udyam Registry**: Micro/Small/Medium enterprise certification.
   - **e-Courts**: Active Section 138 NI Act cheque dishonor cases.
4. **Financial Extraction**: Upload audited P&L, balance sheets, or bank statements at `/business-check/[id]/documents` to extract revenue, EBITDA, and debt-to-equity ratios.
5. **Credit Recommendation**: The Risk Engine outputs a deterministic **Green / Amber / Red** flag with recommended exposure limit and tenor.

---

## 4. Post-Credit Monitoring & Exposure Control

Navigate to **Post-Credit Radar** (`/monitoring`):
- **Live Exposure Tracking**: Reconciles outstanding balances against approved credit limits.
- **Continuous Monitoring Alerts**: Triggers real-time alerts upon:
  - Exposure exceeding approved limit.
  - Overdue ageing crossing 30, 60, or 90 days.
  - Peer supplier reporting a community default.
- **Credit Hold Controls**: Enforce an immediate hold with a single click (`Enforce Hold`) to freeze billing for deteriorating debtors.

---

## 5. Payment Collections & Automation Workbench

Navigate to **Collections Desk** (`/collections`):
- **Ageing Buckets**: Immediate breakdown across **Current**, **1–30 Days**, **31–60 Days**, **61–90 Days**, and **90+ Days (Statutory Default)**.
- **Promise-to-Pay (PTP) Tracker**: Record customer verbal or written commitments (amount, date, payment mode) with automated reminder tracking.
- **Payment Links**: Generate instant payment links with one click and dispatch to debtors via SMS, WhatsApp, or Email.
- **Payment Reconciliation**: Match inbound bank transfers and UTR numbers against open invoices with automated ledger balancing.

---

## 6. Legal Recovery Infrastructure & Advisor Network

Navigate to **Legal Network** (`/legal-advisors`):
- **Empaneled Counsel**: Access Bar Council-verified advocates specialized in MSMED Act Arbitration, Section 138 NI Act, and IBC recovery.
- **AI Advisor Matching Engine**: Match cases to the optimal legal counsel based on court jurisdiction (e.g. Mumbai, Delhi, Bengaluru) and statutory claims.
- **Certified Evidence Pack Compiler**: Automatically compiles invoices, proof of delivery challans, dishonored cheques, and MSMED Section 16 interest computations (3x RBI bank rate compound monthly) into an indexed legal exhibit.

---

## 7. Reports, Analytics & CSV Exports

- **Executive Report**: Real-time overview of portfolio exposure, overdue ageing, collection recovery rates, and legal pipeline.
- **Instant CSV Export**: Download audit-ready debtor exposure schedules with one click at `/api/reports/management?format=csv`.

---

## 8. Frequently Asked Questions (FAQ)

**Q: How is the MSME penal interest calculated?**  
A: In accordance with Section 16 of the MSMED Act 2006, penal interest is calculated at **three times the RBI bank rate** compounded monthly on overdue balances beyond 45 days.

**Q: What happens when an account is placed on Credit Hold?**  
A: Placing an account on hold marks the debtor in the monitoring radar, notifies sales/finance operators, and locks further dispatch allocations.

**Q: Can evidence packs be submitted directly to the MSME Samadhaan Council?**  
A: Yes, evidence packs are generated in standard evidentiary format adhering to Section 65B of the Indian Evidence Act.
