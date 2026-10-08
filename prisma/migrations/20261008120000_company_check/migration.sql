-- Feature 1: Company Check (PRD "ChaanBean-Feature-1", sections 13.2–13.6)
-- Additive only: creates new snake_case tables next to the existing PascalCase ones.
-- Money is stored as BIGINT paise. Tenant tables carry organisation_id and row-level security.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- ---------------------------------------------------------------- enums
CREATE TYPE cc_entity_type AS ENUM ('PRIVATE_LTD','PUBLIC_LTD','OPC','LLP','PROPRIETORSHIP','PARTNERSHIP','HUF','TRUST','OTHER');
CREATE TYPE cc_company_status AS ENUM ('ACTIVE','STRIKE_OFF','UNDER_LIQUIDATION','DISSOLVED','AMALGAMATED','DORMANT','UNDER_PROCESS_OF_STRIKE_OFF','OTHER');
CREATE TYPE cc_gst_status AS ENUM ('ACTIVE','CANCELLED','SUSPENDED','INACTIVE','PROVISIONAL');
CREATE TYPE cc_gst_return_type AS ENUM ('GSTR1','GSTR3B','GSTR4','GSTR9','CMP08');
CREATE TYPE cc_filing_status AS ENUM ('FILED','NOT_FILED');
CREATE TYPE cc_statement_type AS ENUM ('STANDALONE','CONSOLIDATED');
CREATE TYPE cc_verification_status AS ENUM ('VERIFIED','PROVIDER_PARSED','USER_PROVIDED');
CREATE TYPE cc_charge_status AS ENUM ('OPEN','SATISFIED');
CREATE TYPE cc_contact_type AS ENUM ('ADDRESS','EMAIL','PHONE','WEBSITE');
CREATE TYPE cc_member_role AS ENUM ('OWNER','FINANCE','READ_ONLY');
CREATE TYPE cc_kyc_status AS ENUM ('PENDING','VERIFIED','REJECTED');
CREATE TYPE cc_subscription_status AS ENUM ('ACTIVE','PAST_DUE','CANCELLED');
CREATE TYPE cc_check_purpose AS ENUM ('NEW_BUYER','LIMIT_INCREASE','PERIODIC_REVIEW');
CREATE TYPE cc_check_status AS ENUM ('QUEUED','FETCHING','ASSESSING','COMPLETED','PARTIAL','FAILED','CANCELLED');
CREATE TYPE cc_charge_state AS ENUM ('CHARGED','REFUNDED','FREE_REOPEN');
CREATE TYPE cc_section AS ENUM ('MCA_MASTER','DIRECTORS','GST_PROFILE','GST_FILINGS','FINANCIALS','CHARGES','MSME');
CREATE TYPE cc_section_status AS ENUM ('PENDING','RUNNING','SUCCESS','NOT_AVAILABLE','SOURCE_ERROR','SKIPPED');
CREATE TYPE cc_risk_band AS ENUM ('LOW','MODERATE','HIGH','VERY_HIGH','INSUFFICIENT_DATA');
CREATE TYPE cc_confidence AS ENUM ('HIGH','MEDIUM','LOW');
CREATE TYPE cc_decision AS ENUM ('APPROVED_AS_REQUESTED','APPROVED_REDUCED','DECLINED','ON_HOLD');
CREATE TYPE cc_ledger_entry AS ENUM ('TOPUP','CHECK_DEBIT','REFUND','ADJUSTMENT');
CREATE TYPE cc_policy_status AS ENUM ('DRAFT','ACTIVE','RETIRED');
CREATE TYPE cc_product_code AS ENUM ('COMPANY_CHECK','INDIVIDUAL_CHECK','FIND_SOMEONE');
CREATE TYPE cc_provider_mode AS ENUM ('MOCK','SANDBOX','LIVE');
CREATE TYPE cc_provider_outcome AS ENUM ('SUCCESS','NOT_FOUND','TIMEOUT','RATE_LIMITED','AUTH_ERROR','ERROR');
CREATE TYPE cc_actor_type AS ENUM ('USER','ADMIN','SYSTEM','AGENT');

