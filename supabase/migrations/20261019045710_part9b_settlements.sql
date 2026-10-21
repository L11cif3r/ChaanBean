-- Part 9b: E-Settlement (PRD v3.0 8.7; v1.0 5.8, S17, FR-ES-01–05).
--
-- A settlement is a new agreement with a debtor who will pay less than what is owed, or in parts. It settles one
-- overdue agreement (transaction_id) or an outside debt (GST bill number, date and amount entered by hand). It is
-- sent on a single-purpose link like an agreement; the debtor accepts by OTP, rejects, or makes a counter-proposal
-- (amount or dates), after which the creditor revises and sends a new version. Accepting seals it (write-once PDF and
-- SHA-256, same verify page) and moves the original agreement to Settled. Each instalment is then Due, Paid or Missed;
-- a missed instalment (unpaid the grace days after its date) puts the settlement in default and the original balance
-- with interest is due again, less the payments made under the settlement (which are also recorded on the original).
--
-- Charging (v3 section 10): one BS_SETTLEMENT unit is held on first send and committed when the debtor opens the link;
-- cancelling before that, or the link expiring unopened, gives it back. Sending a revised version is free.

CREATE TYPE public.settlement_status AS ENUM (
  'draft', 'sent', 'viewed', 'counter_proposed', 'accepted', 'completed', 'defaulted', 'rejected', 'expired', 'cancelled'
);
CREATE TYPE public.settlement_mode AS ENUM ('full', 'instalments');
CREATE TYPE public.instalment_status AS ENUM ('due', 'paid', 'missed');

CREATE TABLE public.settlements (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  counterparty_id       uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  transaction_id        uuid REFERENCES public.transactions (id) ON DELETE CASCADE,
  reference             text NOT NULL UNIQUE,                       -- CHB-ST-000001
  status                public.settlement_status NOT NULL DEFAULT 'draft',
  version               int NOT NULL DEFAULT 1 CHECK (version >= 1),
  -- An outside debt (S17 marker 1): the GST bill it is for and the amount due on it.
  outside_bill_no       text CHECK (char_length(outside_bill_no) BETWEEN 1 AND 30),
  outside_bill_date     date,
  -- What was owed when the terms were last set: balance plus interest to that day, or the outside amount due.
  owed_paise            bigint NOT NULL CHECK (owed_paise > 0),
  owed_on               date NOT NULL,
  settlement_paise      bigint NOT NULL CHECK (settlement_paise > 0),
  interest_agreed_paise bigint NOT NULL DEFAULT 0 CHECK (interest_agreed_paise >= 0),
  waived_paise          bigint NOT NULL,                            -- owed - settlement - interest agreed
  mode                  public.settlement_mode NOT NULL,
  grace_days            int NOT NULL DEFAULT 7 CHECK (grace_days BETWEEN 7 AND 30),
  terms                 text NOT NULL DEFAULT '' CHECK (char_length(terms) <= 2000),
  channels              text[] NOT NULL DEFAULT ARRAY['sms', 'whatsapp'] CHECK (channels <@ ARRAY['sms', 'email', 'whatsapp']),
  link_valid_days       int NOT NULL DEFAULT 7 CHECK (link_valid_days BETWEEN 1 AND 15),
  link_token_hash       text UNIQUE,
  link_token_ciphertext text,
  link_base             text,
  link_expires_at       timestamptz,
  hold_id               text,
  sent_at               timestamptz,
  viewed_at             timestamptz,
  decided_at            timestamptz,
  sealed_at             timestamptz,
  closed_at             timestamptz,
  reminded_day2_at      timestamptz,
  reminded_day5_at      timestamptz,
  created_by            uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (settlement_paise <= owed_paise),
  CHECK (transaction_id IS NOT NULL OR (outside_bill_no IS NOT NULL AND outside_bill_date IS NOT NULL))
);
-- One live settlement per agreement; a new one can follow a rejected, expired, cancelled or defaulted one.
CREATE UNIQUE INDEX settlements_one_open ON public.settlements (transaction_id)
  WHERE transaction_id IS NOT NULL AND status NOT IN ('rejected', 'expired', 'cancelled', 'defaulted');
CREATE INDEX settlements_org_idx ON public.settlements (org_id, status, created_at DESC);
CREATE INDEX settlements_counterparty_idx ON public.settlements (counterparty_id, created_at DESC);
CREATE INDEX settlements_transaction_idx ON public.settlements (transaction_id);
CREATE INDEX settlements_created_by_idx ON public.settlements (created_by);
CREATE TRIGGER settlements_updated_at BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- The payment schedule: one row for Full, 2 to 24 for Instalments. paid_paise/status are kept in step by the server.
CREATE TABLE public.settlement_instalments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  seq             int NOT NULL CHECK (seq BETWEEN 1 AND 24),
  due_date        date NOT NULL,
  amount_paise    bigint NOT NULL CHECK (amount_paise > 0),
  paid_paise      bigint NOT NULL DEFAULT 0 CHECK (paid_paise >= 0),
  status          public.instalment_status NOT NULL DEFAULT 'due',
  paid_on         date,
  missed_at       timestamptz,
  UNIQUE (settlement_id, seq)
);
CREATE INDEX settlement_instalments_org_idx ON public.settlement_instalments (org_id);
CREATE INDEX settlement_instalments_due_idx ON public.settlement_instalments (due_date) WHERE status = 'due';

