-- ChaanBean Phase 1 PRD v3.0 (16 Oct 2026): catalogue, plans and the fields v3 adds to what Parts 3 to 7 built.
--
-- Item codes follow v3 (CW_GST_TURNOVER_4Y, CW_DIRECTORS, CP_ADD). Ledger rows are never changed, so the old codes
-- stay as inactive items (their history still reads correctly) and prices and plan quantities move to the new codes
-- in plan version 3. MSME report, PAN check and Import export profile and turnover are back (v3 1.1). Adding a buyer
-- is charged again (CP_ADD, ₹10 from the wallet; v3 section 5). Personal CIBIL keeps 12 / 30 units of its own until
-- Mohan answers v3 Q3.

-- ---------------------------------------------------------------- items

INSERT INTO public.billing_items (code, name, deck_row, sort) VALUES
  ('CW_GST_TURNOVER_4Y', 'GST turnover, last 4 years',    45, 30),
  ('CW_DIRECTORS',       'Director details',              29, 120),
  ('CP_ADD',             'Add new unregistered customer', 55, 290);

INSERT INTO public.item_prices (item_code, price_paise, effective_from)
SELECT n.new_code, p.price_paise, now()
  FROM (VALUES ('CW_GST_TURNOVER', 'CW_GST_TURNOVER_4Y'), ('CW_DIRECTOR', 'CW_DIRECTORS'), ('CP_UNREGISTERED', 'CP_ADD')) AS n (old_code, new_code)
  JOIN LATERAL (
    SELECT price_paise FROM public.item_prices WHERE item_code = n.old_code ORDER BY effective_from DESC LIMIT 1
  ) p ON true;

UPDATE public.billing_items SET active = false WHERE code IN ('CW_GST_TURNOVER', 'CW_DIRECTOR', 'CP_UNREGISTERED');
UPDATE public.billing_items SET active = true WHERE code IN ('CW_MSME', 'CW_PAN', 'CW_IEC_PROFILE', 'CW_IEC_TURNOVER');

-- v3 6.1 order and names.
UPDATE public.billing_items b SET name = n.name, sort = n.sort
  FROM (VALUES
    ('CW_GST_SEARCH',      'GST search',                  10),
    ('CW_GST_TURNOVER_CY', 'GST turnover, current year',  20),
    ('CW_GST_TURNOVER_4Y', 'GST turnover, last 4 years',  30),
    ('CW_CIBIL_COMPANY',   'CIBIL report, company',       40),
    ('CW_CIBIL_PERSONAL',  'CIBIL report, personal',      50),
    ('CW_MSME',            'MSME report',                 60),
    ('CW_PAN',             'PAN check',                   70),
    ('CW_IEC_PROFILE',     'Import export profile',       80),
    ('CW_IEC_TURNOVER',    'Import export turnover',      90),
    ('CW_COMPANY',         'Company check',              110),
    ('CW_DIRECTORS',       'Director details',           120),
    ('CW_CREDIT_RATING',   'Credit rating',              130)
  ) AS n (code, name, sort)
 WHERE b.code = n.code;

-- Test reports and consents made before the rename use the new codes too (check items are not ledger rows).
UPDATE public.check_items SET item_code = 'CW_GST_TURNOVER_4Y' WHERE item_code = 'CW_GST_TURNOVER';
UPDATE public.check_items SET item_code = 'CW_DIRECTORS' WHERE item_code = 'CW_DIRECTOR';
UPDATE public.consent_requests SET scope = array_replace(scope, 'CW_GST_TURNOVER', 'CW_GST_TURNOVER_4Y')
 WHERE 'CW_GST_TURNOVER' = ANY (scope);

-- ---------------------------------------------------------------- plans (version 3, same prices, period and seats)

INSERT INTO public.plan_versions (plan_code, version, price_paise, period_months, seats, effective_from) VALUES
  ('plan_a', 3, 1159900, 12, 3, now()),
  ('plan_b', 3, 1759900, 12, 5, now());

