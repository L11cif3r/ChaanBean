-- PRD v4.0 (19 Oct 2026): money in rupees only, cancel window, sample data mode, company search on MCA open data,
-- multiple search with quick screen, KYC fields.

-- ---------------------------------------------------------------- 1. Money in rupees, one wallet (v4 section 3)
-- Plans no longer include units. A plan payment goes into the wallet in full; while a plan is active its own price
-- list applies (plan_prices, Option A). With no plan price for an item, the pay-per-use price applies (Option C is the
-- same build with an empty plan_prices).

CREATE TABLE public.plan_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code      text NOT NULL REFERENCES public.plans (code),
  item_code      text NOT NULL REFERENCES public.billing_items (code),
  price_paise    bigint NOT NULL CHECK (price_paise >= 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_code, item_code, effective_from)
);
CREATE INDEX plan_prices_item_idx ON public.plan_prices (item_code);
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_prices FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.plan_prices FROM authenticated;
CREATE POLICY plan_prices_read ON public.plan_prices FOR SELECT TO authenticated USING (true);

-- The price an organisation pays for one use of an item now: its plan's price if it has one, else pay-per-use.
CREATE FUNCTION app_private.effective_price(p_org uuid, p_item text)
  RETURNS TABLE (price_paise bigint, gst_rate_bp int, price_id uuid, plan_code text)
  LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  base public.item_prices;
  sub public.subscriptions;
  v_plan text;
  v_price bigint;
BEGIN
  base := app_private.current_price(p_item);
  IF base.id IS NULL THEN RETURN; END IF;
  sub := app_private.usable_subscription(p_org);
  IF sub.id IS NOT NULL THEN
    SELECT v.plan_code INTO v_plan FROM public.plan_versions v WHERE v.id = sub.plan_version_id;
    SELECT pp.price_paise INTO v_price FROM public.plan_prices pp
     WHERE pp.plan_code = v_plan AND pp.item_code = p_item AND pp.effective_from <= now()
     ORDER BY pp.effective_from DESC LIMIT 1;
  END IF;
  RETURN QUERY SELECT coalesce(v_price, base.price_paise), base.gst_rate_bp, base.id, CASE WHEN v_price IS NULL THEN NULL ELSE v_plan END;
END $$;

-- Every hold is wallet money: price (plan or pay-per-use) plus GST. Nothing runs on credit.
CREATE OR REPLACE FUNCTION app_private.place_hold(
  p_org uuid, p_item text, p_ref_type text, p_ref_id text, p_idempotency_key text, p_expires_at timestamptz,
  p_actor text, p_request_id text
) RETURNS public.usage_ledger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  w public.wallets;
  existing public.usage_ledger;
  pr record;
  gst bigint;
  e public.usage_ledger;
BEGIN
  w := app_private.lock_wallet(p_org);
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO existing FROM public.usage_ledger WHERE org_id = p_org AND idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN existing; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.billing_items WHERE code = p_item AND active) THEN
    RAISE EXCEPTION 'UNKNOWN_ITEM' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO pr FROM app_private.effective_price(p_org, p_item);
  IF pr.price_id IS NULL THEN RAISE EXCEPTION 'NO_PRICE' USING ERRCODE = 'P0001'; END IF;
  gst := app_private.gst_on(pr.price_paise, pr.gst_rate_bp);
  IF w.balance_paise < pr.price_paise + gst THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.usage_ledger (org_id, type, source, item_code, amount_paise, gst_paise, price_id, hold_expires_at,
    ref_type, ref_id, idempotency_key, actor_id, request_id, note)
  VALUES (p_org, 'hold', 'wallet', p_item, -(pr.price_paise + gst), -gst, pr.price_id, p_expires_at,
    p_ref_type, p_ref_id, p_idempotency_key, p_actor, p_request_id,
    CASE WHEN pr.plan_code IS NULL THEN NULL ELSE 'Plan price' END)
  RETURNING * INTO e;
  RETURN e;
END $$;

