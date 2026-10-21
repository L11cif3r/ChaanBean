-- Part 9a: Business Security agreements (PRD v3.0 section 8.1–8.6; v1.0 5.6, 5.7, S13–S16, S22, FR-TX-01–11).
--
-- A transaction is a seller-initiated, buyer-initiated or lender agreement with one counterparty. It is drafted,
-- sent on a single-purpose link, accepted by the counterparty's OTP and then sealed: the final PDF with an acceptance
-- block is stored once (app_private.stored_objects, write-once) and its SHA-256 is kept in transaction_seals, so the
-- public verify page can prove it has not changed. Every step is written to transaction_events, which cannot be
-- edited. Payments are allocated to accrued interest first, then principal (v3 8.6).
--
-- Charging (v3 section 10): one unit (plan or wallet) is held when the agreement is first sent and committed when
-- the counterparty opens it; cancelling before it is opened, or the link expiring unopened, gives it back. Resending
-- after a change request is free.

CREATE TYPE public.transaction_type AS ENUM ('seller', 'buyer', 'lender');
CREATE TYPE public.transaction_status AS ENUM (
  'draft', 'sent', 'viewed', 'changes_requested', 'accepted', 'active', 'partially_paid', 'overdue', 'paid', 'settled',
  'rejected', 'expired', 'cancelled'
);
CREATE TYPE public.payment_mode AS ENUM ('upi', 'neft_rtgs', 'cheque', 'cash', 'other');

-- CHB-TX-000001, CHB-ST-000001 (Part 9b): one sequence per prefix.
CREATE TABLE app_private.reference_counters (
  prefix text PRIMARY KEY CHECK (prefix IN ('CHB-TX', 'CHB-ST')),
  last   int NOT NULL CHECK (last >= 0)
);
CREATE FUNCTION app_private.next_reference(p_prefix text) RETURNS text
  LANGUAGE sql SET search_path = '' AS $$
  INSERT INTO app_private.reference_counters AS c (prefix, last) VALUES (p_prefix, 1)
    ON CONFLICT (prefix) DO UPDATE SET last = c.last + 1
  RETURNING p_prefix || '-' || lpad(last::text, 6, '0')
$$;
REVOKE ALL ON FUNCTION app_private.next_reference(text) FROM PUBLIC, anon, authenticated;

CREATE TABLE public.transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  counterparty_id       uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  reference             text NOT NULL UNIQUE,                       -- CHB-TX-000001
  type                  public.transaction_type NOT NULL,
  status                public.transaction_status NOT NULL DEFAULT 'draft',
  version               int NOT NULL DEFAULT 1 CHECK (version >= 1),
  -- Invoice or GST bill (seller, buyer); loan reference and disbursal date (lender).
  invoice_no            text CHECK (char_length(invoice_no) BETWEEN 1 AND 30),
  invoice_date          date NOT NULL,
  place_of_supply       text CHECK (place_of_supply ~ '^\d{2}$'),
  total_paise           bigint NOT NULL CHECK (total_paise > 0),
  paid_now_paise        bigint NOT NULL DEFAULT 0 CHECK (paid_now_paise >= 0),
  principal_paise       bigint CHECK (principal_paise BETWEEN 100000 AND 10000000000),   -- lender: ₹1,000 to ₹10 crore
  due_date              date NOT NULL,
  interest_bp           int NOT NULL DEFAULT 0 CHECK (interest_bp BETWEEN 0 AND 3600),    -- % a year × 100, simple
  terms                 text NOT NULL CHECK (char_length(terms) <= 5000),                -- the creator's own terms
  channels              text[] NOT NULL DEFAULT ARRAY['sms', 'whatsapp'] CHECK (channels <@ ARRAY['sms', 'email', 'whatsapp']),
  link_valid_days       int NOT NULL DEFAULT 7 CHECK (link_valid_days BETWEEN 1 AND 15),
  link_token_hash       text UNIQUE,
  link_token_ciphertext text,
  link_base             text,
  link_expires_at       timestamptz,
  hold_id               text,                                       -- the send unit (usage_ledger hold)
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
  CHECK (paid_now_paise <= total_paise),
  CHECK (due_date > invoice_date AND due_date <= invoice_date + 1096)
);
-- An invoice number is used once per counterparty (S13).
CREATE UNIQUE INDEX transactions_invoice_unique ON public.transactions (counterparty_id, lower(invoice_no))
  WHERE invoice_no IS NOT NULL AND status NOT IN ('cancelled', 'rejected', 'expired');
