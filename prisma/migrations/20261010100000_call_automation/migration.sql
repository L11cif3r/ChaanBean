-- Feature 3: Call Automation (Collect). Additive migration: 7 enums, 4 tables, 1 function, RLS.
--
-- Depends on Feature 1 (migrations 20261008120000_company_check .. 20261009120000_*):
--   * public.organisations(id)        tenant root; every row here carries organisation_id
--   * cc_private.user_org_ids()       RLS helper (20261009100000_company_check_harden_functions)
--   * gen_random_uuid()
-- It alters and drops nothing that already exists, so it can merge in either order with other branches
-- as long as it is applied after Company Check.
--
-- Naming follows the Call Automation guide §5: collection_cases, call_schedules, call_attempts,
-- collection_events. The guide's `call_schedules.enabled` is expressed as `state` (ACTIVE | PAUSED |
-- COMPLETED) so the dashboard states in guide §11 cannot disagree with a separate boolean.

CREATE TYPE ca_case_status         AS ENUM ('ACTIVE', 'PAUSED', 'PAID', 'DISPUTED', 'CLOSED');
CREATE TYPE ca_contact_authority   AS ENUM ('UNVERIFIED', 'CONFIRMED', 'WITHDRAWN');
CREATE TYPE ca_frequency           AS ENUM ('DAILY', 'EVERY_2_DAYS', 'WEEKLY');
CREATE TYPE ca_schedule_state      AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE ca_provider            AS ENUM ('MOCK', 'EXOTEL', 'VOBIZ');
CREATE TYPE ca_attempt_status      AS ENUM ('QUEUED', 'INITIATED', 'ANSWERED', 'COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED');
CREATE TYPE ca_attempt_trigger     AS ENUM ('SCHEDULED', 'MANUAL');

-- ---------------------------------------------------------------------------- collection_cases
CREATE TABLE collection_cases (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id                uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- Reference to the payment record once Feature 2 (Business Security) owns invoices. Deliberately no
  -- foreign key: the legacy "Invoice" table belongs to the old tenant model and must not be coupled here.
  invoice_id                     text,
  debtor_name                    text NOT NULL CHECK (length(btrim(debtor_name)) BETWEEN 1 AND 200),
  -- Personal data: AES-256-GCM ciphertext (iv | tag | data); only the last 4 digits are kept in clear.
  debtor_phone_enc               bytea NOT NULL,
  debtor_phone_last4             varchar(4) NOT NULL,
  amount_due_paise               bigint NOT NULL CHECK (amount_due_paise >= 0),
  due_date                       date NOT NULL,
  language                       text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  status                         ca_case_status NOT NULL DEFAULT 'ACTIVE',
  contact_authority              ca_contact_authority NOT NULL DEFAULT 'UNVERIFIED',
  contact_authority_changed_at   timestamptz,
  contact_authority_changed_by   uuid,
  promised_pay_date              date,
  promised_amount_paise          bigint CHECK (promised_amount_paise IS NULL OR promised_amount_paise > 0),
  created_by                     uuid,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now(),
  closed_at                      timestamptz
);
CREATE INDEX collection_cases_org_idx ON collection_cases (organisation_id, created_at DESC);
CREATE INDEX collection_cases_org_status_idx ON collection_cases (organisation_id, status);

-- ---------------------------------------------------------------------------- call_schedules
CREATE TABLE call_schedules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              uuid NOT NULL UNIQUE REFERENCES collection_cases(id) ON DELETE CASCADE,
  organisation_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  frequency            ca_frequency NOT NULL,
  timezone             text NOT NULL DEFAULT 'Asia/Kolkata' CHECK (timezone = 'Asia/Kolkata'),
  state                ca_schedule_state NOT NULL DEFAULT 'ACTIVE',
  next_call_at         timestamptz,
  max_attempts         integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 10),
  attempt_count        integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  -- Consecutive provider rejections (no call placed). Bounded so an outage cannot loop forever.
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  stop_reason          text,
  last_attempt_at      timestamptz,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (attempt_count <= max_attempts)
);
-- The scheduler only ever scans active schedules that are due.
CREATE INDEX call_schedules_due_idx ON call_schedules (next_call_at) WHERE state = 'ACTIVE';
CREATE INDEX call_schedules_org_idx ON call_schedules (organisation_id);

-- ---------------------------------------------------------------------------- call_attempts
CREATE TABLE call_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id           uuid NOT NULL REFERENCES collection_cases(id) ON DELETE CASCADE,
  schedule_id       uuid REFERENCES call_schedules(id) ON DELETE SET NULL,
  trigger           ca_attempt_trigger NOT NULL,
  provider          ca_provider NOT NULL,
  provider_call_id  text,
  -- SCHEDULED: "<schedule_id>:<slot ISO time>", so one slot can never produce two attempts.
  -- MANUAL:    "manual:<case_id>:<client key>".
  idempotency_key   text NOT NULL UNIQUE,
  status            ca_attempt_status NOT NULL DEFAULT 'QUEUED',
  scheduled_for     timestamptz,
  initiated_at      timestamptz,   -- we sent the request to the provider
  accepted_at       timestamptz,   -- provider accepted it (NOT proof the phone rang)
  answered_at       timestamptz,   -- recipient picked up
  completed_at      timestamptz,   -- call ended / terminal outcome
  duration_seconds  integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  failure_reason    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX call_attempts_provider_call_uq ON call_attempts (provider, provider_call_id) WHERE provider_call_id IS NOT NULL;
CREATE INDEX call_attempts_case_idx ON call_attempts (case_id, created_at DESC);
CREATE INDEX call_attempts_org_idx ON call_attempts (organisation_id, created_at DESC);
-- Reconciliation looks for attempts that never reached a terminal state.
CREATE INDEX call_attempts_open_idx ON call_attempts (created_at) WHERE status IN ('QUEUED', 'INITIATED', 'ANSWERED');

-- ---------------------------------------------------------------------------- collection_events
-- Append-only case timeline. No raw provider payloads and no phone numbers are stored here.
CREATE TABLE collection_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id          uuid NOT NULL REFERENCES collection_cases(id) ON DELETE CASCADE,
  attempt_id       uuid REFERENCES call_attempts(id) ON DELETE SET NULL,
  event_type       text NOT NULL,
  actor_type       text NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM', 'PROVIDER')),
  actor_id         uuid,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX collection_events_case_idx ON collection_events (case_id, occurred_at DESC);
CREATE INDEX collection_events_org_idx ON collection_events (organisation_id, occurred_at DESC);
-- A duplicated or replayed provider callback must not add a second timeline entry for the same attempt.
CREATE UNIQUE INDEX collection_events_attempt_type_uq ON collection_events (attempt_id, event_type) WHERE attempt_id IS NOT NULL;

CREATE FUNCTION collection_events_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'collection_events is append-only';
END
$$;
CREATE TRIGGER collection_events_no_update BEFORE UPDATE OR DELETE ON collection_events
  FOR EACH ROW EXECUTE FUNCTION collection_events_append_only();

-- ---------------------------------------------------------------------------- row-level security
-- Same model as Feature 1: the app connects with a privileged role and authorises in code
-- (organisation derived from the verified session); RLS protects direct PostgREST/Realtime access.
ALTER TABLE collection_cases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_read ON collection_cases  FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON call_schedules    FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON call_attempts     FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON collection_events FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