-- v3 Appendix A. Credit rating, FIR, money laundering and adding a buyer are pay per use.
INSERT INTO public.plan_version_items (plan_version_id, item_code, quantity)
SELECT v.id, q.code, CASE v.plan_code WHEN 'plan_a' THEN q.a ELSE q.b END
FROM public.plan_versions v
CROSS JOIN (VALUES
  ('CW_GST_SEARCH', 30, 101), ('CW_GST_TURNOVER_4Y', 15, 42), ('CW_CIBIL_COMPANY', 12, 30), ('CW_CIBIL_PERSONAL', 12, 30),
  ('CW_MSME', 12, 42), ('CW_PAN', 12, 40), ('CW_IEC_PROFILE', 15, 42), ('CW_IEC_TURNOVER', 15, 42),
  ('CW_COMPANY', 0, 40), ('CW_DIRECTORS', 15, 15), ('CC_COURT', 11, 21), ('BS_SETTLEMENT', 5, 5)
) AS q (code, a, b)
WHERE v.version = 3 AND CASE v.plan_code WHEN 'plan_a' THEN q.a ELSE q.b END > 0;

-- ---------------------------------------------------------------- counterparties: IEC (v3 section 5)

ALTER TABLE public.counterparties ADD COLUMN iec text CHECK (iec ~ '^[A-Z0-9]{10}$');

-- ---------------------------------------------------------------- organisations: what buyers see (v3 section 13)

ALTER TABLE public.organisations
  ADD COLUMN display_name text CHECK (char_length(display_name) BETWEEN 2 AND 120),
  ADD COLUMN contact_mobile text CHECK (contact_mobile ~ '^[6-9][0-9]{9}$'),
  ADD COLUMN reply_to_email text CHECK (reply_to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Ops can hide Business Security for an organisation (v3 FR-BS-11).
  ADD COLUMN business_security_enabled boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------- consent subject (v3 6.2)
-- Personal CIBIL asks the person whose report it is. When that person is not the buyer's contact, they get a
-- consent request of their own; the requester enters their name, PAN, date of birth and mobile.

ALTER TABLE public.consent_requests
  ADD COLUMN subject_kind text NOT NULL DEFAULT 'buyer' CHECK (subject_kind IN ('buyer', 'person')),
  ADD COLUMN subject_name text CHECK (char_length(subject_name) BETWEEN 2 AND 120);
GRANT SELECT (subject_kind, subject_name) ON public.consent_requests TO authenticated;

-- What the requester entered for the person, encrypted: {pan, birthDate}. The person confirms both on the page.
ALTER TABLE app_private.consent_private ADD COLUMN subject_ciphertext text;

-- ---------------------------------------------------------------- quotes (v3 section 10)
-- The confirm popup is built from a quote that is valid 10 minutes; confirming passes its id, so what runs is what
-- the user saw. A repeated confirm with the same Idempotency-Key returns the same request instead of charging twice.

CREATE TABLE app_private.check_quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  counterparty_id uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  items           text[] NOT NULL,
  lines           jsonb NOT NULL,
  created_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  used_at         timestamptz
);
CREATE INDEX check_quotes_org_idx ON app_private.check_quotes (org_id, created_at DESC);
CREATE INDEX check_quotes_counterparty_idx ON app_private.check_quotes (counterparty_id);
CREATE INDEX check_quotes_created_by_idx ON app_private.check_quotes (created_by);
ALTER TABLE app_private.check_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.check_quotes FROM PUBLIC, anon, authenticated;

ALTER TABLE public.check_requests
  ADD COLUMN quote_id uuid,
  ADD COLUMN idempotency_key text CHECK (char_length(idempotency_key) BETWEEN 8 AND 100);
CREATE UNIQUE INDEX check_requests_idempotency ON public.check_requests (org_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Which person a personal CIBIL item is about (name only; PAN and date of birth stay encrypted with the consent).
ALTER TABLE public.check_items ADD COLUMN options jsonb NOT NULL DEFAULT '{}';
