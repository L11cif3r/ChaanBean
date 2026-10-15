-- Part 2: sign-in, organisations and team (PRD S01, S02, S18; FR-AUTH-01–06, FR-ORG-01–06, FR-USR-01).

-- ---------------------------------------------------------------- existing tables

ALTER TABLE public.organisations
  ADD COLUMN seat_limit int NOT NULL DEFAULT 3 CHECK (seat_limit BETWEEN 1 AND 500),  -- placeholder until plans (Part 3)
  ADD COLUMN verification_method text CHECK (verification_method IN ('gstin', 'pan'));

ALTER TABLE public.user_profiles ADD COLUMN email_verified_at timestamptz;

ALTER TABLE app_private.stored_objects DROP CONSTRAINT stored_objects_bucket_check;
ALTER TABLE app_private.stored_objects ADD CONSTRAINT stored_objects_bucket_check
  CHECK (bucket IN ('evidence', 'raw-responses', 'uploads'));

CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'revoked');
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.access_request_status AS ENUM ('pending', 'approved', 'declined');

-- ---------------------------------------------------------------- invitations (S18)

CREATE TABLE public.invitations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  full_name         text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  role              public.member_role NOT NULL CHECK (role <> 'owner'),
  mobile_hash       text NOT NULL,   -- blind index of the 10-digit mobile
  mobile_ciphertext text NOT NULL,
  mobile_masked     text NOT NULL,
  email_ciphertext  text,
  email_masked      text,
  status            public.invitation_status NOT NULL DEFAULT 'pending',
  token_hash        text NOT NULL UNIQUE,
  expires_at        timestamptz NOT NULL,
  invited_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  accepted_by       uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  accepted_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_one_pending ON public.invitations (org_id, mobile_hash) WHERE status = 'pending';
CREATE INDEX invitations_invited_by_idx ON public.invitations (invited_by);
CREATE INDEX invitations_accepted_by_idx ON public.invitations (accepted_by);
CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- ---------------------------------------------------------------- access requests and manual reviews (S02)

CREATE TABLE public.access_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  requester_id   uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  requester_name text,
  status         public.access_request_status NOT NULL DEFAULT 'pending',
  decided_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  decided_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX access_requests_one_pending ON public.access_requests (org_id, requester_id) WHERE status = 'pending';
CREATE INDEX access_requests_requester_idx ON public.access_requests (requester_id);
CREATE INDEX access_requests_decided_by_idx ON public.access_requests (decided_by);
CREATE TRIGGER access_requests_updated_at BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

CREATE TABLE public.manual_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  submitted_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reason        text NOT NULL CHECK (reason IN ('gstin_cancelled', 'gstin_suspended', 'gstin_not_found', 'other')),
  document_ref  text,
  document_name text,
  status        public.review_status NOT NULL DEFAULT 'pending',
  notes         text,
  decided_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX manual_reviews_org_idx ON public.manual_reviews (org_id);
CREATE INDEX manual_reviews_submitted_by_idx ON public.manual_reviews (submitted_by);
CREATE INDEX manual_reviews_decided_by_idx ON public.manual_reviews (decided_by);
CREATE TRIGGER manual_reviews_updated_at BEFORE UPDATE ON public.manual_reviews
  FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- ---------------------------------------------------------------- server-only tables

-- OTP sends and failures per phone (blind index), for the S01 limits. OTP values are never stored (10.4).
CREATE TABLE app_private.otp_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone_hash text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('send', 'fail', 'success')),
  ip         inet,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_events_phone_idx ON app_private.otp_events (phone_hash, at DESC);

-- GST lookups kept on the server, so an organisation is created from fetched data, not from what the browser sends.
CREATE TABLE app_private.gst_lookups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gstin        text NOT NULL,
  status       text NOT NULL,
  result       jsonb,
  provider     text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE INDEX gst_lookups_requested_by_idx ON app_private.gst_lookups (requested_by);

-- Legal documents and who accepted which version, when, from where (FR-ORG-05, S02 markers 7 and 8).
CREATE TABLE app_private.legal_documents (
  kind         text NOT NULL CHECK (kind IN ('terms', 'privacy', 'authority')),
  version      text NOT NULL,
  title        text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, version)
);
INSERT INTO app_private.legal_documents (kind, version, title) VALUES
  ('terms', 'v0.1-draft', 'Terms of Use (draft, pending counsel)'),
  ('privacy', 'v0.1-draft', 'Privacy Notice (draft, pending counsel)'),
  ('authority', 'v1', 'I confirm I am authorised to act for this business');

CREATE TABLE app_private.legal_acceptances (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id      uuid REFERENCES public.organisations (id) ON DELETE SET NULL,
  kind        text NOT NULL,
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip          inet,
  user_agent  text,
  FOREIGN KEY (kind, version) REFERENCES app_private.legal_documents (kind, version)
);
CREATE INDEX legal_acceptances_user_idx ON app_private.legal_acceptances (user_id);
CREATE INDEX legal_acceptances_org_idx ON app_private.legal_acceptances (org_id);

