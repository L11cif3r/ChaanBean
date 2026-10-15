-- Development "Send SMS" Auth hook: accepts the message and sends nothing. With it enabled, Supabase phone sign-in works
-- without an SMS provider; test phone numbers (fixed codes) never reach it. Part 6 replaces it with real delivery
-- (WhatsApp / DLT SMS). It never stores or logs the OTP.
CREATE FUNCTION public.dev_send_sms_hook(event jsonb) RETURNS jsonb
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT '{}'::jsonb
$$;

REVOKE ALL ON FUNCTION public.dev_send_sms_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dev_send_sms_hook(jsonb) TO supabase_auth_admin;