-- A paid plan: the subscription starts (seats, plan prices) and the whole payment goes into the wallet.
CREATE OR REPLACE FUNCTION app_private.apply_payment_event(
  p_provider text, p_event_id text, p_type text, p_provider_order_id text, p_provider_payment_id text,
  p_amount_paise bigint, p_failure_reason text, p_payload jsonb
) RETURNS TABLE (order_id uuid, outcome text)
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_event bigint;
  o public.payment_orders;
  v public.plan_versions;
  v_plan_name text;
  v_sub uuid;
  v_active int;
  inv public.invoices;
  v_outcome text;
BEGIN
  INSERT INTO app_private.payment_events (provider, event_id, type, provider_order_id, payload)
  VALUES (p_provider, p_event_id, p_type, p_provider_order_id, p_payload)
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING id INTO v_event;
  IF v_event IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'duplicate_event'::text;
    RETURN;
  END IF;

  SELECT * INTO o FROM public.payment_orders WHERE provider = p_provider AND provider_order_id = p_provider_order_id FOR UPDATE;
  IF NOT FOUND THEN
    v_outcome := 'unknown_order';
  ELSIF p_type = 'payment.succeeded' THEN
    IF o.status = 'paid' THEN
      v_outcome := 'already_paid';
    ELSIF p_amount_paise IS DISTINCT FROM o.total_paise THEN
      v_outcome := 'amount_mismatch';
    ELSE
      PERFORM app_private.lock_wallet(o.org_id);
      UPDATE public.payment_orders SET status = 'paid', provider_payment_id = p_provider_payment_id, paid_at = now(),
             failure_reason = NULL
       WHERE id = o.id;

      IF o.purpose = 'plan' THEN
        SELECT * INTO v FROM public.plan_versions WHERE id = o.plan_version_id;
        SELECT name INTO v_plan_name FROM public.plans WHERE code = v.plan_code;
        IF (app_private.usable_subscription(o.org_id)).id IS NOT NULL THEN
          v_outcome := 'already_subscribed';   -- the money still goes to the wallet below
        ELSE
          INSERT INTO public.subscriptions (org_id, plan_version_id, starts_at, ends_at, payment_order_id)
          VALUES (o.org_id, v.id, now(), now() + make_interval(months => v.period_months), o.id)
          RETURNING id INTO v_sub;
          SELECT count(*) INTO v_active FROM public.memberships WHERE org_id = o.org_id AND status = 'active';
          UPDATE public.organisations SET seat_limit = greatest(v.seats, v_active) WHERE id = o.org_id;
        END IF;
      END IF;

      -- Top-up or plan: the amount paid goes into the wallet in full (v4 3.1, Option A).
      INSERT INTO public.usage_ledger (org_id, type, source, amount_paise, gst_paise, payment_order_id, ref_type, ref_id,
        actor_id, request_id, note)
      VALUES (o.org_id, 'topup', 'wallet', o.total_paise, o.gst_paise, o.id, 'payment_order', o.id::text,
        'system', p_provider || ':' || p_event_id, CASE WHEN o.purpose = 'plan' THEN coalesce(v_plan_name, 'Plan') || ' payment' END);

      inv := app_private.issue_invoice(o.id);
      v_outcome := coalesce(v_outcome, 'paid');

      INSERT INTO public.audit_log (org_id, actor_type, actor_id, action, entity, entity_id, after, request_id)
      VALUES (o.org_id, 'system', p_provider, 'payment.succeeded', 'payment_order', o.id::text,
              jsonb_build_object('purpose', o.purpose, 'total_paise', o.total_paise, 'invoice', inv.number,
                                 'subscription', v_sub, 'outcome', v_outcome),
              p_provider || ':' || p_event_id);
    END IF;
  ELSIF p_type = 'payment.failed' THEN
    IF o.status = 'created' THEN
      UPDATE public.payment_orders SET status = 'failed', failure_reason = left(p_failure_reason, 300) WHERE id = o.id;
      v_outcome := 'failed';
      INSERT INTO public.audit_log (org_id, actor_type, actor_id, action, entity, entity_id, after, request_id)
      VALUES (o.org_id, 'system', p_provider, 'payment.failed', 'payment_order', o.id::text,
              jsonb_build_object('purpose', o.purpose, 'reason', left(p_failure_reason, 300)), p_provider || ':' || p_event_id);
    ELSE
      v_outcome := 'ignored_' || o.status;
    END IF;
  ELSE
    v_outcome := 'ignored_type';
  END IF;

  UPDATE app_private.payment_events SET result = v_outcome, processed_at = now() WHERE id = v_event;
  RETURN QUERY SELECT o.id, v_outcome;
