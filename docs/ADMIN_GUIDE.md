# ChaanBean — Administrator & Operations Guide

This guide outlines system administration, multi-tenant isolation, role-based access control (RBAC), risk engine tuning, and operations management.

---

## 1. System Architecture & Tenant Model

ChaanBean is designed around a multi-tenant model:
- **Tenant Scope**: Every `BuyerDebtor`, `CreditAccount`, `Invoice`, `MonitoringAlert`, and `Campaign` is partitioned by `companyId`.
- **Database Engine**: Prisma ORM with SQLite (replicated dynamically into `/tmp` in serverless lambdas) or external PostgreSQL for enterprise deployments.
- **Serverless Resilience**: In cold-start environments (e.g. Vercel AWS Lambda), seeded SQLite databases are automatically cloned into `/tmp/dev.db` with full read/write permissions.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Module / Permission | Super Admin | Company Owner | Finance Admin | Collection Agent | Legal Advisor |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **System Settings & Billing** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Debtor Creation & Edits** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Credit Assessment & Underwriting** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Credit Hold Override / Revoke** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Collections & Voice Telephony** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Promise-to-Pay Entry** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Bank Payment Reconciliation** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Legal Case Dispatch & Notices** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Evidence Pack Certification** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Executive Reports & Exports** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 3. Risk Engine Rules & Weighting Parameters

The deterministic risk scoring engine (`src/lib/services/business/risk-engine.ts`) evaluates debtors out of 100 points:

1. **Business Legitimacy (Weight: 25%)**:
   - GSTIN Active & Filing Track Record (15 pts)
   - MCA21 Active Status & Director Track Record (10 pts)
2. **Financial Capacity (Weight: 35%)**:
   - Multi-year turnover growth (15 pts)
   - EBITDA & Net Margin sustainability (10 pts)
   - Debt-to-Equity < 1.5x (10 pts)
3. **Payment Behaviour & Litigation (Weight: 40%)**:
   - Zero Section 138 NI Act litigation history (20 pts)
   - Zero Peer Community Defaults in Trust Hub (15 pts)
   - On-time payment history (5 pts)

### Score Bands
- **Green Band (Score 75–100)**: Standard credit approved (up to 30-45 days, 1.25x assessed turnover).
- **Amber Band (Score 50–74)**: Conditional credit (strict 15-30 days, personal guarantee or PDC recommended).
- **Red Band (Score < 50)**: Credit hold; cash-and-carry or advance payment only.

---

## 4. Monitoring & Alert Configuration

The continuous monitoring service checks accounts against 5 primary triggers:
- **`credit_limit_breach`**: Current exposure > approved limit.
- **`overdue_spike`**: Unpaid balance aged > 30 days.
- **`defaulter_reported`**: Debtor reported by a network peer on Trust Hub.
- **`court_case_filed`**: New litigation filed on e-Courts portal.
- **`gst_cancelled`**: GSTIN registration suspended or cancelled.

Alert severities: `critical`, `high`, `medium`, `low`. Critical alerts automatically place the account in the Credit Hold review queue.

---

## 5. Telecom Compliance & Voice Calling Guidelines

Under Telecom Regulatory Authority of India (TRAI) TCCCPR regulations:
- Automated calling is restricted to **09:00 to 18:00 IST**.
- Calls are capped at **2 calls per 24-hour cycle** per debtor.
- Minimum spacing between consecutive outbound attempts is **4 hours**.
- Debtor opt-out requests are strictly honored and logged.
