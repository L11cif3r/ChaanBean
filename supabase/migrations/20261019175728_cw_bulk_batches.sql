-- Credit Worthiness for many companies at once: the user uploads an Excel or CSV list, picks the checks (public ones
-- only; checks that need the buyer's OTP are asked per buyer), sees the cost, and every row becomes its own report.
-- New companies are added as counterparties (charged CP_ADD like any new buyer).

CREATE TABLE public.check_batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  file_name     text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 160),
  items         text[] NOT NULL CHECK (cardinality(items) BETWEEN 1 AND 20),
  total_rows    int NOT NULL CHECK (total_rows BETWEEN 1 AND 200),
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done')),
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);
CREATE INDEX check_batches_org_idx ON public.check_batches (org_id, created_at DESC);
CREATE INDEX check_batches_created_by_idx ON public.check_batches (created_by);

CREATE TABLE public.check_batch_rows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          uuid NOT NULL REFERENCES public.check_batches (id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  row_no            int NOT NULL CHECK (row_no >= 1),
  gstin             text,
  legal_name        text CHECK (char_length(legal_name) <= 120),
  contact_name      text CHECK (char_length(contact_name) <= 80),
  mobile_ciphertext text,
  mobile_masked     text,
  email_ciphertext  text,
  is_new            boolean NOT NULL DEFAULT false,
  counterparty_id   uuid REFERENCES public.counterparties (id) ON DELETE SET NULL,
  request_id        uuid REFERENCES public.check_requests (id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'skipped')),
  error             text CHECK (char_length(error) <= 300),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, row_no)
);
CREATE INDEX check_batch_rows_org_idx ON public.check_batch_rows (org_id);
CREATE INDEX check_batch_rows_counterparty_idx ON public.check_batch_rows (counterparty_id);
CREATE INDEX check_batch_rows_request_idx ON public.check_batch_rows (request_id);
CREATE TRIGGER check_batch_rows_updated_at BEFORE UPDATE ON public.check_batch_rows
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

ALTER TABLE public.check_requests ADD COLUMN batch_id uuid REFERENCES public.check_batches (id) ON DELETE SET NULL;
CREATE INDEX check_requests_batch_idx ON public.check_requests (batch_id);

ALTER TABLE public.check_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_batch_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.check_batches, public.check_batch_rows FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.check_batches, public.check_batch_rows FROM authenticated;
REVOKE SELECT ON public.check_batch_rows FROM authenticated;
GRANT SELECT (id, batch_id, org_id, row_no, gstin, legal_name, contact_name, mobile_masked, is_new, counterparty_id, request_id,
              status, error, updated_at) ON public.check_batch_rows TO authenticated;
CREATE POLICY cb_read ON public.check_batches FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
CREATE POLICY cb_read ON public.check_batch_rows FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