CREATE TABLE app_private.email_verifications (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_user_idx ON app_private.email_verifications (user_id);

-- Development outbox: messages that Part 6 will send by SMS, email or WhatsApp.
CREATE TABLE app_private.outbox_messages (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id           uuid,
  channel          text NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  recipient_masked text NOT NULL,
  template         text NOT NULL,
  subject          text,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_private.otp_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.gst_lookups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.legal_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.legal_acceptances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.outbox_messages     ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.otp_events, app_private.gst_lookups, app_private.legal_documents, app_private.legal_acceptances,
  app_private.email_verifications, app_private.outbox_messages FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- row-level security for the new public tables

ALTER TABLE public.invitations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_reviews  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitations, public.access_requests, public.manual_reviews FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.invitations, public.access_requests, public.manual_reviews FROM authenticated;

CREATE POLICY team_read ON public.invitations FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'team.manage'));

CREATE POLICY team_or_requester_read ON public.access_requests FOR SELECT TO authenticated
  USING (requester_id = (SELECT auth.uid())
         OR (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'team.manage')));

CREATE POLICY admins_read ON public.manual_reviews FOR SELECT TO authenticated
  USING (org_id IN (SELECT app_private.user_org_ids()) AND app_private.can(org_id, 'org.edit'));

-- ---------------------------------------------------------------- atomic operations (called by the server only)

-- Creates the organisation, its Owner, the Owner's profile, the legal acceptances and the audit entry together.
CREATE FUNCTION app_private.create_organisation(
  p_user uuid, p_legal_name text, p_trade_name text, p_gstin text, p_pan_hash text, p_pan_ciphertext text,
  p_constitution text, p_state_code text, p_address jsonb, p_method text,
  p_verification public.org_verification, p_status public.org_status,
  p_full_name text, p_designation text, p_email text,
  p_terms_version text, p_privacy_version text, p_authority_version text,
  p_ip inet, p_user_agent text, p_request_id text
) RETURNS uuid
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_org uuid;
BEGIN
  IF p_gstin IS NOT NULL AND EXISTS (SELECT 1 FROM public.organisations WHERE gstin = p_gstin) THEN
    RAISE EXCEPTION 'GSTIN_ALREADY_REGISTERED' USING ERRCODE = 'P0001';
  END IF;
  IF p_gstin IS NULL AND p_pan_hash IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.organisations WHERE pan_hash = p_pan_hash AND gstin IS NULL) THEN
    RAISE EXCEPTION 'PAN_ALREADY_REGISTERED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.organisations (legal_name, trade_name, gstin, pan_hash, pan_ciphertext, constitution, state_code,
    address, verification_method, verification_status, status, created_by)
  VALUES (p_legal_name, p_trade_name, p_gstin, p_pan_hash, p_pan_ciphertext, p_constitution, p_state_code,
    p_address, p_method, p_verification, p_status, p_user)
  RETURNING id INTO v_org;

  INSERT INTO public.memberships (org_id, user_id, role, status, joined_at)
  VALUES (v_org, p_user, 'owner', 'active', now());

  INSERT INTO public.user_profiles (id, full_name, email, designation)
  VALUES (p_user, p_full_name, p_email, p_designation)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        email = EXCLUDED.email,
        email_verified_at = CASE WHEN public.user_profiles.email IS DISTINCT FROM EXCLUDED.email
                                 THEN NULL ELSE public.user_profiles.email_verified_at END;

  INSERT INTO app_private.legal_acceptances (user_id, org_id, kind, version, ip, user_agent) VALUES
    (p_user, v_org, 'terms', p_terms_version, p_ip, p_user_agent),
    (p_user, v_org, 'privacy', p_privacy_version, p_ip, p_user_agent),
    (p_user, v_org, 'authority', p_authority_version, p_ip, p_user_agent);

  INSERT INTO public.audit_log (org_id, actor_type, actor_id, action, entity, entity_id, after, ip, user_agent, request_id)
  VALUES (v_org, 'user', p_user::text, 'organisation.created', 'organisation', v_org::text,
          jsonb_build_object('method', p_method, 'verification', p_verification, 'status', p_status,
                             'terms', p_terms_version, 'privacy', p_privacy_version),
          p_ip, p_user_agent, p_request_id);
  RETURN v_org;
END $$;

-- Accepts an invitation for the signed-in user. The invited mobile must be the signed-in phone, the invitation must be
-- pending and unexpired, and a seat must be free.
CREATE FUNCTION app_private.accept_invitation(
  p_token_hash text, p_user uuid, p_phone_hash text, p_ip inet, p_user_agent text, p_request_id text
) RETURNS TABLE (org_id uuid, role public.member_role)
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  inv public.invitations;
  v_limit int;
  v_active int;
  v_existing public.memberships;