CREATE INDEX transactions_org_idx ON public.transactions (org_id, status, created_at DESC);
CREATE INDEX transactions_counterparty_idx ON public.transactions (counterparty_id, created_at DESC);
CREATE INDEX transactions_created_by_idx ON public.transactions (created_by);
CREATE INDEX transactions_due_idx ON public.transactions (due_date) WHERE status IN ('active', 'partially_paid');
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TABLE public.transaction_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  line            int NOT NULL CHECK (line BETWEEN 1 AND 100),
  product         text NOT NULL CHECK (char_length(product) BETWEEN 1 AND 120),
  hsn             text CHECK (hsn ~ '^\d{4,8}$'),
  qty             numeric(14, 3) NOT NULL CHECK (qty > 0),
  unit            text NOT NULL CHECK (char_length(unit) BETWEEN 1 AND 12),
  rate_paise      bigint NOT NULL CHECK (rate_paise > 0),
  gst_bp          int NOT NULL CHECK (gst_bp IN (0, 25, 300, 500, 1200, 1800, 2800, 4000)),
  taxable_paise   bigint NOT NULL,
  gst_paise       bigint NOT NULL,
  amount_paise    bigint NOT NULL,                                  -- taxable + GST
  UNIQUE (transaction_id, line)
);
CREATE INDEX transaction_items_org_idx ON public.transaction_items (org_id);

-- What was sent, version by version (resending after a change request is a new version; old ones are kept).
CREATE TABLE public.transaction_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,
  snapshot        jsonb NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, version)
);
CREATE INDEX transaction_versions_org_idx ON public.transaction_versions (org_id);

CREATE TABLE public.transaction_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  file_name       text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 120),
  content_type    text NOT NULL CHECK (content_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes      int NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  object_ref      text NOT NULL,
  sha256          char(64) NOT NULL,
  uploaded_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transaction_attachments_tx_idx ON public.transaction_attachments (transaction_id);
CREATE INDEX transaction_attachments_org_idx ON public.transaction_attachments (org_id);
CREATE INDEX transaction_attachments_uploaded_by_idx ON public.transaction_attachments (uploaded_by);

-- The counterparty's answer on the agreement page (S15): accept by OTP, reject, or ask for changes.
CREATE TABLE public.transaction_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,
  decision        text NOT NULL CHECK (decision IN ('accept', 'reject', 'changes')),
  comment         text CHECK (char_length(comment) <= 1000),
  reason          text CHECK (reason IN ('not_mine', 'wrong_amount', 'goods_not_received', 'other')),
  accepted_name   text CHECK (char_length(accepted_name) BETWEEN 2 AND 120),
  otp_ref         text,
  ip              inet,
  user_agent      text,
  decided_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transaction_decisions_tx_idx ON public.transaction_decisions (transaction_id, decided_at DESC);
CREATE INDEX transaction_decisions_org_idx ON public.transaction_decisions (org_id);

-- The seal (v3 8.5): the stored final PDF, its SHA-256 and who accepted it how. One per accepted version.
CREATE TABLE public.transaction_seals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  version         int NOT NULL,
  reference       text NOT NULL,
  pdf_ref         text NOT NULL,                                   -- evidence/… in the write-once store
  sha256          char(64) NOT NULL,
  sealed_at       timestamptz NOT NULL,
  accepted_name   text NOT NULL,
  mobile_masked   text NOT NULL,
  otp_ref         text NOT NULL,
  ip              inet,
  device          text,
  UNIQUE (transaction_id, version)
);
CREATE INDEX transaction_seals_reference_idx ON public.transaction_seals (reference);
CREATE INDEX transaction_seals_org_idx ON public.transaction_seals (org_id);

