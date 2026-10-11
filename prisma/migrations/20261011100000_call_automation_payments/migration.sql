-- Call Automation, step 2: invoice linkage and payment ledger. Additive; depends on 20261010100000_call_automation.
--
-- * One collection case per invoice reference (per organisation). invoice_id stays a plain reference (no FK) so it
--   can point at whichever invoice/payment record Feature 2 owns.
-- * collection_payments is the idempotent record of money received against a case. payment_ref is unique per
--   organisation, so a replayed payment event or double-click can never reduce the outstanding amount twice.
-- * amount_original_paise keeps the amount first tracked, so partial payments stay explainable.

ALTER TABLE collection_cases ADD COLUMN amount_original_paise bigint;
UPDATE collection_cases SET amount_original_paise = amount_due_paise WHERE amount_original_paise IS NULL;
ALTER TABLE collection_cases ALTER COLUMN amount_original_paise SET NOT NULL;
ALTER TABLE collection_cases ADD CONSTRAINT collection_cases_original_chk CHECK (amount_original_paise >= 0);

CREATE UNIQUE INDEX collection_cases_invoice_uq ON collection_cases (organisation_id, invoice_id) WHERE invoice_id IS NOT NULL;

CREATE TABLE collection_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id          uuid NOT NULL REFERENCES collection_cases(id) ON DELETE CASCADE,
  payment_ref      text NOT NULL CHECK (length(payment_ref) BETWEEN 1 AND 128),
  amount_paise     bigint NOT NULL CHECK (amount_paise > 0),
  source           text NOT NULL CHECK (source IN ('USER', 'INVOICE_SYNC', 'WEBHOOK')),
  recorded_by      uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, payment_ref)
);
CREATE INDEX collection_payments_case_idx ON collection_payments (case_id, created_at DESC);

ALTER TABLE collection_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_read ON collection_payments FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