-- ---------------------------------------------------------------- foundation (13.2)
CREATE TABLE organisations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name   text NOT NULL,
  gstin        varchar(15),
  kyc_status   cc_kyc_status NOT NULL DEFAULT 'PENDING',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Profile row for each Supabase Auth user (auth.users holds the credentials)
CREATE TABLE app_users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone        text,
  email        extensions.citext,
  full_name    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organisation_members (
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role            cc_member_role NOT NULL,
  status          text NOT NULL DEFAULT 'ACTIVE',
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);
CREATE INDEX organisation_members_user_idx ON organisation_members(user_id);

CREATE TABLE subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan_code          text NOT NULL,
  status             cc_subscription_status NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_org_idx ON subscriptions(organisation_id, current_period_end DESC);

CREATE TABLE wallets (
  organisation_id uuid PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  balance_paise   bigint NOT NULL DEFAULT 0 CHECK (balance_paise >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wallet_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  entry_type         cc_ledger_entry NOT NULL,
  amount_paise       bigint NOT NULL CHECK (amount_paise <> 0),
  balance_after_paise bigint NOT NULL CHECK (balance_after_paise >= 0),
  reference_type     text,
  reference_id       uuid,
  gateway_payment_id text UNIQUE,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_ledger_org_idx ON wallet_ledger(organisation_id, created_at DESC);

-- Balance is maintained only by the ledger.
CREATE FUNCTION wallet_apply_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE new_balance bigint;
BEGIN
  INSERT INTO wallets(organisation_id, balance_paise) VALUES (NEW.organisation_id, 0)
    ON CONFLICT (organisation_id) DO NOTHING;
  UPDATE wallets SET balance_paise = balance_paise + NEW.amount_paise, updated_at = now()
    WHERE organisation_id = NEW.organisation_id
    RETURNING balance_paise INTO new_balance;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001';
  END IF;
  NEW.balance_after_paise := new_balance;
  RETURN NEW;
END $$;
CREATE TRIGGER wallet_ledger_apply BEFORE INSERT ON wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION wallet_apply_ledger();

-- ---------------------------------------------------------------- shared company data (13.3)
CREATE TABLE companies (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type               cc_entity_type NOT NULL,
  legal_name                text NOT NULL,
  trade_name                text,
  cin                       varchar(21) UNIQUE CHECK (cin ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'),
  llpin                     varchar(8)  UNIQUE CHECK (llpin ~ '^[A-Z]{3}-[0-9]{4}$'),
  pan_enc                   bytea,
  pan_hash                  char(64) UNIQUE,
  company_status            cc_company_status,
  company_class             text,
  category                  text,
  sub_category              text,
  roc_code                  text,
  incorporation_date        date,
  authorised_capital_paise  bigint CHECK (authorised_capital_paise >= 0),
  paid_up_capital_paise     bigint CHECK (paid_up_capital_paise >= 0),
  listing_status            text,
  registered_address        jsonb,
  state_code                char(2),
  registered_email          extensions.citext,
  last_agm_date             date,
  last_balance_sheet_date   date,
  mca_synced_at             timestamptz,
  gst_synced_at             timestamptz,
  financials_synced_at      timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX companies_legal_name_trgm ON companies USING gin (legal_name extensions.gin_trgm_ops);
CREATE INDEX companies_trade_name_trgm ON companies USING gin (trade_name extensions.gin_trgm_ops);

CREATE TABLE company_gst_registrations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  gstin              varchar(15) NOT NULL UNIQUE CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  legal_name         text,
  trade_name         text,
  gst_status         cc_gst_status NOT NULL,
  registration_date  date,
  cancellation_date  date,
  constitution       text,
  taxpayer_type      text,
  principal_address  jsonb,
  additional_places  jsonb,
  state_code         char(2),
  nature_of_business text[],
  turnover_slab      text,
  turnover_slab_fy   varchar(7),
  einvoice_enabled   boolean,
  source             text NOT NULL,
  fetched_at         timestamptz NOT NULL
);
CREATE INDEX company_gst_registrations_company_idx ON company_gst_registrations(company_id);

CREATE TABLE gst_return_filings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gst_registration_id uuid NOT NULL REFERENCES company_gst_registrations(id) ON DELETE CASCADE,
  return_type         cc_gst_return_type NOT NULL,
  tax_period          char(6) NOT NULL,
  fiscal_year         varchar(7),
  due_date            date,
  filed_on            date,
  days_late           int GENERATED ALWAYS AS (GREATEST(filed_on - due_date, 0)) STORED,
  filing_status       cc_filing_status NOT NULL,
  source              text NOT NULL,
  fetched_at          timestamptz NOT NULL,
  UNIQUE (gst_registration_id, return_type, tax_period)
);

CREATE TABLE company_financials (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year                   varchar(7) NOT NULL,
  period_end                    date NOT NULL,
  statement_type                cc_statement_type NOT NULL,
  revenue_from_operations_paise bigint,
  other_income_paise            bigint,
  total_income_paise            bigint,
  profit_before_tax_paise       bigint,
  profit_after_tax_paise        bigint,
  net_worth_paise               bigint,
  total_borrowings_paise        bigint,
  total_assets_paise            bigint,
  current_assets_paise          bigint,
  current_liabilities_paise     bigint,
  filing_form                   text,
  filed_on                      date,
  source_document_path          text,
  verification_status           cc_verification_status NOT NULL,
  source                        text NOT NULL,
  fetched_at                    timestamptz NOT NULL,
  UNIQUE (company_id, fiscal_year, statement_type)
);

CREATE TABLE directors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  din         char(8) NOT NULL UNIQUE CHECK (din ~ '^[0-9]{8}$'),
  full_name   text NOT NULL,
  din_status  text,
  source      text NOT NULL,
  fetched_at  timestamptz NOT NULL
);

CREATE TABLE company_directors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  director_id  uuid NOT NULL REFERENCES directors(id) ON DELETE CASCADE,
  designation  text,
  appointed_on date,
  ceased_on    date,
  is_signatory boolean,
  source       text NOT NULL,
  fetched_at   timestamptz NOT NULL
);
CREATE UNIQUE INDEX company_directors_uniq ON company_directors(company_id, director_id, COALESCE(appointed_on, '1900-01-01'));