CREATE TABLE public.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  amount_paise      bigint NOT NULL CHECK (amount_paise > 0),
  interest_paise    bigint NOT NULL DEFAULT 0 CHECK (interest_paise >= 0),   -- the part that paid accrued interest
  principal_paise   bigint NOT NULL CHECK (principal_paise >= 0),
  paid_on           date NOT NULL,
  mode              public.payment_mode NOT NULL,
  reference         text CHECK (char_length(reference) <= 40),
  receipt_ref       text,
  notify_counterparty boolean NOT NULL DEFAULT false,
  recorded_by       uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (interest_paise + principal_paise = amount_paise)
);
CREATE INDEX payments_tx_idx ON public.payments (transaction_id, paid_on);
CREATE INDEX payments_org_idx ON public.payments (org_id);
CREATE INDEX payments_recorded_by_idx ON public.payments (recorded_by);

-- Activity log (S16 marker 6): every event to the second, with who and what. Cannot be edited or deleted.
CREATE TABLE public.transaction_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id  uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  at              timestamptz NOT NULL DEFAULT now(),
  actor_type      text NOT NULL CHECK (actor_type IN ('user', 'counterparty', 'system')),
  actor_id        text,
  actor_name      text,
  event           text NOT NULL,
  detail          jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX transaction_events_tx_idx ON public.transaction_events (transaction_id, at);
CREATE INDEX transaction_events_org_idx ON public.transaction_events (org_id);
CREATE FUNCTION app_private.transaction_events_append_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'transaction_events is append-only';
END $$;
CREATE TRIGGER transaction_events_no_update BEFORE UPDATE OR DELETE ON public.transaction_events
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION app_private.transaction_events_append_only();
REVOKE EXECUTE ON FUNCTION app_private.transaction_events_append_only() FROM PUBLIC, anon, authenticated;

-- OTPs for people without an account on a link page (agreement acceptance; E-Settlement in Part 9b).
CREATE TABLE app_private.link_otps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('transaction', 'settlement')),
  subject_id   uuid NOT NULL,
  code_hash    text NOT NULL,
  ref          text NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  attempts     int NOT NULL DEFAULT 0,
  verified_at  timestamptz
);
CREATE INDEX link_otps_subject_idx ON app_private.link_otps (subject_type, subject_id, sent_at DESC);

-- Public verify page limit: 30 checks per IP an hour (S22).
CREATE TABLE app_private.verify_hits (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL,
  at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verify_hits_ip_idx ON app_private.verify_hits (ip_hash, at DESC);

-- ---------------------------------------------------------------- row-level security

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_seals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.reference_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.link_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.verify_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.reference_counters, app_private.link_otps, app_private.verify_hits FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.transactions, public.transaction_items, public.transaction_versions, public.transaction_attachments,
              public.transaction_decisions, public.transaction_seals, public.payments, public.transaction_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.transactions, public.transaction_items, public.transaction_versions, public.transaction_attachments,
       public.transaction_decisions, public.transaction_seals, public.payments, public.transaction_events FROM authenticated;
-- The link token never reaches the browser.
REVOKE SELECT ON public.transactions FROM authenticated;
GRANT SELECT (id, org_id, counterparty_id, reference, type, status, version, invoice_no, invoice_date, place_of_supply,
              total_paise, paid_now_paise, principal_paise, due_date, interest_bp, terms, channels, link_valid_days,
              link_expires_at, sent_at, viewed_at, decided_at, sealed_at, closed_at, created_by, created_at, updated_at)
  ON public.transactions TO authenticated;

-- Every role can see deals (Viewer read-only, PRD 4.3); changes go through the server (transaction.manage).
CREATE POLICY tx_read ON public.transactions FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.transaction_items FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.transaction_versions FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.transaction_attachments FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.transaction_decisions FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.transaction_seals FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.payments FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY tx_read ON public.transaction_events FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
