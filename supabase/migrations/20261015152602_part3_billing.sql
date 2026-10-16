-- Part 3: plans, wallet and billing (PRD S03, S19; FR-BIL-01–06, 08; sections 5.9, 10.1, 11.2, Appendix A).
--
-- Money is integer paise. Plan units and wallet money only move through append-only ledger entries written by the
-- functions below (hold → commit or reverse, top-up). wallets.balance_paise is the running sum of the wallet entries,
-- kept by a trigger, and can never go below zero. Ledger rows, invoices and webhook events have no foreign key to the
-- organisation, like the audit log: financial records outlive the organisation (retention, 10.4).

-- ---------------------------------------------------------------- types

CREATE TYPE public.subscription_status AS ENUM ('active', 'grace', 'expired', 'cancelled');
CREATE TYPE public.ledger_entry_type AS ENUM ('hold', 'commit', 'reverse', 'topup', 'adjust');
CREATE TYPE public.ledger_source AS ENUM ('plan', 'wallet');
CREATE TYPE public.payment_purpose AS ENUM ('plan', 'topup');
CREATE TYPE public.payment_status AS ENUM ('created', 'paid', 'failed', 'cancelled');

-- ---------------------------------------------------------------- catalogue: items, prices, plans

-- Every chargeable action has an item code (10.1).
CREATE TABLE public.billing_items (
  code       text PRIMARY KEY CHECK (code ~ '^[A-Z][A-Z0-9_]*$'),
  name       text NOT NULL,
  deck_row   int,                                -- row in the Chaanbean deck (Appendix A)
  sort       int NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pay-per-use price per item, versioned: a new row applies to new charges from effective_from (10.1 "Price changes").
CREATE TABLE public.item_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code      text NOT NULL REFERENCES public.billing_items (code),
  price_paise    bigint NOT NULL CHECK (price_paise >= 0),        -- excluding GST
  gst_rate_bp    int NOT NULL DEFAULT 1800 CHECK (gst_rate_bp BETWEEN 0 AND 2800),
  cost_paise     bigint CHECK (cost_paise >= 0),                  -- provider cost (deck column E); console only
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_code, effective_from)
);
CREATE INDEX item_prices_created_by_idx ON public.item_prices (created_by);

CREATE TABLE public.plans (
  code        text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  name        text NOT NULL,
  recommended boolean NOT NULL DEFAULT false,
  sort        int NOT NULL,
  active      boolean NOT NULL DEFAULT true
);

-- Plans are versioned (11.2): a subscription keeps the version it was bought on.
CREATE TABLE public.plan_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code      text NOT NULL REFERENCES public.plans (code),
  version        int NOT NULL CHECK (version >= 1),
  price_paise    bigint NOT NULL CHECK (price_paise > 0),        -- excluding GST
  gst_rate_bp    int NOT NULL DEFAULT 1800 CHECK (gst_rate_bp BETWEEN 0 AND 2800),
  period_months  int NOT NULL CHECK (period_months BETWEEN 1 AND 36),
  seats          int NOT NULL CHECK (seats BETWEEN 1 AND 500),
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_code, version)
);

CREATE TABLE public.plan_version_items (
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions (id) ON DELETE CASCADE,
  item_code       text NOT NULL REFERENCES public.billing_items (code),
  quantity        int NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (plan_version_id, item_code)
);
CREATE INDEX plan_version_items_item_idx ON public.plan_version_items (item_code);

-- ---------------------------------------------------------------- subscriptions and wallet

CREATE TABLE public.subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  plan_version_id  uuid NOT NULL REFERENCES public.plan_versions (id),
  status           public.subscription_status NOT NULL DEFAULT 'active',
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL CHECK (ends_at > starts_at),
  auto_renew       boolean NOT NULL DEFAULT true,
  payment_order_id uuid,
  cancelled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_one_current ON public.subscriptions (org_id) WHERE status IN ('active', 'grace');