END $$;

REVOKE ALL ON FUNCTION app_private.effective_price(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.place_hold(uuid, text, text, text, text, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.apply_payment_event(text, text, text, text, text, bigint, text, jsonb) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- 2. Cancel window (v4 section 8)
ALTER TABLE public.check_requests
  ADD COLUMN start_at timestamptz,          -- the request starts (holds, consent, checks) only after this
  ADD COLUMN start_error text CHECK (char_length(start_error) <= 300),
  ADD COLUMN origin text,                   -- site address for the consent link, kept until the start
  ADD COLUMN consent_input jsonb;           -- purpose and channels chosen in the popup, used at the start
CREATE INDEX check_requests_pending_idx ON public.check_requests (start_at) WHERE status = 'pending_start';

-- ---------------------------------------------------------------- 3. Sample data mode and KYC (v4 sections 10, 11.2)
ALTER TABLE public.organisations
  ADD COLUMN sample_data_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN kyc_status text NOT NULL DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'failed')),
  ADD COLUMN kyc_method text CHECK (kyc_method IN ('digilocker_aadhaar', 'digilocker_pan')),
  ADD COLUMN kyc_name text CHECK (char_length(kyc_name) <= 120),
  ADD COLUMN kyc_doc_masked text CHECK (char_length(kyc_doc_masked) <= 20),
  ADD COLUMN kyc_verified_at timestamptz,
  ADD COLUMN kyc_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
CREATE INDEX organisations_kyc_user_idx ON public.organisations (kyc_user_id);

-- ---------------------------------------------------------------- 4. Buyers picked from MCA records (v4 4, FR-SR-06)
-- A company or LLP found by name or CIN can be saved before its GSTIN, PAN or contact is known. Contact and mobile
-- are asked for when something needs them (buyer consent, agreements).
ALTER TABLE public.counterparties
  ALTER COLUMN mobile_hash DROP NOT NULL,
  ALTER COLUMN mobile_ciphertext DROP NOT NULL,
  ALTER COLUMN mobile_masked DROP NOT NULL,
  ALTER COLUMN contact_name DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS counterparties_cin_check,
  DROP CONSTRAINT IF EXISTS counterparties_check1;
ALTER TABLE public.counterparties
  ADD CONSTRAINT counterparties_cin_check CHECK (cin ~ '^([LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}|[A-Z]{3}-[0-9]{4})$'),
  ADD CONSTRAINT counterparties_identity_check CHECK (type IN ('business_gstin', 'business_cin') OR pan_hash IS NOT NULL),
  ADD CONSTRAINT counterparties_cin_type_check CHECK (type <> 'business_cin' OR cin IS NOT NULL),
  ADD CONSTRAINT counterparties_mobile_check CHECK ((mobile_hash IS NULL) = (mobile_ciphertext IS NULL));
CREATE UNIQUE INDEX counterparties_org_cin ON public.counterparties (org_id, cin) WHERE cin IS NOT NULL;