CREATE TABLE company_charges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  charge_id     text,
  charge_holder text,
  amount_paise  bigint,
  created_on    date,
  modified_on   date,
  satisfied_on  date,
  charge_status cc_charge_status,
  source        text NOT NULL,
  fetched_at    timestamptz NOT NULL
);
CREATE INDEX company_charges_company_idx ON company_charges(company_id);

CREATE TABLE company_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_type cc_contact_type NOT NULL,
  label        text,
  value        jsonb NOT NULL,
  source       text NOT NULL,
  fetched_at   timestamptz NOT NULL
);
CREATE INDEX company_contacts_company_idx ON company_contacts(company_id);

-- ---------------------------------------------------------------- configuration (13.5)
CREATE TABLE credit_policies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version      int NOT NULL UNIQUE,
  status       cc_policy_status NOT NULL DEFAULT 'DRAFT',
  params       jsonb NOT NULL,
  notes        text,
  created_by   uuid,
  approved_by  uuid,
  activated_at timestamptz,
  retired_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR created_by IS NULL OR approved_by <> created_by)
);
CREATE UNIQUE INDEX credit_policies_one_active ON credit_policies(status) WHERE status = 'ACTIVE';

CREATE TABLE lookup_prices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code     cc_product_code NOT NULL,
  price_paise      bigint NOT NULL CHECK (price_paise >= 0),
  gst_rate         numeric(5,4) NOT NULL DEFAULT 0.18,
  free_reopen_days int NOT NULL DEFAULT 30,
  effective_from   timestamptz NOT NULL DEFAULT now(),
  effective_to     timestamptz
);

