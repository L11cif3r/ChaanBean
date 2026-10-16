-- Part 3: the expired-hold sweep skips organisations that no longer exist (ledger rows outlive them) and reverses each
-- hold in its own subtransaction, so one bad hold cannot stop the others from being released (FR-BIL-05).
CREATE OR REPLACE FUNCTION app_private.release_expired_holds(p_limit int DEFAULT 200) RETURNS int
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  h record;
  n int := 0;
BEGIN
  FOR h IN
    SELECT l.id, l.org_id FROM public.usage_ledger l
     WHERE l.type = 'hold' AND l.hold_expires_at <= now()
       AND NOT EXISTS (SELECT 1 FROM public.usage_ledger c WHERE c.hold_id = l.id)
       AND EXISTS (SELECT 1 FROM public.organisations o WHERE o.id = l.org_id)
     ORDER BY l.hold_expires_at LIMIT p_limit
  LOOP
    BEGIN
      PERFORM app_private.close_hold(h.org_id, h.id, false, 'Hold expired', 'system', 'hold-expiry');
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'release_expired_holds: hold % not released: %', h.id, SQLERRM;
    END;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION app_private.release_expired_holds(int) FROM PUBLIC, anon, authenticated;