-- ---------------------------------------------------------------- 5. MCA open data copy for name search (v4 2.3)
CREATE TABLE public.mca_companies (
  cin                      text PRIMARY KEY,           -- CIN, or LLPIN for LLPs
  name                     text NOT NULL,
  name_norm                text NOT NULL,              -- lower case, letters and digits only, single spaces
  status                   text,
  class                    text,
  category                 text,
  roc                      text,
  state                    text,                       -- as in the dataset, lower case (e.g. karnataka)
  city                     text,
  pincode                  text,
  address                  text,
  registration_date        date,
  authorised_capital_paise bigint,
  paidup_capital_paise     bigint,
  activity                 text,
  dataset_date             date NOT NULL,
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mca_companies_name_trgm ON public.mca_companies USING gin (name_norm extensions.gin_trgm_ops);
CREATE INDEX mca_companies_state_status ON public.mca_companies (state, status);
ALTER TABLE public.mca_companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mca_companies FROM anon, authenticated;   -- searched through the server only

CREATE TABLE app_private.mca_imports (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resource_id   text NOT NULL,
  scope         text NOT NULL,                 -- e.g. state=karnataka
  dataset_date  date,
  rows_done     int NOT NULL DEFAULT 0,
  rows_total    int,
  next_offset   int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
  error         text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);
ALTER TABLE app_private.mca_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.mca_imports FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- 6. Multiple search (v4 sections 6 and 7)
-- Replaces the first bulk upload tables (19 Oct): rows are matched and confirmed first, then a quick screen runs,
-- then deep checks for the companies the user ticks.
ALTER TABLE public.check_requests DROP COLUMN IF EXISTS batch_id;
DROP TABLE IF EXISTS public.check_batch_rows;
DROP TABLE IF EXISTS public.check_batches;

CREATE TABLE public.bulk_searches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  source        text NOT NULL CHECK (source IN ('typed', 'file')),
  file_name     text CHECK (char_length(file_name) <= 160),
  file_ref      text,                          -- uploads/… in stored_objects
  file_sha256   char(64),
  rows_total    int NOT NULL CHECK (rows_total BETWEEN 1 AND 1000),
  status        text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'screening', 'screened', 'deep_running', 'done')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bulk_searches_org_idx ON public.bulk_searches (org_id, created_at DESC);
CREATE INDEX bulk_searches_created_by_idx ON public.bulk_searches (created_by);
CREATE TRIGGER bulk_searches_updated_at BEFORE UPDATE ON public.bulk_searches FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TABLE public.bulk_rows (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_id          uuid NOT NULL REFERENCES public.bulk_searches (id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  row_no           int NOT NULL CHECK (row_no >= 1),
  input            jsonb NOT NULL,             -- company_name, gstin, cin, city, state (contact details kept encrypted below)
  contact_ciphertext text,                     -- {name, mobile, email}, encrypted
  match_state      text NOT NULL CHECK (match_state IN ('matched_exact', 'needs_pick', 'picked', 'not_found', 'duplicate', 'invalid')),
  candidates       jsonb NOT NULL DEFAULT '[]',
  picked           jsonb,                      -- the chosen record: {kind: gstin|cin|buyer, id, name, ...}
  included         boolean NOT NULL DEFAULT true,
  error            text CHECK (char_length(error) <= 300),
  counterparty_id  uuid REFERENCES public.counterparties (id) ON DELETE SET NULL,
  screen_request_id uuid REFERENCES public.check_requests (id) ON DELETE SET NULL,
  screen_result    text CHECK (screen_result IN ('avoid', 'check_further', 'looks_good', 'not_enough_data')),
  screen_reasons   jsonb NOT NULL DEFAULT '[]',
  screen_facts     jsonb NOT NULL DEFAULT '{}',
  deep_request_id  uuid REFERENCES public.check_requests (id) ON DELETE SET NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bulk_id, row_no)
);
CREATE INDEX bulk_rows_org_idx ON public.bulk_rows (org_id);
CREATE INDEX bulk_rows_counterparty_idx ON public.bulk_rows (counterparty_id);
CREATE INDEX bulk_rows_screen_idx ON public.bulk_rows (screen_request_id);
CREATE INDEX bulk_rows_deep_idx ON public.bulk_rows (deep_request_id);
CREATE TRIGGER bulk_rows_updated_at BEFORE UPDATE ON public.bulk_rows FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

ALTER TABLE public.check_requests ADD COLUMN bulk_id uuid REFERENCES public.bulk_searches (id) ON DELETE SET NULL;
CREATE INDEX check_requests_bulk_idx ON public.check_requests (bulk_id);

ALTER TABLE public.bulk_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bulk_searches, public.bulk_rows FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.bulk_searches, public.bulk_rows FROM authenticated;
REVOKE SELECT ON public.bulk_rows FROM authenticated;
GRANT SELECT (id, bulk_id, org_id, row_no, input, match_state, candidates, picked, included, error, counterparty_id, screen_request_id,
              screen_result, screen_reasons, screen_facts, deep_request_id, updated_at) ON public.bulk_rows TO authenticated;
CREATE POLICY bulk_read ON public.bulk_searches FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY bulk_read ON public.bulk_rows FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
