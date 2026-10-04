# ChaanBean — Incident Playbook, Support Procedures & Escalation Matrix

This operational playbook defines incident triage, severity classification, resolution procedures, and disaster recovery.

---

## 1. Incident Severity Definitions & SLA Matrix

| Severity | Definition | Target Response | Target Resolution | Escalation Trigger |
| :--- | :--- | :---: | :---: | :--- |
| **SEV-1 (Critical)** | Core platform down, `/api/health` reports `database: down`, unable to process collections or credit approvals. | < 15 mins | < 2 hours | Engineering Lead + CTO |
| **SEV-2 (High)** | Major feature degraded (e.g. voice calling fails, evidence pack generation error), but web dashboard accessible. | < 30 mins | < 4 hours | Backend Lead |
| **SEV-3 (Medium)** | Minor bug, localized UI display glitch, single report export failure with workaround available. | < 2 hours | < 24 hours | Support Lead |

---

## 2. Escalation Matrix

```text
Level 1: Support Engineer / Operator ➔ (Triage within 15 mins)
   ▼
Level 2: Backend & Integration Engineer ➔ (Root cause investigation)
   ▼
Level 3: Engineering Lead & DevOps ➔ (Hotfix deployment & incident retro)
```

---

## 3. Playbook: Database Connection Failures (`Error code 14`)

### Symptoms:
- `/api/health` returns `status: degraded`, `database: down`.
- Vercel runtime logs display: `Error querying the database: Error code 14: Unable to open the database file`.

### Resolution Steps:
1. **Verify Lambda `/tmp` Initialization**:
   - Confirm `src/lib/db.ts` correctly detects `process.env.VERCEL` and initializes `/tmp/dev.db`.
   - Inspect whether `prisma/seed.db` is present in the deployment bundle via `next.config.ts` (`outputFileTracingIncludes`).
2. **Re-sync Seed Database**:
   ```bash
   npx prisma db push --accept-data-loss
   npx tsx prisma/seed.ts
   cp prisma/dev.db prisma/seed.db
   ```
3. **Re-deploy to Vercel**:
   ```bash
   npx vercel deploy --prod --yes
   ```

---

## 4. Playbook: Voice Telephony Outages & TRAI Violations

### Symptoms:
- Outbound calling workbench displays `Call Failed` or carrier SIP trunk timeout.

### Resolution Steps:
1. **Check Calling Window**:
   - Verify current IST time is strictly between **09:00 and 18:00 IST**.
   - Outbound calling is programmatically gated outside this window to comply with TRAI TCCCPR.
2. **Check Frequency Limits**:
   - Verify debtor has not exceeded the 2 calls/24-hour limit or 4-hour spacing constraint.
3. **Verify Carrier Credentials**:
   - Validate Asterisk/Vobiz SIP credentials and Amazon Polly neural voice API keys in `.env`.

---

## 5. Data Protection, Backup & Disaster Recovery (RPO / RTO)

- **Recovery Point Objective (RPO)**: < 1 hour.
- **Recovery Time Objective (RTO)**: < 30 minutes.
- **Backup Procedures**:
  - Production database snapshots are taken every 6 hours and stored in geographically redundant Cloud Storage.
  - The deterministic seed template (`prisma/seed.db`) is version-controlled directly in Git for instantaneous zero-dependency recovery.
