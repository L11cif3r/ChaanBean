-- Feature 1: verify a buyer's GSTIN with an OTP sent to their primary authorised signatory
-- (API Setu GSTN Registration Certificate API v1.0.1). One row per OTP attempt cycle.
-- Applied via the Supabase connector as "company_check_gst_otp_verification" + "company_check_gst_otp_column_grants".
CREATE TYPE cc_gst_verification_status AS ENUM ('OTP_SENT','VERIFIED','FAILED','EXPIRED');

CREATE TABLE gst_verifications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  company_check_id     uuid NOT NULL REFERENCES company_checks(id) ON DELETE CASCADE,
  gstin                varchar(15) NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  legal_name_entered   text NOT NULL,
  signatory_email_masked text NOT NULL,
  signatory_email_hash char(64) NOT NULL,
  provider             text NOT NULL,
  txn_id               text,
  status               cc_gst_verification_status NOT NULL,
  otp_attempts         smallint NOT NULL DEFAULT 0,
  otp_sent_at          timestamptz,
  expires_at           timestamptz,
  verified_at          timestamptz,
  legal_name           text,
  trade_name           text,
  constitution         text,
  name_matches_company boolean,
  certificate_pdf      bytea,
  certificate_sha256   char(64),
  error_code           text,
  initiated_by         uuid NOT NULL REFERENCES app_users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gst_verifications_check_idx ON gst_verifications(company_check_id, created_at DESC);
CREATE INDEX gst_verifications_org_idx ON gst_verifications(organisation_id, created_at DESC);

ALTER TABLE gst_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_read ON gst_verifications FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT cc_private.user_org_ids()));
REVOKE ALL ON gst_verifications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON gst_verifications FROM authenticated;

-- Signed-in users may read status fields only; the certificate and transaction id are served by the backend.
REVOKE SELECT ON gst_verifications FROM authenticated;
GRANT SELECT (id, organisation_id, company_check_id, gstin, legal_name_entered, signatory_email_masked, provider,
  status, otp_attempts, otp_sent_at, expires_at, verified_at, legal_name, trade_name, constitution,
  name_matches_company, certificate_sha256, error_code, initiated_by, created_at)
  ON gst_verifications TO authenticated;
