-- Part 1 Foundation: tenancy, roles (PRD 4.2, 4.3), append-only hash-chained audit log (FR-AUD-01, 11.2),
-- and the background job queue (12.1). Helpers live in app_private, which the API does not expose.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE TYPE public.org_status AS ENUM ('pending_verification', 'active', 'suspended', 'closed');
CREATE TYPE public.org_verification AS ENUM ('unverified', 'gstin_verified', 'pan_verified', 'manual_review', 'rejected');
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.member_status AS ENUM ('invited', 'active', 'deactivated');
CREATE TYPE public.audit_actor AS ENUM ('user', 'system', 'counterparty', 'ops');
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'done', 'dead');

CREATE FUNCTION app_private.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------- organisations, users, memberships

CREATE TABLE public.organisations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name          text NOT NULL CHECK (char_length(legal_name) BETWEEN 2 AND 200),
  trade_name          text,
  gstin               text UNIQUE CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  pan_hash            text,          -- HMAC blind index for exact-match lookup
  pan_ciphertext      text,          -- AES-256-GCM, see src/server/crypto
  cin                 text CHECK (cin ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'),
  constitution        text,
  state_code          text CHECK (state_code ~ '^[0-9]{2}$'),
  address             jsonb,
  verification_status public.org_verification NOT NULL DEFAULT 'unverified',
  status              public.org_status NOT NULL DEFAULT 'pending_verification',
  created_by          uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organisations_pan_hash_idx ON public.organisations (pan_hash) WHERE pan_hash IS NOT NULL;
CREATE TRIGGER organisations_updated_at BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- One row per signed-in person. The mobile number lives in auth.users.phone (Supabase Auth).
CREATE TABLE public.user_profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name      text CHECK (char_length(full_name) BETWEEN 2 AND 80),
  email          text,
  designation    text,
  last_active_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TABLE public.memberships (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role           public.member_role NOT NULL,
  status         public.member_status NOT NULL DEFAULT 'invited',
  invited_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  joined_at      timestamptz,
  deactivated_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX memberships_user_idx ON public.memberships (user_id);
CREATE INDEX memberships_invited_by_idx ON public.memberships (invited_by);
-- Exactly one active Owner per organisation (PRD 4.2).
CREATE UNIQUE INDEX memberships_one_owner ON public.memberships (org_id) WHERE role = 'owner' AND status = 'active';
CREATE INDEX organisations_created_by_idx ON public.organisations (created_by);
CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- ---------------------------------------------------------------- permission matrix (PRD 4.3)
-- Single source of truth for role capabilities. src/lib/permissions.ts mirrors it and a DB test checks they match.

CREATE TABLE app_private.role_capabilities (
  role       public.member_role NOT NULL,
  capability text NOT NULL,
  PRIMARY KEY (role, capability)
);

INSERT INTO app_private.role_capabilities (role, capability)
SELECT r::public.member_role, c
FROM (VALUES
  ('dashboard.view',      ARRAY['owner','admin','member','viewer']),
  ('counterparty.manage', ARRAY['owner','admin','member']),
  ('check.run',           ARRAY['owner','admin','member']),
  ('report.view',         ARRAY['owner','admin','member','viewer']),
  ('report.export',       ARRAY['owner','admin','member','viewer']),
  ('case.run',            ARRAY['owner','admin','member']),
  ('transaction.manage',  ARRAY['owner','admin','member']),
  ('payment.record',      ARRAY['owner','admin','member']),
  ('settlement.manage',   ARRAY['owner','admin','member']),
  ('billing.manage',      ARRAY['owner','admin']),
  ('team.manage',         ARRAY['owner','admin']),
  ('org.edit',            ARRAY['owner','admin']),
  ('settings.own',        ARRAY['owner','admin','member','viewer']),
  ('org.transfer_close',  ARRAY['owner']),
  ('audit.view',          ARRAY['owner','admin'])
) AS m (c, roles), unnest(m.roles) AS r;

-- ---------------------------------------------------------------- RLS helpers

CREATE FUNCTION app_private.user_org_ids() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT org_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'
$$;

CREATE FUNCTION app_private.user_role(p_org uuid) RETURNS public.member_role
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.memberships WHERE org_id = p_org AND user_id = auth.uid() AND status = 'active'
$$;

CREATE FUNCTION app_private.can(p_org uuid, p_capability text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN app_private.role_capabilities rc ON rc.role = m.role
    WHERE m.org_id = p_org AND m.user_id = auth.uid() AND m.status = 'active' AND rc.capability = p_capability
  )
$$;

REVOKE ALL ON FUNCTION app_private.user_org_ids(), app_private.user_role(uuid), app_private.can(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.user_org_ids(), app_private.user_role(uuid), app_private.can(uuid, text) TO authenticated, service_role;

-- Read-only view of the matrix for the server (drift test). Not callable by signed-in users.
CREATE FUNCTION public.role_capability_matrix() RETURNS TABLE (role public.member_role, capability text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role, capability FROM app_private.role_capabilities ORDER BY role, capability
$$;
REVOKE ALL ON FUNCTION public.role_capability_matrix() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.role_capability_matrix() TO service_role;

-- ---------------------------------------------------------------- audit log: append-only, hash-chained per organisation

CREATE TABLE public.audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id      uuid,            -- no foreign key: audit rows outlive the organisation (retention 10.4). NULL = platform event
  seq         bigint NOT NULL,                                               -- position in this organisation's chain
  actor_type  public.audit_actor NOT NULL,
  actor_id    text,
  action      text NOT NULL CHECK (action ~ '^[a-z][a-z0-9_.]*$'),
  entity      text,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  ip          inet,
  user_agent  text,
  request_id  text,
  at          timestamptz NOT NULL DEFAULT now(),
  prev_hash   text NOT NULL,
  row_hash    text NOT NULL
);
CREATE UNIQUE INDEX audit_log_chain ON public.audit_log ((coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid)), seq);
CREATE INDEX audit_log_entity_idx ON public.audit_log (org_id, entity, entity_id);

-- Canonical text of a row for hashing. Timestamps are rendered in UTC so the hash never depends on session settings.
CREATE FUNCTION app_private.audit_canonical(r public.audit_log) RETURNS text
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'org_id', r.org_id, 'seq', r.seq, 'actor_type', r.actor_type, 'actor_id', r.actor_id,
    'action', r.action, 'entity', r.entity, 'entity_id', r.entity_id,
    'before', r.before, 'after', r.after, 'ip', host(r.ip), 'user_agent', r.user_agent,
    'request_id', r.request_id,
    'at', to_char(r.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  )::text
$$;

CREATE FUNCTION app_private.audit_chain() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  last_row public.audit_log;
BEGIN
  -- Serialise writers per organisation; the lock is held until commit, so the next writer sees this row.
  PERFORM pg_advisory_xact_lock(hashtextextended('audit:' || coalesce(NEW.org_id::text, 'platform'), 0));
  SELECT * INTO last_row FROM public.audit_log
   WHERE org_id IS NOT DISTINCT FROM NEW.org_id
   ORDER BY seq DESC LIMIT 1;
  NEW.at        := now();
  NEW.seq       := coalesce(last_row.seq, 0) + 1;
  NEW.prev_hash := coalesce(last_row.row_hash, 'GENESIS');
  NEW.row_hash  := encode(extensions.digest(NEW.prev_hash || '|' || app_private.audit_canonical(NEW), 'sha256'), 'hex');
  RETURN NEW;
END $$;

CREATE FUNCTION app_private.audit_append_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = 'P0001';
END $$;

CREATE TRIGGER audit_log_chain BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_chain();
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION app_private.audit_append_only();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON public.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION app_private.audit_append_only();

-- Walks one organisation's chain and returns the first row whose hash or link does not match (NULL = intact).
CREATE FUNCTION public.verify_audit_chain(p_org uuid) RETURNS TABLE (broken_seq bigint, checked bigint)
  LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  r public.audit_log;
  expected_prev text := 'GENESIS';
  n bigint := 0;
BEGIN
  FOR r IN SELECT * FROM public.audit_log WHERE org_id IS NOT DISTINCT FROM p_org ORDER BY seq LOOP
    n := n + 1;
    IF r.seq <> n
       OR r.prev_hash <> expected_prev
       OR r.row_hash <> encode(extensions.digest(r.prev_hash || '|' || app_private.audit_canonical(r), 'sha256'), 'hex') THEN
      RETURN QUERY SELECT r.seq, n;
      RETURN;
    END IF;
    expected_prev := r.row_hash;
  END LOOP;
  RETURN QUERY SELECT NULL::bigint, n;
END $$;
REVOKE ALL ON FUNCTION public.verify_audit_chain(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(uuid) TO service_role;

-- ---------------------------------------------------------------- job queue (claimed with SKIP LOCKED)

CREATE TABLE public.jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9_.]*$'),
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_id       uuid REFERENCES public.organisations (id) ON DELETE CASCADE,
  dedupe_key   text UNIQUE,
  status       public.job_status NOT NULL DEFAULT 'queued',
  run_at       timestamptz NOT NULL DEFAULT now(),
  attempts     int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 50),
  locked_at    timestamptz,
  locked_by    text,
  last_error   text,
  finished_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_due_idx ON public.jobs (run_at) WHERE status = 'queued';
CREATE INDEX jobs_running_idx ON public.jobs (locked_at) WHERE status = 'running';
CREATE INDEX jobs_org_idx ON public.jobs (org_id);
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE FUNCTION public.enqueue_job(
  p_kind text, p_payload jsonb DEFAULT '{}'::jsonb, p_run_at timestamptz DEFAULT now(),
  p_dedupe_key text DEFAULT NULL, p_org uuid DEFAULT NULL, p_max_attempts int DEFAULT 5
) RETURNS uuid
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.jobs (kind, payload, run_at, dedupe_key, org_id, max_attempts)
  VALUES (p_kind, coalesce(p_payload, '{}'::jsonb), coalesce(p_run_at, now()), p_dedupe_key, p_org, p_max_attempts)
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.jobs WHERE dedupe_key = p_dedupe_key;
  END IF;
  RETURN v_id;
END $$;

-- Claims up to p_max due jobs for one worker. Safe to call from many workers at once.
CREATE FUNCTION public.claim_jobs(p_worker text, p_max int DEFAULT 10, p_kinds text[] DEFAULT NULL)
  RETURNS SETOF public.jobs
  LANGUAGE sql SET search_path = '' AS $$
  UPDATE public.jobs j
     SET status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   WHERE j.id IN (
     SELECT id FROM public.jobs
      WHERE status = 'queued' AND run_at <= now() AND (p_kinds IS NULL OR kind = ANY (p_kinds))
      ORDER BY run_at
      LIMIT greatest(1, least(p_max, 100))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING j.*
$$;

CREATE FUNCTION public.complete_job(p_id uuid) RETURNS void
  LANGUAGE sql SET search_path = '' AS $$
  UPDATE public.jobs SET status = 'done', finished_at = now(), locked_at = NULL, last_error = NULL
   WHERE id = p_id AND status = 'running'
$$;

-- Retries with exponential backoff (30 s, 1 min, 2 min … capped at 1 hour); gives up after max_attempts.
CREATE FUNCTION public.fail_job(p_id uuid, p_error text) RETURNS public.job_status
  LANGUAGE sql SET search_path = '' AS $$
  UPDATE public.jobs
     SET status      = CASE WHEN attempts >= max_attempts THEN 'dead'::public.job_status ELSE 'queued'::public.job_status END,
         run_at      = CASE WHEN attempts >= max_attempts THEN run_at
                            ELSE now() + least(interval '1 hour', interval '30 seconds' * power(2, attempts - 1)) END,
         finished_at = CASE WHEN attempts >= max_attempts THEN now() ELSE NULL END,
         locked_at   = NULL,
         last_error  = left(p_error, 2000)
   WHERE id = p_id AND status = 'running'
  RETURNING status
$$;

-- Puts jobs back in the queue when their worker died mid-run.
CREATE FUNCTION public.requeue_stale_jobs(p_older_than interval DEFAULT interval '10 minutes') RETURNS int
  LANGUAGE sql SET search_path = '' AS $$
  WITH r AS (
    UPDATE public.jobs SET status = 'queued', locked_at = NULL, locked_by = NULL
     WHERE status = 'running' AND locked_at < now() - p_older_than
    RETURNING 1
  ) SELECT count(*)::int FROM r
$$;

REVOKE ALL ON FUNCTION public.enqueue_job(text, jsonb, timestamptz, text, uuid, int),
                       public.claim_jobs(text, int, text[]),
                       public.complete_job(uuid),
                       public.fail_job(uuid, text),
                       public.requeue_stale_jobs(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_job(text, jsonb, timestamptz, text, uuid, int),
                          public.claim_jobs(text, int, text[]),
                          public.complete_job(uuid),
                          public.fail_job(uuid, text),
                          public.requeue_stale_jobs(interval) TO service_role;

-- ---------------------------------------------------------------- row-level security
-- Signed-in users only read; every write in Part 1 goes through the server (service role) and is audited.

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.role_capabilities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.organisations, public.user_profiles, public.memberships, public.audit_log, public.jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.organisations, public.user_profiles, public.memberships, public.audit_log FROM authenticated;
REVOKE ALL ON public.jobs FROM authenticated;
REVOKE ALL ON app_private.role_capabilities FROM PUBLIC, anon, authenticated;

CREATE POLICY org_read ON public.organisations FOR SELECT TO authenticated
  USING (id IN (SELECT app_private.user_org_ids()));

CREATE POLICY org_read ON public.memberships FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()));

-- A person sees their own profile and the profiles of people in their organisations.
CREATE POLICY self_or_teammate_read ON public.user_profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR id IN (SELECT m.user_id FROM public.memberships m WHERE m.org_id IN (SELECT app_private.user_org_ids()))
  );

CREATE POLICY audit_read ON public.audit_log FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'audit.view'));
