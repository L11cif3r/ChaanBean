-- Part 4: counterparties, the buyers, debtors and borrowers an organisation checks and deals with
-- (PRD S05, S06, S07; FR-CP-01–08; section 15 for PII).
--
-- Three types (FR-CP-01): a business with a GSTIN, a business without GST (PAN) and an individual (lender deals).
-- PAN, mobile, WhatsApp and email are personal data: stored encrypted, found by a keyed hash (exact match only) and
-- shown masked. GSTIN, CIN and Udyam are public business identifiers and stay searchable in plain text.
-- The same GSTIN, PAN or mobile cannot be added twice in one organisation (FR-CP-04), archived records included, so a
-- duplicate always points to the existing profile, which can be restored (FR-CP-08).
-- Adding a counterparty is free: the ₹10 "Add New Unregistered Customer" item is not in the PRD v2.0 price list.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TYPE public.counterparty_type AS ENUM ('business_gstin', 'business_pan', 'individual');
CREATE TYPE public.counterparty_status AS ENUM ('active', 'archived');
-- Bank-linked mobile check (FR-CP-03): a UPI lookup, or the manual "send ₹1 by UPI" confirmation.
CREATE TYPE public.upi_status AS ENUM ('not_checked', 'linked', 'not_linked', 'unavailable', 'manual_confirmed');

CREATE TABLE public.counterparties (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  type                 public.counterparty_type NOT NULL,
  legal_name           text NOT NULL CHECK (char_length(legal_name) BETWEEN 2 AND 120),
  trade_name           text CHECK (char_length(trade_name) <= 120),
  gstin                text CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  gst_status           text,                                   -- from the GSTIN fetch: Active, Cancelled, Suspended
  pan_hash             text,
  pan_ciphertext       text,
  pan_masked           text,
  cin                  text CHECK (cin ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'),
  udyam                text CHECK (udyam ~ '^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$'),
  contact_name         text NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 80),
  mobile_hash          text NOT NULL,
  mobile_ciphertext    text NOT NULL,
  mobile_masked        text NOT NULL,
  whatsapp_ciphertext  text,                                   -- NULL = same as the mobile
  whatsapp_masked      text,
  email_ciphertext     text,
  email_masked         text,
  address              jsonb NOT NULL,                         -- { line, city, state, pincode }
  state_code           text CHECK (state_code ~ '^[0-9]{2}$'),
  city                 text,
  credit_days          int CHECK (credit_days BETWEEN 0 AND 365),
  interest_rate_bp     int CHECK (interest_rate_bp BETWEEN 0 AND 3600),   -- % per year × 100 (0.00–36.00%)
  tags                 text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 10),
  notes                text CHECK (char_length(notes) <= 2000),
  upi_status           public.upi_status NOT NULL DEFAULT 'not_checked',
  upi_name             text,
  upi_checked_at       timestamptz,
  upi_confirmed_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,   -- manual ₹1 confirmation
  status               public.counterparty_status NOT NULL DEFAULT 'active',
  archived_at          timestamptz,
  archived_by          uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_by           uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'business_gstin') = (gstin IS NOT NULL)),
  CHECK (type = 'business_gstin' OR pan_hash IS NOT NULL),
  CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);
CREATE UNIQUE INDEX counterparties_org_gstin ON public.counterparties (org_id, gstin) WHERE gstin IS NOT NULL;
CREATE UNIQUE INDEX counterparties_org_pan ON public.counterparties (org_id, pan_hash) WHERE pan_hash IS NOT NULL;
CREATE UNIQUE INDEX counterparties_org_mobile ON public.counterparties (org_id, mobile_hash);
CREATE INDEX counterparties_org_list_idx ON public.counterparties (org_id, status, created_at DESC);
CREATE INDEX counterparties_name_trgm_idx ON public.counterparties USING gin (lower(legal_name) extensions.gin_trgm_ops);
CREATE INDEX counterparties_tags_idx ON public.counterparties USING gin (tags);
CREATE INDEX counterparties_created_by_idx ON public.counterparties (created_by);
CREATE INDEX counterparties_archived_by_idx ON public.counterparties (archived_by);
CREATE INDEX counterparties_upi_confirmed_by_idx ON public.counterparties (upi_confirmed_by);
CREATE TRIGGER counterparties_updated_at BEFORE UPDATE ON public.counterparties
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- UPI lookups are kept server-side, so the result stored with a counterparty comes from the lookup and not from
-- what the browser sends (FR-CP-03: "result and time stored").
CREATE TABLE app_private.upi_checks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  mobile_hash text NOT NULL,
  status      public.upi_status NOT NULL CHECK (status IN ('linked', 'not_linked', 'unavailable')),
  upi_name    text,
  provider    text NOT NULL,
  checked_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  checked_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX upi_checks_lookup_idx ON app_private.upi_checks (org_id, mobile_hash, checked_at DESC);
CREATE INDEX upi_checks_checked_by_idx ON app_private.upi_checks (checked_by);

-- ---------------------------------------------------------------- row-level security

ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.upi_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.upi_checks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.counterparties FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.counterparties FROM authenticated;

-- Every member sees the organisation's counterparties (Viewer included, PRD 4.3); writes go through the server.
CREATE POLICY org_read ON public.counterparties FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()));