BEGIN
  SELECT * INTO inv FROM public.invitations i WHERE i.token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITE_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF inv.status <> 'pending' THEN RAISE EXCEPTION 'INVITE_NOT_PENDING' USING ERRCODE = 'P0001'; END IF;
  IF inv.expires_at <= now() THEN RAISE EXCEPTION 'INVITE_EXPIRED' USING ERRCODE = 'P0001'; END IF;
  IF inv.mobile_hash <> p_phone_hash THEN RAISE EXCEPTION 'INVITE_WRONG_MOBILE' USING ERRCODE = 'P0001'; END IF;

  SELECT o.seat_limit INTO v_limit FROM public.organisations o WHERE o.id = inv.org_id FOR UPDATE;
  SELECT * INTO v_existing FROM public.memberships m WHERE m.org_id = inv.org_id AND m.user_id = p_user;
  IF FOUND AND v_existing.status = 'active' THEN RAISE EXCEPTION 'ALREADY_MEMBER' USING ERRCODE = 'P0001'; END IF;
  SELECT count(*) INTO v_active FROM public.memberships m WHERE m.org_id = inv.org_id AND m.status = 'active';
  IF v_active >= v_limit THEN RAISE EXCEPTION 'NO_SEATS' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.memberships (org_id, user_id, role, status, invited_by, joined_at)
  VALUES (inv.org_id, p_user, inv.role, 'active', inv.invited_by, now())
  ON CONFLICT ON CONSTRAINT memberships_org_id_user_id_key DO UPDATE
    SET role = EXCLUDED.role, status = 'active', invited_by = EXCLUDED.invited_by, joined_at = now(), deactivated_at = NULL;

  INSERT INTO public.user_profiles (id, full_name) VALUES (p_user, inv.full_name) ON CONFLICT (id) DO NOTHING;

  UPDATE public.invitations SET status = 'accepted', accepted_by = p_user, accepted_at = now() WHERE id = inv.id;

  INSERT INTO public.audit_log (org_id, actor_type, actor_id, action, entity, entity_id, after, ip, user_agent, request_id)
  VALUES (inv.org_id, 'user', p_user::text, 'member.joined', 'membership', p_user::text,
          jsonb_build_object('role', inv.role, 'invitation', inv.id), p_ip, p_user_agent, p_request_id);

  RETURN QUERY SELECT inv.org_id, inv.role;
END $$;

-- Changes a member's role or status. The Owner is never changed here (ownership transfer is separate), nobody changes
-- their own membership, and reactivating needs a free seat.
CREATE FUNCTION app_private.set_member(
  p_org uuid, p_membership uuid, p_actor uuid, p_role public.member_role, p_status public.member_status,
  p_ip inet, p_user_agent text, p_request_id text
) RETURNS void
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_actor_role public.member_role;
  m public.memberships;
  v_limit int;
  v_active int;
BEGIN
  SELECT x.role INTO v_actor_role FROM public.memberships x
   WHERE x.org_id = p_org AND x.user_id = p_actor AND x.status = 'active';
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO m FROM public.memberships x WHERE x.id = p_membership AND x.org_id = p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF m.role = 'owner' THEN RAISE EXCEPTION 'OWNER_PROTECTED' USING ERRCODE = 'P0001'; END IF;
  IF m.user_id = p_actor THEN RAISE EXCEPTION 'SELF_CHANGE' USING ERRCODE = 'P0001'; END IF;
  IF p_role = 'owner' THEN RAISE EXCEPTION 'USE_OWNERSHIP_TRANSFER' USING ERRCODE = 'P0001'; END IF;
  IF p_status = 'invited' THEN RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = 'P0001'; END IF;

  IF p_status = 'active' AND m.status <> 'active' THEN
    SELECT o.seat_limit INTO v_limit FROM public.organisations o WHERE o.id = p_org FOR UPDATE;
    SELECT count(*) INTO v_active FROM public.memberships x WHERE x.org_id = p_org AND x.status = 'active';
    IF v_active >= v_limit THEN RAISE EXCEPTION 'NO_SEATS' USING ERRCODE = 'P0001'; END IF;
  END IF;

  UPDATE public.memberships x
     SET role = coalesce(p_role, x.role),
         status = coalesce(p_status, x.status),
         deactivated_at = CASE WHEN p_status = 'deactivated' THEN now()
                               WHEN p_status = 'active' THEN NULL ELSE x.deactivated_at END
   WHERE x.id = m.id;

  INSERT INTO public.audit_log (org_id, actor_type, actor_id, action, entity, entity_id, before, after, ip, user_agent, request_id)
  VALUES (p_org, 'user', p_actor::text, 'member.updated', 'membership', m.user_id::text,
          jsonb_build_object('role', m.role, 'status', m.status),
          jsonb_build_object('role', coalesce(p_role, m.role), 'status', coalesce(p_status, m.status)),
          p_ip, p_user_agent, p_request_id);
END $$;

REVOKE ALL ON FUNCTION app_private.create_organisation(uuid, text, text, text, text, text, text, text, jsonb, text,
  public.org_verification, public.org_status, text, text, text, text, text, text, inet, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.accept_invitation(text, uuid, text, inet, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.set_member(uuid, uuid, uuid, public.member_role, public.member_status, inet, text, text)
  FROM PUBLIC, anon, authenticated;