-- What was sent, version by version.
CREATE TABLE public.settlement_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,
  snapshot        jsonb NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (settlement_id, version)
);
CREATE INDEX settlement_versions_org_idx ON public.settlement_versions (org_id);

-- The debtor's counter-proposal (FR-ES-03): another amount or other dates, with a comment.
CREATE TABLE public.settlement_proposals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,                                     -- the version it answers
  amount_paise    bigint NOT NULL CHECK (amount_paise > 0),
  mode            public.settlement_mode NOT NULL,
  rows            jsonb NOT NULL,                                   -- [{dueDate, amountPaise}]
  comment         text CHECK (char_length(comment) <= 1000),
  proposed_by     text CHECK (char_length(proposed_by) <= 120),
  ip              inet,
  user_agent      text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'adopted', 'revised')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlement_proposals_settlement_idx ON public.settlement_proposals (settlement_id, created_at DESC);
CREATE INDEX settlement_proposals_org_idx ON public.settlement_proposals (org_id);

CREATE TABLE public.settlement_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,
  decision        text NOT NULL CHECK (decision IN ('accept', 'reject', 'counter')),
  comment         text CHECK (char_length(comment) <= 1000),
  accepted_name   text CHECK (char_length(accepted_name) BETWEEN 2 AND 120),
  otp_ref         text,
  ip              inet,
  user_agent      text,
  decided_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlement_decisions_settlement_idx ON public.settlement_decisions (settlement_id, decided_at DESC);
CREATE INDEX settlement_decisions_org_idx ON public.settlement_decisions (org_id);

CREATE TABLE public.settlement_seals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,
  reference       text NOT NULL,
  pdf_ref         text NOT NULL,
  sha256          char(64) NOT NULL,
  sealed_at       timestamptz NOT NULL,
  accepted_name   text NOT NULL,
  mobile_masked   text NOT NULL,
  otp_ref         text NOT NULL,
  ip              inet,
  device          text,
  UNIQUE (settlement_id, version)
);
CREATE INDEX settlement_seals_reference_idx ON public.settlement_seals (reference);
CREATE INDEX settlement_seals_org_idx ON public.settlement_seals (org_id);

-- Money received under the settlement. When it settles an agreement, the same payment is also written to
-- public.payments on that agreement (payment_id), so a default leaves the original balance less what was paid.
CREATE TABLE public.settlement_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  amount_paise    bigint NOT NULL CHECK (amount_paise > 0),
  paid_on         date NOT NULL,
  mode            public.payment_mode NOT NULL,
  reference       text CHECK (char_length(reference) <= 40),
  notify_counterparty boolean NOT NULL DEFAULT false,
  payment_id      uuid REFERENCES public.payments (id) ON DELETE SET NULL,
  recorded_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlement_payments_settlement_idx ON public.settlement_payments (settlement_id, paid_on);
CREATE INDEX settlement_payments_org_idx ON public.settlement_payments (org_id);
CREATE INDEX settlement_payments_payment_idx ON public.settlement_payments (payment_id);
CREATE INDEX settlement_payments_recorded_by_idx ON public.settlement_payments (recorded_by);

-- Activity log, append-only like transaction_events.
CREATE TABLE public.settlement_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_id   uuid NOT NULL REFERENCES public.settlements (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  at              timestamptz NOT NULL DEFAULT now(),
  actor_type      text NOT NULL CHECK (actor_type IN ('user', 'counterparty', 'system')),
  actor_id        text,
  actor_name      text,
  event           text NOT NULL,
  detail          jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX settlement_events_settlement_idx ON public.settlement_events (settlement_id, at);
CREATE INDEX settlement_events_org_idx ON public.settlement_events (org_id);
CREATE TRIGGER settlement_events_no_update BEFORE UPDATE OR DELETE ON public.settlement_events
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION app_private.transaction_events_append_only();

-- ---------------------------------------------------------------- row-level security

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_instalments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_seals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.settlements, public.settlement_instalments, public.settlement_versions, public.settlement_proposals,
              public.settlement_decisions, public.settlement_seals, public.settlement_payments, public.settlement_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.settlements, public.settlement_instalments, public.settlement_versions, public.settlement_proposals,
       public.settlement_decisions, public.settlement_seals, public.settlement_payments, public.settlement_events FROM authenticated;
REVOKE SELECT ON public.settlements FROM authenticated;
GRANT SELECT (id, org_id, counterparty_id, transaction_id, reference, status, version, outside_bill_no, outside_bill_date,
              owed_paise, owed_on, settlement_paise, interest_agreed_paise, waived_paise, mode, grace_days, terms, channels,
              link_valid_days, link_expires_at, sent_at, viewed_at, decided_at, sealed_at, closed_at, created_by, created_at,
              updated_at)
  ON public.settlements TO authenticated;

CREATE POLICY st_read ON public.settlements FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_instalments FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_versions FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_proposals FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_decisions FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_seals FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_payments FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY st_read ON public.settlement_events FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