CREATE INDEX subscriptions_plan_version_idx ON public.subscriptions (plan_version_id);
CREATE INDEX subscriptions_payment_order_idx ON public.subscriptions (payment_order_id);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- Prepaid balance (FR-BIL-03), including GST: top-ups are invoiced when paid, usage is not invoiced again (S19).
CREATE TABLE public.wallets (
  org_id        uuid PRIMARY KEY REFERENCES public.organisations (id) ON DELETE CASCADE,
  balance_paise bigint NOT NULL DEFAULT 0 CHECK (balance_paise >= 0),
  alert_paise   bigint CHECK (alert_paise BETWEEN 0 AND 10000000),          -- low-balance alert, ₹0 to ₹1,00,000
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- usage ledger (append-only)

CREATE TABLE public.usage_ledger (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id              uuid NOT NULL,
  type                public.ledger_entry_type NOT NULL,
  source              public.ledger_source NOT NULL,
  item_code           text REFERENCES public.billing_items (code),
  subscription_id     uuid,                       -- plan entries: the subscription whose quota was used
  units               int NOT NULL DEFAULT 0,     -- plan units, signed: a hold is -1, its reversal +1
  amount_paise        bigint NOT NULL DEFAULT 0,  -- wallet money including GST, signed: debit < 0, credit > 0
  gst_paise           bigint NOT NULL DEFAULT 0,  -- the GST inside amount_paise, same sign
  price_id            uuid REFERENCES public.item_prices (id),
  hold_id             bigint REFERENCES public.usage_ledger (id),   -- commit and reverse: the hold they close
  hold_expires_at     timestamptz,                -- holds: reversed automatically if still open at this time
  balance_after_paise bigint,                     -- wallet entries: balance after this entry (set by trigger)
  payment_order_id    uuid,
  ref_type            text CHECK (ref_type ~ '^[a-z][a-z0-9_]*$'),
  ref_id              text,
  idempotency_key     text,
  note                text,
  actor_id            text,
  request_id          text,
  at                  timestamptz NOT NULL DEFAULT now(),
  CHECK (source <> 'plan' OR (subscription_id IS NOT NULL AND amount_paise = 0 AND gst_paise = 0)),
  CHECK (source <> 'wallet' OR units = 0),
  CHECK (type IN ('hold', 'topup', 'adjust') OR hold_id IS NOT NULL),
  CHECK (type <> 'hold' OR (item_code IS NOT NULL AND units <= 0 AND amount_paise <= 0)),
  CHECK (type <> 'topup' OR (source = 'wallet' AND amount_paise > 0 AND payment_order_id IS NOT NULL)),
  CHECK (type <> 'commit' OR (units = 0 AND amount_paise = 0))
);
CREATE INDEX usage_ledger_org_at_idx ON public.usage_ledger (org_id, at DESC, id DESC);
CREATE INDEX usage_ledger_plan_usage_idx ON public.usage_ledger (subscription_id, item_code) WHERE source = 'plan';
CREATE INDEX usage_ledger_price_idx ON public.usage_ledger (price_id);
CREATE INDEX usage_ledger_ref_idx ON public.usage_ledger (org_id, ref_type, ref_id);
CREATE UNIQUE INDEX usage_ledger_idempotency ON public.usage_ledger (org_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
-- A hold is closed exactly once, by a commit or a reversal.
CREATE UNIQUE INDEX usage_ledger_one_close ON public.usage_ledger (hold_id) WHERE hold_id IS NOT NULL;
CREATE UNIQUE INDEX usage_ledger_one_topup ON public.usage_ledger (payment_order_id) WHERE type = 'topup';

CREATE FUNCTION app_private.ledger_append_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'P0001';
END $$;

-- Applies a wallet entry to the cached balance in the same statement. The balance CHECK refuses an overdraw.
CREATE FUNCTION app_private.ledger_apply_wallet() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.at := now();
  IF NEW.source = 'wallet' THEN
    INSERT INTO public.wallets (org_id) VALUES (NEW.org_id) ON CONFLICT (org_id) DO NOTHING;
    UPDATE public.wallets
       SET balance_paise = balance_paise + NEW.amount_paise, updated_at = now()
     WHERE org_id = NEW.org_id
    RETURNING balance_paise INTO NEW.balance_after_paise;
  ELSE
    NEW.balance_after_paise := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER usage_ledger_apply BEFORE INSERT ON public.usage_ledger
  FOR EACH ROW EXECUTE FUNCTION app_private.ledger_apply_wallet();
CREATE TRIGGER usage_ledger_no_update BEFORE UPDATE OR DELETE ON public.usage_ledger
  FOR EACH ROW EXECUTE FUNCTION app_private.ledger_append_only();
CREATE TRIGGER usage_ledger_no_truncate BEFORE TRUNCATE ON public.usage_ledger
  FOR EACH STATEMENT EXECUTE FUNCTION app_private.ledger_append_only();

-- ---------------------------------------------------------------- payments and invoices

CREATE TABLE public.payment_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  purpose             public.payment_purpose NOT NULL,
  plan_version_id     uuid REFERENCES public.plan_versions (id),
  taxable_paise       bigint NOT NULL CHECK (taxable_paise > 0),
  gst_paise           bigint NOT NULL CHECK (gst_paise >= 0),
  total_paise         bigint NOT NULL CHECK (total_paise > 0),
  status              public.payment_status NOT NULL DEFAULT 'created',
  provider            text NOT NULL CHECK (provider ~ '^[a-z][a-z0-9_]*$'),
  provider_order_id   text UNIQUE,
  provider_payment_id text,
  failure_reason      text,
  created_by          uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (total_paise = taxable_paise + gst_paise),
  CHECK ((purpose = 'plan') = (plan_version_id IS NOT NULL))
);
CREATE INDEX payment_orders_org_idx ON public.payment_orders (org_id, created_at DESC);
CREATE INDEX payment_orders_plan_version_idx ON public.payment_orders (plan_version_id);
CREATE INDEX payment_orders_created_by_idx ON public.payment_orders (created_by);
CREATE TRIGGER payment_orders_updated_at BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_payment_order_fkey
  FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders (id) ON DELETE SET NULL;

-- Every gateway webhook, once. A repeated event id is recognised and ignored (FR-BIL-02 "no double credit").
CREATE TABLE app_private.payment_events (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider          text NOT NULL,
  event_id          text NOT NULL,
  type              text NOT NULL,
  provider_order_id text,
  payload           jsonb NOT NULL,
  result            text,
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  UNIQUE (provider, event_id)
);

-- Who bills customers (PRD Q12, still open). Single row; invoices copy it, so a later change does not alter old invoices.
CREATE TABLE app_private.billing_settings (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  legal_name  text NOT NULL,
  gstin       text CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  state_code  text NOT NULL CHECK (state_code ~ '^[0-9]{2}$'),
  address     text NOT NULL,
  sac         text NOT NULL CHECK (sac ~ '^[0-9]{6}$'),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_private.billing_settings (legal_name, gstin, state_code, address, sac)
VALUES ('Chaanbean (billing entity to be confirmed)', NULL, '29', 'Bengaluru, Karnataka', '998399');

CREATE TABLE app_private.invoice_counters (
  financial_year text PRIMARY KEY CHECK (financial_year ~ '^[0-9]{4}-[0-9]{2}$'),
  last_seq       int NOT NULL
);

-- GST invoice (FR-BIL-06): sequential number per financial year, CGST + SGST inside the supplier's state, IGST outside.
CREATE TABLE public.invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number           text NOT NULL UNIQUE CHECK (char_length(number) <= 16),
  financial_year   text NOT NULL,
  seq              int NOT NULL,
  org_id           uuid NOT NULL,
  payment_order_id uuid UNIQUE,
  issued_at        timestamptz NOT NULL DEFAULT now(),
  supplier         jsonb NOT NULL,
  customer         jsonb NOT NULL,
  place_of_supply  text NOT NULL CHECK (place_of_supply ~ '^[0-9]{2}$'),
  sac              text NOT NULL,
  description      text NOT NULL,
  taxable_paise    bigint NOT NULL CHECK (taxable_paise >= 0),
  cgst_paise       bigint NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
  sgst_paise       bigint NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
  igst_paise       bigint NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
  total_paise      bigint NOT NULL,
  UNIQUE (financial_year, seq),
  CHECK (total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise),
  CHECK (igst_paise = 0 OR (cgst_paise = 0 AND sgst_paise = 0))
);
CREATE INDEX invoices_org_idx ON public.invoices (org_id, issued_at DESC);
CREATE TRIGGER invoices_no_update BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION app_private.ledger_append_only();

-- S03 marker 4: "Need Something Different?" leads for the sales team. Not readable by customers.
CREATE TABLE app_private.custom_plan_leads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid REFERENCES public.organisations (id) ON DELETE SET NULL,
  user_id            uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  name               text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  mobile_ciphertext  text NOT NULL,
  mobile_masked      text NOT NULL,
  expected_checks    int CHECK (expected_checks BETWEEN 0 AND 1000000),
  message            text CHECK (char_length(message) <= 1000),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX custom_plan_leads_org_idx ON app_private.custom_plan_leads (org_id);
CREATE INDEX custom_plan_leads_user_idx ON app_private.custom_plan_leads (user_id);

-- ---------------------------------------------------------------- seed: Appendix A (prices exclude GST)

INSERT INTO public.billing_items (code, name, deck_row, sort) VALUES
  ('CW_PAN',                   'PAN Check',                        17,  10),
  ('CW_GST_SEARCH',            'GST search detailed',              19,  20),
  ('CW_COMPANY_MASTER',        'Company Master Report',            21,  30),
  ('CW_COMPANY',               'Company Check',                    23,  40),
  ('CW_BUREAU',                'CIBIL, CRIF and Experian Report',  25,  50),
  ('CW_MSME',                  'MSME Report',                      27,  60),
  ('CW_DIRECTOR',              'Director Details',                 29,  70),
  ('CW_CREDIT_RATING',         'Credit Ratings',                   31,  80),
  ('CW_FINANCIALS',            'Company Financial History',        33,  90),
  ('CW_IEC_TURNOVER',          'Import Export Turnover',           35, 100),
  ('CW_IEC_PROFILE',           'Import Export Profile',            37, 110),
  ('CW_COMPANY_COMPREHENSIVE', 'Comprehensive Company Report',     39, 120),
  ('CW_MOBILE_PAN',            'Mobile to PAN',                    41, 130),
  ('CW_MOBILE_ADDRESS',        'Mobile to Address',                43, 140),
  ('CW_GST_TURNOVER',          'Filed GST Turnover',               45, 150),
  ('CW_PAN_CONTACT',           'PAN to Mobile and Email',          47, 160),
  ('CC_COURT',                 'Court Case History',               49, 170),
  ('CC_AML',                   'Money Laundering Check',           51, 180),
  ('CC_FIR',                   'FIR Check',                        53, 190),
  ('CP_UNREGISTERED',          'Add New Unregistered Customer',    55, 200),
  ('BS_SETTLEMENT',            'E-Settlement Agreement',           57, 210),
  ('BS_SELLER_TX',             'Seller-Initiated Transaction',     59, 220),
  ('BS_BUYER_TX',              'Buyer-Initiated Transaction',      61, 230),
  ('BS_LENDER_TX',             'Lender Transaction',               63, 240),
  ('USR_SEAT',                 'User Access: Add New User',        65, 250);

INSERT INTO public.item_prices (item_code, price_paise, cost_paise, effective_from)
SELECT code, price * 100, cost * 100, '2026-10-01T00:00:00+05:30'
FROM (VALUES
  ('CW_PAN', 15, 5), ('CW_GST_SEARCH', 15, NULL), ('CW_COMPANY_MASTER', 1500, NULL), ('CW_COMPANY', 2, NULL),
  ('CW_BUREAU', 389, NULL), ('CW_MSME', 189, NULL), ('CW_DIRECTOR', 189, NULL), ('CW_CREDIT_RATING', 189, NULL),
  ('CW_FINANCIALS', 189, NULL), ('CW_IEC_TURNOVER', 189, NULL), ('CW_IEC_PROFILE', 189, NULL),
  ('CW_COMPANY_COMPREHENSIVE', 199, NULL), ('CW_MOBILE_PAN', 49, NULL), ('CW_MOBILE_ADDRESS', 189, NULL),
  ('CW_GST_TURNOVER', 189, NULL), ('CW_PAN_CONTACT', 200, NULL), ('CC_COURT', 289, NULL), ('CC_AML', 289, NULL),
  ('CC_FIR', 289, NULL), ('CP_UNREGISTERED', 10, NULL), ('BS_SETTLEMENT', 201, NULL), ('BS_SELLER_TX', 2.5, NULL),
  ('BS_BUYER_TX', 2.5, NULL), ('BS_LENDER_TX', 99, NULL), ('USR_SEAT', 301, NULL)
) AS p (code, price, cost);

INSERT INTO public.plans (code, name, recommended, sort) VALUES
  ('plan_a', 'Plan A', false, 1),
  ('plan_b', 'Plan B', true, 2);

-- Period 12 months until Q1 is answered; transaction units are not in the plans until Q3 is answered (wallet instead).
INSERT INTO public.plan_versions (plan_code, version, price_paise, period_months, seats, effective_from) VALUES
  ('plan_a', 1, 1159900, 12, 3, '2026-10-01T00:00:00+05:30'),
  ('plan_b', 1, 1759900, 12, 5, '2026-10-01T00:00:00+05:30');

INSERT INTO public.plan_version_items (plan_version_id, item_code, quantity)
SELECT v.id, q.code, CASE v.plan_code WHEN 'plan_a' THEN q.a ELSE q.b END
FROM public.plan_versions v
CROSS JOIN (VALUES
  ('CW_PAN', 12, 40), ('CW_GST_SEARCH', 30, 101), ('CW_COMPANY', 0, 40), ('CW_BUREAU', 12, 30), ('CW_MSME', 12, 42),
  ('CW_DIRECTOR', 15, 15), ('CW_IEC_TURNOVER', 15, 42), ('CW_IEC_PROFILE', 15, 42), ('CW_MOBILE_PAN', 15, 42),
  ('CW_MOBILE_ADDRESS', 9, 42), ('CW_GST_TURNOVER', 15, 42), ('CW_PAN_CONTACT', 11, 42), ('CC_COURT', 11, 21),
  ('BS_SETTLEMENT', 5, 5)
) AS q (code, a, b)
WHERE v.version = 1 AND CASE v.plan_code WHEN 'plan_a' THEN q.a ELSE q.b END > 0;

-- ---------------------------------------------------------------- helpers

-- Current price row of an item.
CREATE FUNCTION app_private.current_price(p_item text) RETURNS public.item_prices
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT * FROM public.item_prices
   WHERE item_code = p_item AND effective_from <= now()
   ORDER BY effective_from DESC LIMIT 1
$$;

-- Current version of a plan.
CREATE FUNCTION app_private.current_plan_version(p_plan text) RETURNS public.plan_versions
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT v.* FROM public.plan_versions v JOIN public.plans p ON p.code = v.plan_code
   WHERE v.plan_code = p_plan AND p.active AND v.effective_from <= now()
   ORDER BY v.effective_from DESC, v.version DESC LIMIT 1
$$;

-- The subscription whose quota can be used right now.
CREATE FUNCTION app_private.usable_subscription(p_org uuid) RETURNS public.subscriptions
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT * FROM public.subscriptions
   WHERE org_id = p_org AND status = 'active' AND starts_at <= now() AND ends_at > now()
   ORDER BY starts_at DESC LIMIT 1
$$;

-- GST on an amount, half up to the paisa; the same rule as gstOn() in src/lib/money.ts.
CREATE FUNCTION app_private.gst_on(p_paise bigint, p_rate_bp int) RETURNS bigint
  LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT (p_paise * p_rate_bp + 5000) / 10000
$$;

-- Serialises every money and unit movement of one organisation: the wallet row is the lock.
CREATE FUNCTION app_private.lock_wallet(p_org uuid) RETURNS public.wallets
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  w public.wallets;
BEGIN
  INSERT INTO public.wallets (org_id) VALUES (p_org) ON CONFLICT (org_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE org_id = p_org FOR UPDATE;
  RETURN w;
END $$;

-- ---------------------------------------------------------------- charging (5.9): hold, commit, reverse

-- Places a hold for one use of an item: plan quota first, otherwise the wallet at the pay-per-use price plus GST.
-- The same idempotency key returns the same hold, so a retried request never charges twice.
CREATE FUNCTION app_private.place_hold(
  p_org uuid, p_item text, p_ref_type text, p_ref_id text, p_idempotency_key text, p_expires_at timestamptz,
  p_actor text, p_request_id text
) RETURNS public.usage_ledger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  w public.wallets;
  existing public.usage_ledger;
  sub public.subscriptions;
  included int;
  used int;
  price public.item_prices;
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

  sub := app_private.usable_subscription(p_org);
  IF sub.id IS NOT NULL THEN
    SELECT quantity INTO included FROM public.plan_version_items
     WHERE plan_version_id = sub.plan_version_id AND item_code = p_item;
    IF included IS NOT NULL THEN
      SELECT coalesce(-sum(units), 0) INTO used FROM public.usage_ledger
       WHERE subscription_id = sub.id AND item_code = p_item AND source = 'plan';
      IF included - used >= 1 THEN
        INSERT INTO public.usage_ledger (org_id, type, source, item_code, subscription_id, units, hold_expires_at,
          ref_type, ref_id, idempotency_key, actor_id, request_id)
        VALUES (p_org, 'hold', 'plan', p_item, sub.id, -1, p_expires_at, p_ref_type, p_ref_id, p_idempotency_key,
          p_actor, p_request_id)
        RETURNING * INTO e;
        RETURN e;
      END IF;
    END IF;
  END IF;

  price := app_private.current_price(p_item);
  IF price.id IS NULL THEN RAISE EXCEPTION 'NO_PRICE' USING ERRCODE = 'P0001'; END IF;
  gst := app_private.gst_on(price.price_paise, price.gst_rate_bp);
  IF w.balance_paise < price.price_paise + gst THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.usage_ledger (org_id, type, source, item_code, amount_paise, gst_paise, price_id, hold_expires_at,
    ref_type, ref_id, idempotency_key, actor_id, request_id)
  VALUES (p_org, 'hold', 'wallet', p_item, -(price.price_paise + gst), -gst, price.id, p_expires_at,
    p_ref_type, p_ref_id, p_idempotency_key, p_actor, p_request_id)
  RETURNING * INTO e;
  RETURN e;
END $$;

-- Closes a hold. Committing a committed hold or reversing a reversed one returns the existing entry.
CREATE FUNCTION app_private.close_hold(
  p_org uuid, p_hold bigint, p_commit boolean, p_note text, p_actor text, p_request_id text
) RETURNS public.usage_ledger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  h public.usage_ledger;
  closing public.usage_ledger;
  e public.usage_ledger;
BEGIN
  PERFORM app_private.lock_wallet(p_org);
  SELECT * INTO h FROM public.usage_ledger WHERE id = p_hold AND org_id = p_org AND type = 'hold';
  IF NOT FOUND THEN RAISE EXCEPTION 'HOLD_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO closing FROM public.usage_ledger WHERE hold_id = p_hold;
  IF FOUND THEN
    IF (closing.type = 'commit') = p_commit THEN RETURN closing; END IF;
    RAISE EXCEPTION '%', CASE WHEN p_commit THEN 'HOLD_REVERSED' ELSE 'HOLD_COMMITTED' END USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.usage_ledger (org_id, type, source, item_code, subscription_id, units, amount_paise, gst_paise,
    price_id, hold_id, ref_type, ref_id, note, actor_id, request_id)
  VALUES (p_org, CASE WHEN p_commit THEN 'commit' ELSE 'reverse' END::public.ledger_entry_type, h.source, h.item_code,
    h.subscription_id,
    CASE WHEN p_commit THEN 0 ELSE -h.units END,
    CASE WHEN p_commit THEN 0 ELSE -h.amount_paise END,
    CASE WHEN p_commit THEN 0 ELSE -h.gst_paise END,
    h.price_id, h.id, h.ref_type, h.ref_id, p_note, p_actor, p_request_id)
  RETURNING * INTO e;
  RETURN e;
END $$;

-- Reverses holds whose action never finished (safety net behind the explicit reversal on failure).
CREATE FUNCTION app_private.release_expired_holds(p_limit int DEFAULT 200) RETURNS int
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  h record;
  n int := 0;
BEGIN
  FOR h IN
    SELECT l.id, l.org_id FROM public.usage_ledger l
     WHERE l.type = 'hold' AND l.hold_expires_at <= now()
       AND NOT EXISTS (SELECT 1 FROM public.usage_ledger c WHERE c.hold_id = l.id)
     ORDER BY l.hold_expires_at LIMIT p_limit
  LOOP
    PERFORM app_private.close_hold(h.org_id, h.id, false, 'Hold expired', 'system', 'hold-expiry');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- ---------------------------------------------------------------- payments

-- Creates a payment order for a plan purchase or a wallet top-up. Plan prices exclude GST; a top-up amount is what the
-- customer pays and goes into the wallet in full, so its GST is worked out of it.
CREATE FUNCTION app_private.create_payment_order(
  p_org uuid, p_purpose public.payment_purpose, p_plan text, p_amount_paise bigint, p_provider text, p_user uuid
) RETURNS public.payment_orders
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.plan_versions;
  taxable bigint;
  gst bigint;
  o public.payment_orders;
BEGIN
  IF p_purpose = 'plan' THEN
    v := app_private.current_plan_version(p_plan);
    IF v.id IS NULL THEN RAISE EXCEPTION 'UNKNOWN_PLAN' USING ERRCODE = 'P0001'; END IF;
    IF (app_private.usable_subscription(p_org)).id IS NOT NULL THEN
      RAISE EXCEPTION 'ALREADY_SUBSCRIBED' USING ERRCODE = 'P0001';
    END IF;
    taxable := v.price_paise;
    gst := app_private.gst_on(taxable, v.gst_rate_bp);
  ELSE
    IF p_amount_paise IS NULL OR p_amount_paise < 100000 OR p_amount_paise > 50000000 THEN
      RAISE EXCEPTION 'TOPUP_OUT_OF_RANGE' USING ERRCODE = 'P0001';
    END IF;
    taxable := (p_amount_paise * 10000 + 5900) / 11800;   -- amount / 1.18, half up
    gst := p_amount_paise - taxable;
  END IF;

  INSERT INTO public.payment_orders (org_id, purpose, plan_version_id, taxable_paise, gst_paise, total_paise, provider, created_by)
  VALUES (p_org, p_purpose, v.id, taxable, gst, taxable + gst, p_provider, p_user)
  RETURNING * INTO o;
  RETURN o;
END $$;

-- Issues the GST invoice for a paid order. Called inside apply_payment_event, so the number is used only if the payment is.
CREATE FUNCTION app_private.issue_invoice(p_order uuid) RETURNS public.invoices
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  o public.payment_orders;
  org public.organisations;
  s app_private.billing_settings;
  v_plan text;
  issued timestamptz := now();
  local_date date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  fy text;
  v_seq int;
  pos text;
  inv public.invoices;
BEGIN
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order;
  SELECT * INTO org FROM public.organisations WHERE id = o.org_id;
  SELECT * INTO s FROM app_private.billing_settings;

  -- Indian financial year, April to March: 2026-27.
  fy := CASE WHEN extract(month FROM local_date) >= 4
             THEN to_char(local_date, 'YYYY') || '-' || to_char(local_date + interval '1 year', 'YY')
             ELSE to_char(local_date - interval '1 year', 'YYYY') || '-' || to_char(local_date, 'YY') END;
  INSERT INTO app_private.invoice_counters AS c (financial_year, last_seq) VALUES (fy, 1)
  ON CONFLICT (financial_year) DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING last_seq INTO v_seq;

  pos := coalesce(org.state_code, s.state_code);
  IF o.purpose = 'plan' THEN
    SELECT p.name || ' subscription, ' || v.period_months || ' months' INTO v_plan
      FROM public.plan_versions v JOIN public.plans p ON p.code = v.plan_code WHERE v.id = o.plan_version_id;
  END IF;

  INSERT INTO public.invoices (number, financial_year, seq, org_id, payment_order_id, issued_at, supplier, customer,
    place_of_supply, sac, description, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise)
  VALUES (
    'CB/' || fy || '/' || lpad(v_seq::text, 5, '0'), fy, v_seq, o.org_id, o.id, issued,
    jsonb_build_object('legal_name', s.legal_name, 'gstin', s.gstin, 'state_code', s.state_code, 'address', s.address),
    jsonb_build_object('legal_name', org.legal_name, 'trade_name', org.trade_name, 'gstin', org.gstin,
                       'state_code', org.state_code, 'address', org.address),
    pos, s.sac,
    coalesce(v_plan, 'Chaanbean wallet top-up'),
    o.taxable_paise,
    CASE WHEN pos = s.state_code THEN o.gst_paise / 2 ELSE 0 END,
    CASE WHEN pos = s.state_code THEN o.gst_paise - o.gst_paise / 2 ELSE 0 END,
    CASE WHEN pos = s.state_code THEN 0 ELSE o.gst_paise END,
    o.total_paise)
  RETURNING * INTO inv;
  RETURN inv;
END $$;

-- Applies one verified gateway event. Duplicate events and repeated success for a paid order change nothing.
-- Success activates the plan or credits the wallet, and issues the invoice, all in one transaction (FR-BIL-02, 03, 06).
CREATE FUNCTION app_private.apply_payment_event(
  p_provider text, p_event_id text, p_type text, p_provider_order_id text, p_provider_payment_id text,
  p_amount_paise bigint, p_failure_reason text, p_payload jsonb
) RETURNS TABLE (order_id uuid, outcome text)
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_event bigint;
  o public.payment_orders;
  v public.plan_versions;
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

      IF o.purpose = 'topup' THEN
        INSERT INTO public.usage_ledger (org_id, type, source, amount_paise, gst_paise, payment_order_id, ref_type, ref_id,
          actor_id, request_id)
        VALUES (o.org_id, 'topup', 'wallet', o.total_paise, o.gst_paise, o.id, 'payment_order', o.id::text,
          'system', p_provider || ':' || p_event_id);
      ELSE
        SELECT * INTO v FROM public.plan_versions WHERE id = o.plan_version_id;
        IF (app_private.usable_subscription(o.org_id)).id IS NOT NULL THEN
          -- Paid twice for a plan (two tabs): keep the money visible for support instead of stacking periods.
          v_outcome := 'already_subscribed';
        ELSE
          INSERT INTO public.subscriptions (org_id, plan_version_id, starts_at, ends_at, payment_order_id)
          VALUES (o.org_id, v.id, now(), now() + make_interval(months => v.period_months), o.id)
          RETURNING id INTO v_sub;
          SELECT count(*) INTO v_active FROM public.memberships WHERE org_id = o.org_id AND status = 'active';
          UPDATE public.organisations SET seat_limit = greatest(v.seats, v_active) WHERE id = o.org_id;
        END IF;
      END IF;

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

REVOKE ALL ON FUNCTION
  app_private.current_price(text), app_private.current_plan_version(text), app_private.usable_subscription(uuid),
  app_private.gst_on(bigint, int), app_private.lock_wallet(uuid),
  app_private.place_hold(uuid, text, text, text, text, timestamptz, text, text),
  app_private.close_hold(uuid, bigint, boolean, text, text, text),
  app_private.release_expired_holds(int),
  app_private.create_payment_order(uuid, public.payment_purpose, text, bigint, text, uuid),
  app_private.issue_invoice(uuid),
  app_private.apply_payment_event(text, text, text, text, text, bigint, text, jsonb),
  app_private.ledger_append_only(), app_private.ledger_apply_wallet()
FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- row-level security
-- Everyone signed in reads the catalogue; organisation members read their plan and wallet; Owner and Admin
-- (billing.manage) read the ledger, payments and invoices. All writes go through the server functions above.

ALTER TABLE public.billing_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_prices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_version_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.payment_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.billing_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.invoice_counters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.custom_plan_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_items, public.item_prices, public.plans, public.plan_versions, public.plan_version_items,
  public.subscriptions, public.wallets, public.usage_ledger, public.payment_orders, public.invoices FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.billing_items, public.item_prices, public.plans,
  public.plan_versions, public.plan_version_items, public.subscriptions, public.wallets, public.usage_ledger,
  public.payment_orders, public.invoices FROM authenticated;
REVOKE ALL ON app_private.payment_events, app_private.billing_settings, app_private.invoice_counters,
  app_private.custom_plan_leads FROM PUBLIC, anon, authenticated;
-- Provider cost is for the console only.
REVOKE SELECT ON public.item_prices FROM authenticated;
GRANT SELECT (id, item_code, price_paise, gst_rate_bp, effective_from) ON public.item_prices TO authenticated;

CREATE POLICY catalogue_read ON public.billing_items      FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogue_read ON public.item_prices        FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogue_read ON public.plans              FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogue_read ON public.plan_versions      FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogue_read ON public.plan_version_items FOR SELECT TO authenticated USING (true);

CREATE POLICY org_read ON public.subscriptions FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()));
CREATE POLICY org_read ON public.wallets FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()));
CREATE POLICY billing_read ON public.usage_ledger FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'billing.manage'));
CREATE POLICY billing_read ON public.payment_orders FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'billing.manage'));
CREATE POLICY billing_read ON public.invoices FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'billing.manage'));
