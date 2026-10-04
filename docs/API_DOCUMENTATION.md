# ChaanBean — REST API Reference Documentation

All API routes are served over HTTPS and return JSON responses.

---

## 1. System Health & Observability

### `GET /api/health`
Returns the operational health and database latency of the platform.

#### Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeSeconds": 142.5,
  "timestamp": "2026-09-17T01:00:00.000Z",
  "latencyMs": 148,
  "checks": {
    "database": "up",
    "verificationGateway": "operational",
    "policyEngine": "operational",
    "riskScoringEngine": "operational",
    "voiceSystem": "operational"
  }
}
```

---

## 2. Post-Credit Monitoring & Holds

### `GET /api/monitoring`
Fetches current exposure, overall portfolio utilization %, active monitoring alerts, and debtor account hold statuses.

#### Response:
```json
{
  "accounts": [
    {
      "creditAccountId": "clx...",
      "buyerName": "Sunrise Distributors",
      "creditLimit": 500000,
      "totalOutstanding": 480000,
      "utilizationPct": 96,
      "creditHoldActive": false,
      "overdueStatus": "overdue",
      "overdueAmount": 480000
    }
  ],
  "alerts": [
    {
      "id": "alt_01",
      "severity": "high",
      "type": "overdue_spike",
      "title": "Overdue Ageing Crossed 30 Days",
      "status": "active"
    }
  ],
  "totalExposure": 1815000,
  "totalOverdue": 1590000,
  "overallUtilizationPct": 21,
  "accountsOnHoldCount": 1
}
```

### `POST /api/monitoring`
Performs credit hold toggles or alert status updates.

#### Request (Enforce Hold):
```json
{
  "action": "hold",
  "creditAccountId": "clx...",
  "reason": "Exceeded overdue limits; cheques dishonored."
}
```

#### Request (Revoke Hold):
```json
{
  "action": "revoke_hold",
  "creditAccountId": "clx...",
  "revokedBy": "Risk Head"
}
```

#### Request (Update Alert):
```json
{
  "action": "update_alert",
  "alertId": "alt_01",
  "status": "acknowledged"
}
```

---

## 3. Collections & Payment Automation

### `GET /api/collections`
Returns the 5-tier ageing breakdown, active invoices, promises to pay, and reconciled transactions.

#### Response:
```json
{
  "ageing": {
    "current": 125000,
    "bucket1to30": 200000,
    "bucket31to60": 500000,
    "bucket61to90": 0,
    "bucket90Plus": 890000,
    "totalOverdue": 1590000,
    "totalOutstanding": 1815000
  },
  "invoices": [...],
  "promises": [...],
  "reconciliations": [...]
}
```

### `POST /api/collections`
Executes collection desk actions.

#### 1. Record Promise to Pay:
```json
{
  "action": "promise_to_pay",
  "creditAccountId": "ca_01",
  "buyerId": "buyer_01",
  "amount": 250000,
  "promisedDate": "2026-09-25",
  "paymentMode": "RTGS",
  "notes": "Confirmed by Director"
}
```

#### 2. Generate Payment Link:
```json
{
  "action": "payment_link",
  "creditAccountId": "ca_01",
  "invoiceId": "inv_01",
  "amount": 125000,
  "expiresInDays": 7
}
```

#### 3. Reconcile Payment:
```json
{
  "action": "reconcile",
  "companyId": "comp_01",
  "creditAccountId": "ca_01",
  "invoiceId": "inv_01",
  "amountPaid": 125000,
  "referenceNo": "UTR-HDFC-991200",
  "paymentMode": "bank_transfer"
}
```

---

## 4. Legal Advisors & Evidence Packs

### `GET /api/legal/advisors`
Lists empaneled Bar Council advocates with case loads and win rates.

### `POST /api/legal/advisors`
Matches or assigns an advocate to a dispute.

#### Run Matching:
```json
{
  "action": "match",
  "caseId": "ARB-CB-2024-001"
}
```

### `POST /api/legal/evidence-pack`
Compiles indexed evidence exhibits into a bundle.

#### Request:
```json
{
  "creditAccountId": "ca_01",
  "arbitrationCaseId": "ARB-CB-2024-001",
  "title": "Statutory MSMED Claim Bundle",
  "documents": [
    { "type": "INVOICE", "ref": "INV-2024-889", "amount": 890000 },
    { "type": "CHALLAN", "ref": "POD-889-SIGNED" }
  ]
}
```

---

## 5. Executive Management Reports

### `GET /api/reports/management`
Returns aggregated metrics in JSON format.

### `GET /api/reports/management?format=csv`
Returns an immediate RFC-4180 compliant CSV download of debtor exposure schedules.
