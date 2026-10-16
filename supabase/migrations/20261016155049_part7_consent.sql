-- Part 7: buyer consent for GST turnover and CIBIL (PRD v2.0 section 5; v1.0 5.4, S09, S10, FR-CON-01–07,
-- FR-CW-02/03).
--
-- A consent request belongs to one check request. The buyer opens a single-purpose link (72 hours), verifies the
-- mobile the requester entered by OTP, gives GST portal access (GST username + GSTN OTP) when GST turnover is asked
-- and confirms PAN and date of incorporation or birth when CIBIL is asked. Approving starts the waiting checks;
-- declining, expiry and withdrawal cancel them and release the held units (nothing is charged).
-- Approved data stays visible to the requester for 30 days, and is hidden at once when the buyer withdraws.

CREATE TYPE public.consent_status AS ENUM ('pending', 'approved', 'declined', 'expired', 'withdrawn');

CREATE TABLE public.consent_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  counterparty_id   uuid NOT NULL REFERENCES public.counterparties (id) ON DELETE CASCADE,
  check_request_id  uuid NOT NULL REFERENCES public.check_requests (id) ON DELETE CASCADE,
  scope             text[] NOT NULL CHECK (cardinality(scope) > 0),           -- item codes the buyer is asked for
  purpose           text NOT NULL CHECK (purpose IN ('supply_on_credit', 'advance_against_order', 'loan', 'review_existing')),
  channels          text[] NOT NULL CHECK (cardinality(channels) > 0 AND channels <@ ARRAY['sms', 'email', 'whatsapp']),
  -- The only mobile that can approve (FR-CON-03), fixed when the request is sent.
  mobile_hash       text NOT NULL,
  mobile_ciphertext text NOT NULL,
  mobile_masked     text NOT NULL,
  status            public.consent_status NOT NULL DEFAULT 'pending',
  token_hash        text NOT NULL UNIQUE,
  token_ciphertext  text NOT NULL,                                            -- to send the 24-hour reminder
  link_base         text NOT NULL,
  expires_at        timestamptz NOT NULL,                                     -- 72 hours after sending
  reminded_at       timestamptz,
  approved_at       timestamptz,
  declined_at       timestamptz,
  expired_at        timestamptz,
  withdrawn_at      timestamptz,
  visible_until     timestamptz,                                              -- approved_at + 30 days
  created_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_requests_counterparty_idx ON public.consent_requests (counterparty_id, created_at DESC);
CREATE INDEX consent_requests_org_idx ON public.consent_requests (org_id, status);
CREATE INDEX consent_requests_check_request_idx ON public.consent_requests (check_request_id);
CREATE INDEX consent_requests_created_by_idx ON public.consent_requests (created_by);
CREATE TRIGGER consent_requests_updated_at BEFORE UPDATE ON public.consent_requests
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- Which consent a consent check runs under. A check can reuse a consent approved in the last 30 days (S09).
ALTER TABLE public.check_items ADD COLUMN consent_id uuid REFERENCES public.consent_requests (id) ON DELETE SET NULL;
CREATE INDEX check_items_consent_idx ON public.check_items (consent_id);

-- What the buyer gave: GST portal access and the bureau identifiers. Server only, encrypted.
CREATE TABLE app_private.consent_private (
  consent_id              uuid PRIMARY KEY REFERENCES public.consent_requests (id) ON DELETE CASCADE,
  gst_username_ciphertext text,
  gst_token_ciphertext    text,                                               -- GSP session for the GST returns
  gst_token_expires_at    timestamptz,
  gst_verified_at         timestamptz,
  pan_ciphertext          text,
  dob_ciphertext          text,                                               -- date of incorporation or birth
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- OTPs on the consent page: the buyer's mobile OTP (our code, stored hashed) and the GSTN OTP (checked by the GSP).
CREATE TABLE app_private.consent_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id  uuid NOT NULL REFERENCES public.consent_requests (id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('mobile', 'gstn')),
  code_hash   text,
  ref         text NOT NULL,                                                  -- OTP reference kept in the record
  sent_at     timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  verified_at timestamptz
);
CREATE INDEX consent_otps_consent_idx ON app_private.consent_otps (consent_id, kind, sent_at DESC);

-- The consent record (FR-CON-05): every step with time, IP, device, OTP reference, scope, purpose and expiry.
-- Append-only; searchable by ops in Part 10.
CREATE TABLE app_private.consent_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consent_id  uuid NOT NULL REFERENCES public.consent_requests (id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('sent', 'reminded', 'opened', 'otp_verified', 'gst_verified', 'approved',
                                            'declined', 'expired', 'withdrawn', 'data_fetched')),
  at          timestamptz NOT NULL DEFAULT now(),
  ip          inet,
  user_agent  text,
  otp_ref     text,
  scope       text[] NOT NULL,
  purpose     text NOT NULL,
  expires_at  timestamptz,                                                    -- link expiry, or data visible until
  detail      jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX consent_events_consent_idx ON app_private.consent_events (consent_id, at);
CREATE INDEX consent_events_org_idx ON app_private.consent_events (org_id, at DESC);

CREATE FUNCTION app_private.consent_events_append_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'consent_events is append-only';
END $$;
CREATE TRIGGER consent_events_no_update BEFORE UPDATE OR DELETE ON app_private.consent_events
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION app_private.consent_events_append_only();

-- ---------------------------------------------------------------- row-level security

ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.consent_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.consent_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.consent_private, app_private.consent_otps, app_private.consent_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.consent_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.consent_requests FROM authenticated;
-- The link token and the buyer's mobile never leave the server.
REVOKE SELECT ON public.consent_requests FROM authenticated;
GRANT SELECT (id, org_id, counterparty_id, check_request_id, scope, purpose, channels, mobile_masked, status, expires_at,
              reminded_at, approved_at, declined_at, expired_at, withdrawn_at, visible_until, created_by, created_at,
              updated_at) ON public.consent_requests TO authenticated;
REVOKE EXECUTE ON FUNCTION app_private.consent_events_append_only() FROM PUBLIC, anon, authenticated;

-- Consent status is part of the report, so it is readable wherever the report is (report.view).
CREATE POLICY consent_read ON public.consent_requests FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'report.view'));
