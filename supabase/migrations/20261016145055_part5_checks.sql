-- Part 5: Credit Worthiness checks and the credit report (PRD v2.0 sections 4 and 6; v1.0 S08, S11, FR-CW-01–07,
-- FR-RPT-01–06, 9.1–9.3, 12.3–12.4).
--
-- A check request is one run of checks on one counterparty; it is also the report (one number, valid 30 days).
-- Each selected check is a row in check_items with its own status, plan or wallet hold and normalised result
-- (adapter contract 12.3). Units are held when a check starts and committed only when data arrives; a failed or
-- unavailable check reverses its hold ("Not available from source. Unit not charged.").
-- The risk level and safe credit range are worked out by the server (src/lib/report-rules.ts) and stored on the
-- request each time a check finishes, so lists can show them without recomputing.

CREATE TYPE public.check_request_status AS ENUM ('in_progress', 'complete', 'partial');
CREATE TYPE public.check_item_status AS ENUM (
  'ready',            -- "run each one myself": waiting for the user to start it
  'queued',           -- held and waiting for a worker
  'running',
  'waiting_consent',  -- needs the buyer's OTP first (Part 7)
  'success',          -- data arrived: charged
  'no_data',          -- ran correctly and found nothing: still charged (PRD 10.1)
  'not_available',    -- failed at the source after retry: not charged
  'cancelled'         -- consent declined or expired, or the user stopped it: not charged
);
CREATE TYPE public.risk_level AS ENUM ('high', 'medium', 'low', 'not_enough_data');

CREATE TABLE public.check_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  counterparty_id   uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  report_no         text NOT NULL UNIQUE,                      -- CR-2026-000001
  run_mode          text NOT NULL CHECK (run_mode IN ('together', 'manual')),
  status            public.check_request_status NOT NULL DEFAULT 'in_progress',
  risk_level        public.risk_level,
  credit_low_paise  bigint,
  credit_high_paise bigint,
  summary           jsonb NOT NULL DEFAULT '{}',               -- signals and range note, from report-rules.ts
  created_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  valid_until       timestamptz NOT NULL DEFAULT now() + interval '30 days',
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX check_requests_counterparty_idx ON public.check_requests (counterparty_id, created_at DESC);
CREATE INDEX check_requests_org_idx ON public.check_requests (org_id, created_at DESC);
CREATE INDEX check_requests_created_by_idx ON public.check_requests (created_by);
CREATE TRIGGER check_requests_updated_at BEFORE UPDATE ON public.check_requests
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TABLE public.check_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  request_id     uuid NOT NULL REFERENCES public.check_requests (id) ON DELETE CASCADE,
  counterparty_id uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  item_code      text NOT NULL REFERENCES public.billing_items (code),
  needs_consent  boolean NOT NULL DEFAULT false,
  status         public.check_item_status NOT NULL,
  hold_id        text,                                          -- usage_ledger hold, while it is open or after
  charged        boolean NOT NULL DEFAULT false,
  provider       text,
  attempts       int NOT NULL DEFAULT 0,
  data           jsonb,                                         -- normalised result (12.3 "data")
  raw_ref        uuid,                                          -- app_private.stored_objects, encrypted raw response
  error_code     text,
  error_message  text,
  source_time    timestamptz,
  fetched_at     timestamptz,
  started_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, item_code)
);
CREATE INDEX check_items_reuse_idx ON public.check_items (counterparty_id, item_code, fetched_at DESC) WHERE status IN ('success', 'no_data');
CREATE INDEX check_items_org_idx ON public.check_items (org_id);
CREATE INDEX check_items_item_idx ON public.check_items (item_code);
CREATE TRIGGER check_items_updated_at BEFORE UPDATE ON public.check_items
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TABLE app_private.report_counters (
  year int PRIMARY KEY CHECK (year BETWEEN 2026 AND 2200),
  last int NOT NULL CHECK (last >= 0)
);

-- Next report number for the year in IST, e.g. CR-2026-000001.
CREATE FUNCTION app_private.next_report_no() RETURNS text
  LANGUAGE sql SET search_path = '' AS $$
  WITH y AS (SELECT extract(year FROM now() AT TIME ZONE 'Asia/Kolkata')::int AS year)
  INSERT INTO app_private.report_counters AS c (year, last) SELECT year, 1 FROM y
    ON CONFLICT (year) DO UPDATE SET last = c.last + 1
  RETURNING 'CR-' || year || '-' || lpad(last::text, 6, '0')
$$;
REVOKE ALL ON FUNCTION app_private.next_report_no() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- row-level security

ALTER TABLE public.check_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.report_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.report_counters FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.check_requests, public.check_items FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.check_requests, public.check_items FROM authenticated;

-- Reports are visible to every role (report.view, PRD 4.3); checks are started through the server only.
CREATE POLICY report_read ON public.check_requests FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY report_read ON public.check_items FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
