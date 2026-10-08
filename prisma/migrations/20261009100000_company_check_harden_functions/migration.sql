-- Supabase security advisor fixes for Feature 1 functions.
-- Applied to project ixhhgevmplfjqkdmpepw via the Supabase connector (migration "company_check_harden_functions");
-- recorded here and marked applied in _prisma_migrations so the repo matches the database.
ALTER FUNCTION public.wallet_apply_ledger() SET search_path = public;
ALTER FUNCTION public.audit_events_append_only() SET search_path = public;

CREATE SCHEMA IF NOT EXISTS cc_private;
REVOKE ALL ON SCHEMA cc_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA cc_private TO authenticated;

CREATE OR REPLACE FUNCTION cc_private.user_org_ids() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid() AND status = 'ACTIVE'
$$;
REVOKE ALL ON FUNCTION cc_private.user_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cc_private.user_org_ids() TO authenticated;

DROP POLICY org_read ON public.organisations;
DROP POLICY org_read ON public.organisation_members;
DROP POLICY org_read ON public.subscriptions;
DROP POLICY org_read ON public.wallets;
DROP POLICY org_read ON public.wallet_ledger;
DROP POLICY org_read ON public.company_checks;
DROP POLICY org_read ON public.company_check_sections;
DROP POLICY org_read ON public.credit_assessments;
DROP POLICY org_read ON public.credit_decisions;
DROP POLICY org_read ON public.report_files;

CREATE POLICY org_read ON public.organisations          FOR SELECT TO authenticated USING (id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.organisation_members   FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.subscriptions          FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.wallets                FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.wallet_ledger          FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.company_checks         FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.company_check_sections FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.credit_assessments     FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.credit_decisions       FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));
CREATE POLICY org_read ON public.report_files           FOR SELECT TO authenticated USING (organisation_id IN (SELECT cc_private.user_org_ids()));

DROP FUNCTION public.cc_user_org_ids();
