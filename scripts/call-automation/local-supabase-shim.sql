-- LOCAL DEVELOPMENT ONLY. Never run this against Supabase or any shared database.
--
-- Company Check's migrations (prisma/migrations/20261008120000_company_check and later) were written for
-- Supabase: they reference the `extensions` schema, the `anon` / `authenticated` / `service_role` roles and
-- `auth.uid()`. A plain Postgres has none of these, so this shim creates inert stand-ins and lets
-- `prisma migrate deploy` apply the real migration history to a throwaway local database.
-- See docs/call-automation/README.md ("Local database").

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END
$$;

-- Supabase resolves auth.uid() from the request JWT; locally it reads a session setting (unset => NULL).
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- app_users.id references auth.users(id) in Feature 1; locally there is no Supabase Auth, only this table.
CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY,
  email text
);

GRANT USAGE ON SCHEMA extensions, auth TO anon, authenticated, service_role;