-- ---------------------------------------------------------------- tenant tables (13.4)
CREATE TABLE company_checks (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id        uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  requested_by           uuid NOT NULL REFERENCES app_users(id),
  company_id             uuid REFERENCES companies(id),
  search_query           text,
  input_identifiers      jsonb,
  credit_requested_paise bigint CHECK (credit_requested_paise > 0),
  credit_period_days     int CHECK (credit_period_days BETWEEN 1 AND 365),
  purpose                cc_check_purpose NOT NULL,
  customer_reference     varchar(60),
  consent_at             timestamptz NOT NULL,
  status                 cc_check_status NOT NULL DEFAULT 'QUEUED',
  price_paise            bigint NOT NULL DEFAULT 0,
  gst_paise              bigint NOT NULL DEFAULT 0,
  charge_status          cc_charge_state NOT NULL,
  reused_from_check_id   uuid REFERENCES company_checks(id),
  idempotency_key        text NOT NULL,
  correlation_id         uuid NOT NULL DEFAULT gen_random_uuid(),
  error_code             text,
  started_at             timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, idempotency_key)
);
CREATE INDEX company_checks_org_created_idx ON company_checks(organisation_id, created_at DESC);
CREATE INDEX company_checks_org_company_idx ON company_checks(organisation_id, company_id, created_at DESC);

CREATE TABLE company_check_sections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_check_id  uuid NOT NULL REFERENCES company_checks(id) ON DELETE CASCADE,
  organisation_id   uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  section           cc_section NOT NULL,
  status            cc_section_status NOT NULL DEFAULT 'PENDING',
  provider          text,
  served_from_cache boolean NOT NULL DEFAULT false,
  attempts          smallint NOT NULL DEFAULT 0,
  last_error        text,
  completed_at      timestamptz,
  UNIQUE (company_check_id, section)
);

CREATE TABLE credit_assessments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_check_id        uuid NOT NULL REFERENCES company_checks(id) ON DELETE CASCADE,
  organisation_id         uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  policy_id               uuid NOT NULL REFERENCES credit_policies(id),
  policy_version          int NOT NULL,
  inputs                  jsonb NOT NULL,
  turnover_latest_paise   bigint,
  turnover_cagr           numeric(7,4),
  gst_ontime_ratio        numeric(5,4),
  multipliers             jsonb,
  score                   smallint CHECK (score BETWEEN 0 AND 100),
  risk_band               cc_risk_band NOT NULL,
  confidence              cc_confidence NOT NULL,
  recommended_limit_paise bigint CHECK (recommended_limit_paise >= 0),
  requested_amount_paise  bigint,
  exceeds_limit           boolean,
  exceed_ratio            numeric(12,2),
  factors                 jsonb NOT NULL,
  hard_stops              text[] NOT NULL DEFAULT '{}',
  ai_explanation          text,
  ai_model                text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_assessments_check_idx ON credit_assessments(company_check_id, created_at DESC);

CREATE TABLE credit_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_assessment_id  uuid NOT NULL REFERENCES credit_assessments(id) ON DELETE CASCADE,
  organisation_id       uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  decided_by            uuid REFERENCES app_users(id),
  decision              cc_decision NOT NULL,
  approved_amount_paise bigint,
  credit_period_days    int,
  override_reason       varchar(500),
  notes                 varchar(1000),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (decision NOT IN ('APPROVED_AS_REQUESTED','APPROVED_REDUCED') OR approved_amount_paise > 0)
);

