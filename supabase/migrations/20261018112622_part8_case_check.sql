-- Part 8: Case Check (PRD v3.0 section 7; v1.0 5.5, S12, FR-CC-01–08).
--
-- A Case Check is a check request on the case_check tab: the user picks court case history, FIR check and money
-- laundering check, sees the cost, and runs them on mock providers until the keys arrive. The search details are
-- kept encrypted on the request. Each possible match the provider returns is a row in case_matches with a High,
-- Medium or Low confidence worked out by Chaanbean (src/lib/case-match.ts); the user marks it Confirmed, Not this
-- person or Unsure. Only Confirmed matches count in the credit report's risk level.

ALTER TABLE public.check_requests
  ADD COLUMN tab text NOT NULL DEFAULT 'credit_worthiness' CHECK (tab IN ('credit_worthiness', 'case_check')),
  ADD COLUMN inputs_ciphertext text,                    -- Case Check search details (name, address, PAN, mobile …)
  ADD COLUMN inputs_summary jsonb NOT NULL DEFAULT '{}'; -- what lists may show: name, state, district
CREATE INDEX check_requests_tab_idx ON public.check_requests (counterparty_id, tab, created_at DESC);

CREATE TYPE public.case_source AS ENUM ('court', 'fir', 'aml');
CREATE TYPE public.match_confidence AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.case_review AS ENUM ('pending', 'confirmed', 'not_this_person', 'unsure');

CREATE TABLE public.case_matches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  counterparty_id  uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  request_id       uuid NOT NULL REFERENCES public.check_requests (id) ON DELETE CASCADE,
  check_item_id    uuid NOT NULL REFERENCES public.check_items (id) ON DELETE CASCADE,
  source           public.case_source NOT NULL,
  source_id        text NOT NULL,                       -- the provider's id for the case, FIR or list entry
  case_no          text,
  court            text,                                -- court, police station, or list name for AML
  case_type        text,
  filed_on         date,
  case_status      text,                                -- Pending, Disposed; FIR status; AML: list entry status
  pending          boolean NOT NULL DEFAULT false,
  next_hearing     date,
  parties          jsonb NOT NULL DEFAULT '[]',
  acts             text[] NOT NULL DEFAULT '{}',
  -- Cheque bounce (NI Act s.138), money recovery or insolvency: counts in the risk level once confirmed.
  recovery         boolean NOT NULL DEFAULT false,
  list_name        text,                                -- AML: list and its version date (FR-CC-08)
  list_date        date,
  score            int CHECK (score BETWEEN 0 AND 100),
  confidence       public.match_confidence NOT NULL,
  details          jsonb NOT NULL DEFAULT '{}',         -- hearing history, order links, advocates
  review           public.case_review NOT NULL DEFAULT 'pending',
  reviewed_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (check_item_id, source_id)
);
CREATE INDEX case_matches_request_idx ON public.case_matches (request_id);
CREATE INDEX case_matches_counterparty_idx ON public.case_matches (counterparty_id, review);
CREATE INDEX case_matches_org_idx ON public.case_matches (org_id);
CREATE INDEX case_matches_reviewed_by_idx ON public.case_matches (reviewed_by);
CREATE TRIGGER case_matches_updated_at BEFORE UPDATE ON public.case_matches
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

ALTER TABLE public.case_matches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.case_matches FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.case_matches FROM authenticated;
-- The search details never reach the browser directly.
REVOKE SELECT ON public.check_requests FROM authenticated;
GRANT SELECT (id, org_id, counterparty_id, report_no, run_mode, status, risk_level, credit_low_paise, credit_high_paise,
              summary, created_by, created_at, completed_at, valid_until, updated_at, quote_id, idempotency_key, tab,
              inputs_summary) ON public.check_requests TO authenticated;

CREATE POLICY case_read ON public.case_matches FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