CREATE TABLE report_files (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_check_id     uuid NOT NULL REFERENCES company_checks(id) ON DELETE CASCADE,
  credit_assessment_id uuid REFERENCES credit_assessments(id) ON DELETE CASCADE,
  organisation_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  storage_path         text NOT NULL,
  sha256               char(64) NOT NULL,
  size_bytes           int,
  version              int NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- monitoring and audit (13.5)
CREATE TABLE provider_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_check_id  uuid REFERENCES company_checks(id) ON DELETE SET NULL,
  organisation_id   uuid,
  provider          text NOT NULL,
  operation         text NOT NULL,
  mode              cc_provider_mode NOT NULL,
  request_hash      char(64),
  http_status       int,
  outcome           cc_provider_outcome NOT NULL,
  latency_ms        int,
  cost_paise        bigint NOT NULL DEFAULT 0,
  raw_response_path text,
  correlation_id    uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_calls_provider_idx ON provider_calls(provider, created_at DESC);

CREATE TABLE audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid,
  actor_type      cc_actor_type NOT NULL,
  actor_id        uuid,
  action          text NOT NULL,
  entity_type     text,
  entity_id       uuid,
  correlation_id  uuid,
  ip              text,
  user_agent      text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_org_idx ON audit_events(organisation_id, created_at DESC);
CREATE FUNCTION audit_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$;
CREATE TRIGGER audit_events_no_change BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();

CREATE TABLE outbox_events (
  id           bigserial PRIMARY KEY,
  event_type   text NOT NULL,
  organisation_id uuid,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- ---------------------------------------------------------------- row-level security (13.6)
-- Helper: organisations the signed-in Supabase user belongs to.
CREATE FUNCTION public.cc_user_org_ids() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'ACTIVE'
$$;

ALTER TABLE organisations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger          ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_checks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_check_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_assessments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_decisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_files           ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_read ON organisations          FOR SELECT TO authenticated USING (id IN (SELECT cc_user_org_ids()));
CREATE POLICY self_read ON app_users             FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY org_read ON organisation_members   FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON subscriptions          FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON wallets                FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON wallet_ledger          FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON company_checks         FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON company_check_sections FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON credit_assessments     FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON credit_decisions       FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
CREATE POLICY org_read ON report_files           FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_user_org_ids()));
-- All writes go through the backend (server role). No client write policies.

-- Shared registry, config and audit tables: backend only.
ALTER TABLE companies                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_gst_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_return_filings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_financials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE directors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_directors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_charges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_policies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_prices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_calls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events             ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON companies, company_gst_registrations, gst_return_filings, company_financials, directors,
  company_directors, company_charges, company_contacts, credit_policies, lookup_prices, provider_calls,
  audit_events, outbox_events FROM anon, authenticated;
REVOKE ALL ON organisations, app_users, organisation_members, subscriptions, wallets, wallet_ledger,
  company_checks, company_check_sections, credit_assessments, credit_decisions, report_files FROM anon;
REVOKE INSERT, UPDATE, DELETE ON organisations, app_users, organisation_members, subscriptions, wallets, wallet_ledger,
  company_checks, company_check_sections, credit_assessments, credit_decisions, report_files FROM authenticated;

-- ---------------------------------------------------------------- seed config
INSERT INTO credit_policies (version, status, params, notes, activated_at) VALUES (1, 'ACTIVE', '{
  "base_pct": 0.01,
  "growth_bands": [ {"min_cagr": 0.15, "mult": 1.25}, {"min_cagr": 0.0, "mult": 1.0}, {"min_cagr": -0.15, "mult": 0.75}, {"min_cagr": null, "mult": 0.5} ],
  "gst_bands": [ {"min_ratio": 0.90, "mult": 1.0}, {"min_ratio": 0.70, "mult": 0.85}, {"min_ratio": null, "mult": 0.6} ],
  "gst_missing_mult": 1.0,
  "young_company_years": 2, "young_company_mult": 0.75,
  "max_limit_paise": 50000000000,
  "round_down_paise": 100000,
  "hard_stop_statuses": ["STRIKE_OFF","UNDER_LIQUIDATION","DISSOLVED","AMALGAMATED"],
  "weights": {"financial": 35, "gst": 25, "stability": 20, "management": 10, "borrowing": 10},
  "band_cutoffs": {"LOW": 75, "MODERATE": 55, "HIGH": 35},
  "exceed_high_risk_ratio": 2
}', 'PRD Feature 1 §9, policy v1 (proposed, pending Praveen sign-off)', now());

-- Placeholder price until Praveen confirms (PRD open question 3): ₹500 + 18% GST.
INSERT INTO lookup_prices (product_code, price_paise) VALUES ('COMPANY_CHECK', 50000);
